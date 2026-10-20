/**
 * NSTPConnect - Community Attendance & Service Hours Controller
 * Enables Community Officials to record, log, verify, and credit student attendance & service hours
 */

const supabase = require('../config/supabaseClient');

/**
 * POST /api/community/attendance/batch
 * Record daily attendance for multiple students
 */
async function recordBatchAttendance(req, res) {
  try {
    const { syncDeploymentStatusesBySchedule } = require('../services/deploymentService');
    await syncDeploymentStatusesBySchedule();

    const userId = req.session?.user?.user_id || req.user?.user_id;
    const { deployment_id, attendance_date, records } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!deployment_id || !attendance_date || !records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Deployment ID, attendance date, and at least one student record are required.' 
      });
    }

    // Enforce rule: Deployment must be active before community official can log attendance
    const { data: deployment, error: depError } = await supabase
      .from('deployments')
      .select('deployment_id, deployment_status, deployment_start_date, deployment_end_date')
      .eq('deployment_id', deployment_id)
      .single();

    if (depError || !deployment) {
      return res.status(404).json({ success: false, message: 'Deployment not found.' });
    }

    const depStatus = (deployment.deployment_status || '').toLowerCase();
    if (depStatus !== 'active' && depStatus !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: `Attendance can only be logged for active deployments. This deployment is currently "${deployment.deployment_status}".`
      });
    }

    const savedRecords = [];
    const errors = [];

    for (const record of records) {
      try {
        const studentUserId = record.student_user_id;
        const inTime = record.check_in_time || null;
        const outTime = record.check_out_time || null;

        // Auto-calculate hours from Time In and Time Out if not explicitly passed
        let hours = 0;
        if (record.hours_rendered !== undefined && record.hours_rendered !== null) {
          hours = Number(record.hours_rendered) || 0;
        } else if (inTime && outTime) {
          const parseMins = (t) => {
            const p = String(t).split(':').map(Number);
            return (p[0] || 0) * 60 + (p[1] || 0);
          };
          const diff = parseMins(outTime) - parseMins(inTime);
          hours = diff > 0 ? Math.round((diff / 60) * 10) / 10 : 0;
        }

        const status = record.status || (inTime ? 'present' : (hours > 0 ? 'present' : 'absent'));
        const remarks = record.remarks || (outTime ? '' : 'Ongoing duty (Time Out: N/A)');

        // Upsert attendance record
        const { data: attendanceData, error: attError } = await supabase
          .from('attendance_records')
          .upsert({
            deployment_id,
            student_user_id: studentUserId,
            attendance_date,
            attendance_status: status,
            check_in_time: inTime,
            check_out_time: outTime,
            hours_rendered: hours,
            student_remarks: remarks,
            verified_by: null,
            verified_at: null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'deployment_id,student_user_id,attendance_date'
          })
          .select()
          .single();

        if (attError) {
          if (attError.message && attError.message.includes('extract(unknown, integer)')) {
            errors.push('Database function needs update. Please run FIX_ATTENDANCE_HOURS_FUNCTION.sql in Supabase SQL Editor.');
          } else {
            errors.push(`Student ${studentUserId}: ${attError.message}`);
          }
          continue;
        }

        savedRecords.push(attendanceData);

        // Update student rendered_hours_summary
        await updateStudentHoursSummary(deployment_id, studentUserId);

      } catch (err) {
        errors.push(`Error processing record: ${err.message}`);
      }
    }

    if (savedRecords.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    res.json({
      success: true,
      message: `Successfully recorded attendance for ${savedRecords.length} student(s).`,
      savedCount: savedRecords.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('recordBatchAttendance Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/community/attendance/history
 * Fetch attendance logs with student information
 */
async function getCommunityAttendanceHistory(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    const { deployment_id, attendance_date, status } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Get deployment IDs belonging to this community official
    let deploymentIds = [];
    if (deployment_id) {
      deploymentIds = [deployment_id];
    } else {
      const { data: requests } = await supabase
        .from('community_requests')
        .select('request_id')
        .eq('user_id', userId);

      if (!requests || requests.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const requestIds = requests.map(r => r.request_id);

      const { data: deployments } = await supabase
        .from('deployments')
        .select('deployment_id')
        .in('request_id', requestIds);

      if (!deployments || deployments.length === 0) {
        return res.json({ success: true, data: [] });
      }

      deploymentIds = deployments.map(d => d.deployment_id);
    }

    // 2. Query attendance records
    let query = supabase
      .from('attendance_records')
      .select('*')
      .in('deployment_id', deploymentIds)
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (attendance_date) {
      query = query.eq('attendance_date', attendance_date);
    }
    if (status && status !== 'all') {
      query = query.eq('attendance_status', status);
    }

    const { data: records, error } = await query;

    if (error) {
      throw new Error('Failed to fetch attendance records: ' + error.message);
    }

    if (!records || records.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 3. Attach student names & details
    const studentIds = [...new Set(records.map(r => r.student_user_id))];

    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('user_id, full_name, student_number, course, section')
      .in('user_id', studentIds);

    const { data: users } = await supabase
      .from('users')
      .select('user_id, email')
      .in('user_id', studentIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const userMap = new Map((users || []).map(u => [u.user_id, u]));

    const enrichedRecords = records.map(r => {
      const prof = profileMap.get(r.student_user_id) || {};
      const usr = userMap.get(r.student_user_id) || {};

      const fullName = prof.full_name
        || (prof.first_name && prof.last_name ? `${prof.first_name} ${prof.last_name}` : null)
        || (usr.first_name && usr.last_name ? `${usr.first_name} ${usr.last_name}` : null)
        || usr.email
        || 'Student Volunteer';

      let effectiveHours = Number(r.hours_rendered || 0);
      if (r.student_remarks) {
        const match = String(r.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
        if (match) {
          const val = parseFloat(match[1]);
          if (!isNaN(val)) effectiveHours = val;
        }
      }

      return {
        ...r,
        hours_rendered: effectiveHours,
        student_name: fullName,
        student_number: prof.student_number || '---',
        course: prof.course || '---',
        section: prof.section || '---',
        email: usr.email
      };
    });

    res.json({
      success: true,
      data: enrichedRecords
    });

  } catch (error) {
    console.error('getCommunityAttendanceHistory Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/community/hours/sessions
 * Fetch attendance sessions for service hours verification and crediting
 */
async function getSessionsForVerification(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    const { deployment_id } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!deployment_id) {
      return res.status(400).json({ success: false, message: 'Deployment ID is required' });
    }

    // 1. Fetch attendance records for this deployment
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('deployment_id', deployment_id)
      .order('attendance_date', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch sessions: ' + error.message);
    }

    if (!records || records.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const studentIds = [...new Set(records.map(r => r.student_user_id))];

    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('user_id, full_name, student_number, course, section')
      .in('user_id', studentIds);

    const { data: users } = await supabase
      .from('users')
      .select('user_id, email')
      .in('user_id', studentIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const userMap = new Map((users || []).map(u => [u.user_id, u]));

    const enriched = records.map(r => {
      const prof = profileMap.get(r.student_user_id) || {};
      const usr = userMap.get(r.student_user_id) || {};

      const fullName = prof.full_name
        || (prof.first_name && prof.last_name ? `${prof.first_name} ${prof.last_name}` : null)
        || (usr.first_name && usr.last_name ? `${usr.first_name} ${usr.last_name}` : null)
        || usr.email
        || 'Student Volunteer';

      // Check if custom credited hours were saved in student_remarks
      let hours = Number(r.hours_rendered || 0);
      if (r.student_remarks) {
        const match = String(r.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
        if (match) {
          const val = parseFloat(match[1]);
          if (!isNaN(val)) hours = val;
        }
      }

      if (hours === 0 && r.check_in_time && r.check_out_time && r.attendance_status === 'present') {
        const [inH, inM] = r.check_in_time.split(':').map(Number);
        const [outH, outM] = r.check_out_time.split(':').map(Number);
        const diff = (outH + outM / 60) - (inH + inM / 60);
        if (diff > 0) hours = Math.round(diff * 10) / 10;
      }

      return {
        attendance_id: r.attendance_id,
        deployment_id: r.deployment_id,
        student_user_id: r.student_user_id,
        student_name: fullName,
        student_number: prof.student_number || '---',
        course: prof.course || '---',
        section: prof.section || '---',
        attendance_date: r.attendance_date,
        check_in_time: r.check_in_time || '---',
        check_out_time: r.check_out_time || '---',
        attendance_status: r.attendance_status,
        hours_rendered: hours,
        verified_by: r.verified_by,
        verified_at: r.verified_at,
        is_verified: !!r.verified_at,
        remarks: r.student_remarks || r.nstp_remarks || ''
      };
    });

    res.json({
      success: true,
      data: enriched
    });

  } catch (error) {
    console.error('getSessionsForVerification Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * POST /api/community/hours/verify-credit
 * Verify and credit rendered hours for student session(s).
 * Modifies rendered hours while preserving time-in and time-out.
 */
async function verifyAndCreditHours(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    const { records } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No session records provided for verification.' });
    }

    const updated = [];
    const affectedStudents = new Set();
    const deploymentIds = new Set();

    const attIds = records.map(r => r.attendance_id).filter(Boolean);
    const { data: existingRecords } = await supabase
      .from('attendance_records')
      .select('attendance_id, check_in_time, check_out_time')
      .in('attendance_id', attIds);

    const recMap = new Map((existingRecords || []).map(r => [r.attendance_id, r]));

    for (const record of records) {
      const { attendance_id, hours_rendered, remarks } = record;
      if (!attendance_id) continue;

      const existing = recMap.get(attendance_id);
      let maxHours = 24.0;
      if (existing && existing.check_in_time && existing.check_out_time) {
        const inParts = existing.check_in_time.split(':').map(Number);
        const outParts = existing.check_out_time.split(':').map(Number);
        if (inParts.length >= 2 && outParts.length >= 2 && !isNaN(inParts[0]) && !isNaN(outParts[0])) {
          const diffMin = (outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1]);
          if (diffMin > 0) maxHours = Math.round((diffMin / 60) * 10) / 10;
        }
      }

      const hours = Math.min(maxHours, Math.max(0, Number(hours_rendered || 0)));
      const creditedTag = `[CREDITED:${hours.toFixed(1)}]`;
      const cleanRemarks = remarks ? String(remarks).replace(/\[CREDITED:[0-9.]+\]\s*/g, '').trim() : 'Verified & credited by Community Official';
      const finalRemarks = `${creditedTag} ${cleanRemarks}`.trim();

      const { data: updatedRecord, error } = await supabase
        .from('attendance_records')
        .update({
          hours_rendered: hours,
          student_remarks: finalRemarks,
          verified_by: userId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('attendance_id', attendance_id)
        .select()
        .single();

      if (error) {
        console.error('verifyAndCreditHours record update error:', error);
      } else if (updatedRecord) {
        updated.push(updatedRecord);
        affectedStudents.add(updatedRecord.student_user_id);
        deploymentIds.add(updatedRecord.deployment_id);
      }
    }

    if (updated.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not credit service hours. Please ensure valid session records are selected.'
      });
    }

    // Recalculate summary for all affected students
    for (const depId of deploymentIds) {
      for (const studentId of affectedStudents) {
        await updateStudentHoursSummary(depId, studentId);
      }
    }

    // Notify affected students that their attendance hours have been verified
    try {
      const notificationService = require('../services/notificationService');
      const firstDepId = Array.from(deploymentIds)[0] || null;
      for (const studentId of affectedStudents) {
        await notificationService.createNotification({
          user_id: studentId,
          title: 'Attendance Hours Verified',
          message: 'Your community service attendance hours have been officially verified and credited by the Community Official.',
          notification_type: 'attendance_verified',
          related_deployment_id: firstDepId,
          action_url: 'my-hours.html',
          action_label: 'View Rendered Hours'
        });
      }
    } catch (notifErr) {
      console.warn('Attendance verification notification warning:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Successfully verified and credited service hours for ${updated.length} session(s).`,
      creditedCount: updated.length
    });

  } catch (error) {
    console.error('verifyAndCreditHours Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Helper: Recalculates and updates rendered_hours_summary for a student
 */
async function updateStudentHoursSummary(deploymentId, studentUserId) {
  try {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('hours_rendered, attendance_status, verified_at, student_remarks')
      .eq('deployment_id', deploymentId)
      .eq('student_user_id', studentUserId);

    if (!records) return;

    let totalRendered = 0;
    let totalVerified = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    records.forEach(r => {
      let h = Number(r.hours_rendered || 0);
      if (r.student_remarks) {
        const match = String(r.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
        if (match) {
          const val = parseFloat(match[1]);
          if (!isNaN(val)) h = val;
        }
      }
      totalRendered += h;
      if (r.verified_at) {
        totalVerified += h;
      }
      if (r.attendance_status === 'present') presentCount++;
      else if (r.attendance_status === 'absent') absentCount++;
      else if (r.attendance_status === 'late') lateCount++;
      else if (r.attendance_status === 'excused') excusedCount++;
    });

    const completionPct = Math.min(100, Math.round((totalVerified / 90.0) * 100));
    const completionStatus = totalVerified >= 90.0 ? 'completed' : 'in_progress';

    await supabase
      .from('rendered_hours_summary')
      .upsert({
        deployment_id: deploymentId,
        student_user_id: studentUserId,
        total_hours_required: 90.0,
        total_hours_rendered: totalRendered,
        total_hours_verified: totalVerified,
        total_hours_pending: Math.max(0, totalRendered - totalVerified),
        total_sessions: records.length,
        present_count: presentCount,
        absent_count: absentCount,
        late_count: lateCount,
        excused_count: excusedCount,
        completion_percentage: completionPct,
        completion_status: completionStatus,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'deployment_id,student_user_id'
      });

  } catch (err) {
    console.warn('updateStudentHoursSummary Helper Error:', err.message);
  }
}

module.exports = {
  recordBatchAttendance,
  getCommunityAttendanceHistory,
  getSessionsForVerification,
  verifyAndCreditHours
};
