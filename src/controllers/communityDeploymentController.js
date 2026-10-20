/**
 * NSTPConnect - Community Deployment & Monitoring Controller
 * Handles deployment information and monitoring operations for Community Officials
 */

const supabase = require('../config/supabaseClient');

/**
 * GET /api/community/deployments
 * Gets all deployments belonging to the logged-in Community Official's requests
 */
async function getCommunityDeployments(req, res) {
  try {
    const { syncDeploymentStatusesBySchedule } = require('../services/deploymentService');
    await syncDeploymentStatusesBySchedule();

    const userId = req.session?.user?.user_id || req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Get all community requests created by this official
    const { data: requests, error: reqError } = await supabase
      .from('community_requests')
      .select('request_id, activity_title, activity_type, community_name, barangay, municipality, province, students_needed, urgency_level')
      .eq('user_id', userId);

    if (reqError) {
      throw new Error('Failed to fetch community requests: ' + reqError.message);
    }

    if (!requests || requests.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const requestIds = requests.map(r => r.request_id);

    // 2. Fetch deployments for these requests
    const { data: deployments, error: depError } = await supabase
      .from('deployments')
      .select('*')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false });

    if (depError) {
      throw new Error('Failed to fetch deployments: ' + depError.message);
    }

    if (!deployments || deployments.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const deploymentIds = deployments.map(d => d.deployment_id);

    // 3. Fetch assigned students count for each deployment
    const { data: studentAssignments, error: studError } = await supabase
      .from('deployment_students')
      .select('deployment_id, student_user_id, deployment_student_status')
      .in('deployment_id', deploymentIds);

    if (studError) {
      console.warn('Could not fetch student assignments:', studError.message);
    }

    // Map request details and student count to deployments
    const requestMap = new Map(requests.map(r => [r.request_id, r]));
    const studentCountMap = new Map();

    (studentAssignments || []).forEach(sa => {
      const current = studentCountMap.get(sa.deployment_id) || { total: 0, active: 0 };
      current.total++;
      if (sa.deployment_student_status === 'active' || sa.deployment_student_status === 'assigned') {
        current.active++;
      }
      studentCountMap.set(sa.deployment_id, current);
    });

    const enrichedDeployments = deployments.map(d => {
      const reqInfo = requestMap.get(d.request_id) || {};
      const counts = studentCountMap.get(d.deployment_id) || { total: 0, active: 0 };

      return {
        ...d,
        community_request: reqInfo,
        assigned_students_count: counts.total,
        active_students_count: counts.active,
        activity_title: reqInfo.activity_title || d.deployment_batch_name,
        community_name: reqInfo.community_name,
        barangay: reqInfo.barangay,
        municipality: reqInfo.municipality,
        province: reqInfo.province
      };
    });

    res.json({
      success: true,
      data: enrichedDeployments
    });
  } catch (error) {
    console.error('getCommunityDeployments Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/community/deployments/:deploymentId
 * Gets detailed deployment information including student roster and participation
 */
async function getCommunityDeploymentDetails(req, res) {
  try {
    const { deploymentId } = req.params;
    const userId = req.session?.user?.user_id || req.user?.user_id;

    if (!deploymentId) {
      return res.status(400).json({ success: false, message: 'Deployment ID is required' });
    }

    // 1. Fetch deployment
    const { data: deployment, error: depError } = await supabase
      .from('deployments')
      .select('*')
      .eq('deployment_id', deploymentId)
      .single();

    if (depError || !deployment) {
      return res.status(404).json({ success: false, message: 'Deployment not found' });
    }

    // 2. Fetch associated community request
    const { data: request } = await supabase
      .from('community_requests')
      .select('*')
      .eq('request_id', deployment.request_id)
      .single();

    if (request) {
      if (!deployment.barangay && request.barangay) deployment.barangay = request.barangay;
      if (!deployment.community_address && request.community_address) deployment.community_address = request.community_address;
      if (!deployment.municipality && request.municipality) deployment.municipality = request.municipality;
      if (!deployment.province && request.province) deployment.province = request.province;
      if (!deployment.activity_type && request.activity_type) deployment.activity_type = request.activity_type;
      if (!deployment.activity_title && request.activity_title) deployment.activity_title = request.activity_title;
    }

    // 3. Fetch assigned students
    const { data: assignments, error: assignError } = await supabase
      .from('deployment_students')
      .select('deployment_student_id, student_user_id, deployment_student_status, assigned_at, notes')
      .eq('deployment_id', deploymentId);

    if (assignError) {
      throw new Error('Failed to fetch assigned students: ' + assignError.message);
    }

    let students = [];
    if (assignments && assignments.length > 0) {
      const studentIds = assignments.map(a => a.student_user_id);

      // Fetch user & profile data
      const { data: profiles } = await supabase
        .from('student_profiles')
        .select('*')
        .in('user_id', studentIds);

      const { data: users } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const userMap = new Map((users || []).map(u => [u.user_id, u]));

      // Fetch rendered hours for each student
      const { data: hoursSummary } = await supabase
        .from('rendered_hours_summary')
        .select('*')
        .eq('deployment_id', deploymentId)
        .in('student_user_id', studentIds);

      const hoursMap = new Map((hoursSummary || []).map(h => [h.student_user_id, h]));

      // Fetch attendance session counts and today's/latest session
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('student_user_id, check_in_time, check_out_time, attendance_status, hours_rendered, attendance_date, student_remarks, verified_at, verified_by, created_at, updated_at')
        .eq('deployment_id', deploymentId)
        .order('attendance_date', { ascending: false })
        .order('updated_at', { ascending: false });

      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
      const todayDate = formatter.format(new Date());
      const targetDate = (req.query && req.query.date) ? req.query.date : todayDate;

      const attendanceStatsMap = new Map();
      const latestAttMap = new Map();

      (attendanceRecords || []).forEach(att => {
        const current = attendanceStatsMap.get(att.student_user_id) || { present: 0, totalHours: 0, verifiedHours: 0, verifiedCount: 0, unverifiedCount: 0 };
        if (att.attendance_status === 'present') current.present++;

        let h = Number(att.hours_rendered || 0);
        if (att.student_remarks) {
          const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
          if (match) {
            const val = parseFloat(match[1]);
            if (!isNaN(val)) h = val;
          }
        }
        current.totalHours += h;

        const isAttVerified = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
        if (isAttVerified) {
          current.verifiedHours += h;
          current.verifiedCount++;
        } else {
          current.unverifiedCount++;
        }
        attendanceStatsMap.set(att.student_user_id, current);

        // Store latest attendance record (prefer target/today record, or active ongoing session)
        const existing = latestAttMap.get(att.student_user_id);
        if (!existing) {
          latestAttMap.set(att.student_user_id, att);
        } else if (att.attendance_date === targetDate && existing.attendance_date !== targetDate) {
          latestAttMap.set(att.student_user_id, att);
        } else if (existing.attendance_date === att.attendance_date && existing.check_out_time && !att.check_out_time) {
          latestAttMap.set(att.student_user_id, att);
        }
      });

      students = assignments.map(a => {
        const prof = profileMap.get(a.student_user_id) || {};
        const usr = userMap.get(a.student_user_id) || {};
        const hrs = hoursMap.get(a.student_user_id) || {};
        const attStats = attendanceStatsMap.get(a.student_user_id) || { present: 0, totalHours: 0, verifiedHours: 0, verifiedCount: 0, unverifiedCount: 0 };
        const todayAtt = latestAttMap.get(a.student_user_id) || null;

        const fullName = prof.full_name 
          || (prof.first_name && prof.last_name ? `${prof.first_name} ${prof.last_name}` : null)
          || (usr.first_name && usr.last_name ? `${usr.first_name} ${usr.last_name}` : null)
          || usr.email 
          || 'Student Volunteer';

        const totalRendered = Number(hrs.total_hours_rendered || attStats.totalHours || 0);
        const isSessionLive = Boolean(
          todayAtt && 
          todayAtt.check_in_time && 
          todayAtt.check_in_time !== '---' && 
          (!todayAtt.check_out_time || todayAtt.check_out_time === '---' || String(todayAtt.check_out_time).toUpperCase() === 'N/A' || String(todayAtt.check_out_time).toUpperCase() === 'N\\A')
        );

        const isCredited = Boolean(
          !isSessionLive &&
          totalRendered > 0 &&
          (
            (todayAtt && (todayAtt.verified_at || todayAtt.verified_by || (todayAtt.student_remarks && /\[CREDITED:[0-9.]+\]/.test(todayAtt.student_remarks)))) ||
            (Number(hrs.total_hours_verified || 0) > 0 && Number(hrs.total_hours_verified || 0) >= totalRendered) ||
            (attStats.verifiedCount > 0 && attStats.unverifiedCount === 0)
          )
        );
        const creditStatus = isCredited ? 'credited' : 'pending';

        return {
          student_user_id: a.student_user_id,
          deployment_student_id: a.deployment_student_id,
          deployment_student_status: a.deployment_student_status,
          assigned_at: a.assigned_at,
          full_name: fullName,
          email: usr.email || prof.email,
          student_number: prof.student_number || '---',
          course: prof.course || prof.program || 'CWTS Volunteer',
          year_level: prof.year_level || '---',
          section: prof.section || '---',
          contact_number: prof.contact_number || usr.contact_number || '---',
          hours_rendered: totalRendered,
          total_hours_rendered: totalRendered,
          total_hours_verified: Number(hrs.total_hours_verified || attStats.verifiedHours || 0),
          is_credited: isCredited,
          credit_status: creditStatus,
          present_days: attStats.present,
          completion_percentage: Math.min(100, Math.round((totalRendered / 90.0) * 100)),
          today_attendance: todayAtt ? {
            attendance_date: todayAtt.attendance_date,
            check_in_time: todayAtt.check_in_time,
            check_out_time: todayAtt.check_out_time,
            attendance_status: todayAtt.attendance_status,
            hours_rendered: todayAtt.hours_rendered,
            verified_at: todayAtt.verified_at,
            verified_by: todayAtt.verified_by,
            student_remarks: todayAtt.student_remarks,
            created_at: todayAtt.created_at,
            updated_at: todayAtt.updated_at
          } : null
        };
      });
    }

    res.json({
      success: true,
      data: {
        deployment,
        community_request: request || {},
        students
      }
    });
  } catch (error) {
    console.error('getCommunityDeploymentDetails Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/community/deployments/students/all
 * Gets all assigned students across all deployments for the Community Official
 */
async function getCommunityAssignedStudents(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Get requests
    const { data: requests } = await supabase
      .from('community_requests')
      .select('request_id, activity_title')
      .eq('user_id', userId);

    if (!requests || requests.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const requestIds = requests.map(r => r.request_id);

    // 2. Get deployments
    const { data: deployments } = await supabase
      .from('deployments')
      .select('deployment_id, deployment_batch_name, request_id, deployment_status')
      .in('request_id', requestIds);

    if (!deployments || deployments.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const deploymentIds = deployments.map(d => d.deployment_id);

    // 3. Get students
    const { data: assignments } = await supabase
      .from('deployment_students')
      .select('deployment_id, student_user_id, deployment_student_status, assigned_at')
      .in('deployment_id', deploymentIds);

    if (!assignments || assignments.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const studentIds = assignments.map(a => a.student_user_id);

    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('*')
      .in('user_id', studentIds);

    const { data: users } = await supabase
      .from('users')
      .select('user_id, email')
      .in('user_id', studentIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const userMap = new Map((users || []).map(u => [u.user_id, u]));
    const depMap = new Map(deployments.map(d => [d.deployment_id, d]));

    const result = assignments.map(a => {
      const prof = profileMap.get(a.student_user_id) || {};
      const usr = userMap.get(a.student_user_id) || {};
      const dep = depMap.get(a.deployment_id) || {};

      const fullName = prof.full_name 
        || (prof.first_name && prof.last_name ? `${prof.first_name} ${prof.last_name}` : null)
        || (usr.first_name && usr.last_name ? `${usr.first_name} ${usr.last_name}` : null)
        || usr.email 
        || 'Student Volunteer';

      return {
        student_user_id: a.student_user_id,
        deployment_id: a.deployment_id,
        deployment_batch_name: dep.deployment_batch_name,
        deployment_status: dep.deployment_status,
        status: a.deployment_student_status,
        assigned_at: a.assigned_at,
        full_name: fullName,
        email: usr.email || prof.email,
        student_number: prof.student_number || '---',
        course: prof.course || prof.program || 'CWTS Volunteer',
        year_level: prof.year_level || '---',
        section: prof.section || '---',
        contact_number: prof.contact_number || usr.contact_number || '---'
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getCommunityAssignedStudents Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getCommunityDeployments,
  getCommunityDeploymentDetails,
  getCommunityAssignedStudents
};
