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

    const savedRecords = [];
    const errors = [];

    for (const record of records) {
      try {
        const studentUserId = record.student_user_id;
        const status = record.status || record.attendance_status || 'present';
        const inTime = record.check_in_time || (status === 'present' ? '08:00:00' : null);
        const outTime = record.check_out_time || (status === 'present' ? '12:00:00' : null);
        
        let hours = 0;
        if (status === 'present') {
          hours = record.hours_rendered !== undefined ? Number(record.hours_rendered) : 4.0;
        }
        const remarks = record.remarks || '';

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
            verified_by: userId,
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'deployment_id,student_user_id,attendance_date'
          })
          .select()
          .single();

        if (attError) {
          errors.push(`Student ${studentUserId}: ${attError.message}`);
          continue;
        }

        savedRecords.push(attendanceData);

        // Update student rendered_hours_summary
        await updateStudentHoursSummary(deployment_id, studentUserId);

      } catch (err) {
        errors.push(`Error processing record: ${err.message}`);
      }
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
      .select('user_id, first_name, last_name, student_number, course, section')
      .in('user_id', studentIds);

    const { data: users } = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name')
      .in('user_id', studentIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const userMap = new Map((users || []).map(u => [u.user_id, u]));

    const enrichedRecords = records.map(r => {
      const prof = profileMap.get(r.student_user_id) || {};
      const usr = userMap.get(r.student_user_id) || {};

      const fullName = prof.first_name && prof.last_name
        ? `${prof.first_name} ${prof.last_name}`
        : usr.first_name && usr.last_name
          ? `${usr.first_name} ${usr.last_name}`
          : usr.email || 'Student Volunteer';

      return {
        ...r,
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
      .select('user_id, first_name, last_name, student_number, course, section')
      .in('user_id', studentIds);

    const { data: users } = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name')
      .in('user_id', studentIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const userMap = new Map((users || []).map(u => [u.user_id, u]));

    const enriched = records.map(r => {
      const prof = profileMap.get(r.student_user_id) || {};
      const usr = userMap.get(r.student_user_id) || {};

      const fullName = prof.first_name && prof.last_name
        ? `${prof.first_name} ${prof.last_name}`
        : usr.first_name && usr.last_name
          ? `${usr.first_name} ${usr.last_name}`
          : usr.email || 'Student Volunteer';

      // Default calculate hours if not present
      let hours = Number(r.hours_rendered || 0);
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

    for (const record of records) {
      const { attendance_id, hours_rendered, remarks } = record;
      if (!attendance_id) continue;

      const hours = Math.max(0, Number(hours_rendered || 0));

      const { data: updatedRecord, error } = await supabase
        .from('attendance_records')
        .update({
          hours_rendered: hours,
          student_remarks: remarks || undefined,
          verified_by: userId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('attendance_id', attendance_id)
        .select()
        .single();

      if (!error && updatedRecord) {
        updated.push(updatedRecord);
        affectedStudents.add(updatedRecord.student_user_id);
        deploymentIds.add(updatedRecord.deployment_id);
      }
    }

    // Recalculate summary for all affected students
    for (const depId of deploymentIds) {
      for (const studentId of affectedStudents) {
        await updateStudentHoursSummary(depId, studentId);
      }
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
      .select('hours_rendered, attendance_status')
      .eq('deployment_id', deploymentId)
      .eq('student_user_id', studentUserId);

    if (!records) return;

    let totalRendered = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    records.forEach(r => {
      totalRendered += Number(r.hours_rendered || 0);
      if (r.attendance_status === 'present') presentCount++;
      else if (r.attendance_status === 'absent') absentCount++;
      else if (r.attendance_status === 'late') lateCount++;
      else if (r.attendance_status === 'excused') excusedCount++;
    });

    const completionPct = Math.min(100, Math.round((totalRendered / 90.0) * 100));
    const completionStatus = totalRendered >= 90.0 ? 'completed' : 'in_progress';

    await supabase
      .from('rendered_hours_summary')
      .upsert({
        deployment_id: deploymentId,
        student_user_id: studentUserId,
        total_hours_required: 90.0,
        total_hours_rendered: totalRendered,
        total_hours_verified: totalRendered,
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
