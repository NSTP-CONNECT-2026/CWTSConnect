/**
 * NSTPConnect - Rendered Hours Service
 * Handles rendered service hours tracking business logic
 */

const supabase = require('../config/supabaseClient');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

function getDefaultHoursSummary(deploymentId, studentId) {
  return {
    deployment_id: isValidUUID(deploymentId) ? deploymentId : null,
    student_user_id: isValidUUID(studentId) ? studentId : null,
    total_hours_required: 0,
    total_hours_rendered: 0,
    total_hours_verified: 0,
    total_hours_pending: 0,
    total_sessions: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    excused_count: 0,
    make_up_count: 0,
    completion_percentage: 0,
    completion_status: 'in_progress'
  };
}

/**
 * Gets rendered hours summary for a deployment
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<Array>} Array of hours summaries
 */
async function getRenderedHoursSummary(deploymentId) {
  try {
    if (!isValidUUID(deploymentId)) {
      return [];
    }

    const { data: summaries, error } = await supabase
      .from('rendered_hours_summary')
      .select(`
        *,
        student:users!rendered_hours_summary_student_user_id_fkey(
          user_id,
          email,
          student_profiles(*)
        )
      `)
      .eq('deployment_id', deploymentId)
      .order('completion_percentage', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch hours summary: ' + error.message);
    }

    // Transform data
    const transformed = (summaries || []).map(summary => {
      const student = summary.student;
      const profile = student?.student_profiles?.[0];

      return {
        summary_id: summary.summary_id,
        deployment_id: summary.deployment_id,
        student_user_id: summary.student_user_id,
        student_name: profile?.full_name || 'Unknown',
        student_number: profile?.student_number || 'N/A',
        course: profile?.course || 'N/A',
        total_hours_required: summary.total_hours_required,
        total_hours_rendered: summary.total_hours_rendered,
        total_hours_verified: summary.total_hours_verified,
        total_hours_pending: summary.total_hours_pending,
        total_sessions: summary.total_sessions,
        present_count: summary.present_count,
        absent_count: summary.absent_count,
        late_count: summary.late_count,
        excused_count: summary.excused_count,
        make_up_count: summary.make_up_count,
        completion_percentage: summary.completion_percentage,
        completion_status: summary.completion_status,
        created_at: summary.created_at,
        updated_at: summary.updated_at
      };
    });

    return transformed;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets student's rendered hours summary (optionally filtered by deployment)
 * @param {string} [deploymentId] - Deployment ID (optional)
 * @param {string} studentId - Student user ID
 * @returns {Promise<object>} Hours summary
 */
async function getStudentHoursSummary(deploymentId, studentId) {
  try {
    if (!isValidUUID(studentId)) {
      return {
        ...getDefaultHoursSummary(deploymentId, studentId),
        sessions: []
      };
    }

    // 1. Fetch attendance records and their deployment/activity info
    let attQuery = supabase
      .from('attendance_records')
      .select(`
        attendance_id,
        deployment_id,
        attendance_date,
        check_in_time,
        check_out_time,
        hours_rendered,
        student_remarks,
        attendance_status,
        verified_at,
        verified_by,
        deployment:deployments(
          deployment_batch_name,
          community_requests(activity_title)
        )
      `)
      .eq('student_user_id', studentId)
      .order('attendance_date', { ascending: false });

    if (isValidUUID(deploymentId)) {
      attQuery = attQuery.eq('deployment_id', deploymentId);
    }

    const { data: attRecords, error: attError } = await attQuery;

    let totalCreditedHours = 0;
    let totalPendingHours = 0;
    const sessions = (attRecords || []).map(att => {
      const match = String(att.student_remarks || '').match(/\[CREDITED:([0-9.]+)\]/);
      const isVerified = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
      const credited = match ? parseFloat(match[1]) : (Number(att.hours_rendered) || 0);

      if (isVerified) {
        totalCreditedHours += credited;
      } else {
        totalPendingHours += credited;
      }

      const cleanRemarks = att.student_remarks ? String(att.student_remarks).replace(/\[CREDITED:[0-9.]+\]\s*/g, '').trim() : '';

      return {
        attendance_id: att.attendance_id,
        date: att.attendance_date,
        activity_name: att.deployment?.community_requests?.activity_title || att.deployment?.deployment_batch_name || 'Community Service Session',
        hours: credited,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        status: att.attendance_status,
        is_verified: isVerified,
        remarks: cleanRemarks || (isVerified ? 'Verified & credited by Community Official' : 'Pending Verification')
      };
    });

    totalCreditedHours = Math.round(totalCreditedHours * 10) / 10;
    totalPendingHours = Math.round(totalPendingHours * 10) / 10;

    // 2. Fetch summary from rendered_hours_summary table if exists
    let summaryQuery = supabase
      .from('rendered_hours_summary')
      .select('*')
      .eq('student_user_id', studentId);

    if (isValidUUID(deploymentId)) {
      summaryQuery = summaryQuery.eq('deployment_id', deploymentId);
    }

    const { data: summaries } = await summaryQuery;
    const baseSummary = (summaries && summaries.length > 0) ? summaries[0] : getDefaultHoursSummary(deploymentId, studentId);

    // If attendance_records had sessions, use the accurate computed totals
    const finalHours = (sessions.length > 0) ? totalCreditedHours : Number(baseSummary.total_hours_rendered || baseSummary.total_hours_verified || 0);
    const finalPending = (sessions.length > 0) ? totalPendingHours : Number(baseSummary.total_hours_pending || 0);
    const finalSessionsCount = (sessions.length > 0) ? sessions.length : Number(baseSummary.total_sessions || 0);

    return {
      deployment_id: isValidUUID(deploymentId) ? deploymentId : baseSummary.deployment_id,
      student_user_id: studentId,
      total_hours_rendered: finalHours,
      total_hours_verified: finalHours,
      total_completed_hours: finalHours,
      total_hours: finalHours,
      total_hours_pending: finalPending,
      total_sessions: finalSessionsCount,
      present_count: baseSummary.present_count || sessions.filter(s => s.status === 'present').length,
      absent_count: baseSummary.absent_count || 0,
      late_count: baseSummary.late_count || 0,
      completion_status: baseSummary.completion_status || 'in_progress',
      sessions: sessions
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets student's hours summary by student ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<object>} Hours summary
 */
async function getStudentHoursSummaryById(studentId) {
  return getStudentHoursSummary(null, studentId);
}

/**
 * Manually updates student's hours summary
 * @param {string} deploymentId - Deployment ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<void>}
 */
async function refreshStudentHoursSummary(deploymentId, studentId) {
  try {
    const { error } = await supabase
      .rpc('update_rendered_hours_summary_for_student', {
        target_deployment_id: deploymentId,
        target_student_id: studentId
      });

    if (error) {
      throw new Error('Failed to refresh hours summary: ' + error.message);
    }
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets deployment hours statistics
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<object>} Hours statistics
 */
async function getDeploymentHoursStatistics(deploymentId) {
  try {
    if (!isValidUUID(deploymentId)) {
      return {
        total_students: 0,
        total_hours_required: 0,
        total_hours_rendered: 0,
        total_hours_verified: 0,
        total_hours_pending: 0,
        students_completed: 0,
        students_in_progress: 0,
        students_pending_verification: 0,
        average_completion_percentage: 0,
        completion_rate: 0
      };
    }

    const { data: stats, error } = await supabase
      .from('rendered_hours_summary')
      .select('*')
      .eq('deployment_id', deploymentId);

    if (error) {
      throw new Error('Failed to fetch hours statistics: ' + error.message);
    }

    const summaries = stats || [];

    // Calculate aggregate statistics
    const totalStudents = summaries.length;
    const totalHoursRequired = summaries.reduce((sum, s) => sum + parseFloat(s.total_hours_required || 0), 0);
    const totalHoursRendered = summaries.reduce((sum, s) => sum + parseFloat(s.total_hours_rendered || 0), 0);
    const totalHoursVerified = summaries.reduce((sum, s) => sum + parseFloat(s.total_hours_verified || 0), 0);
    const totalHoursPending = summaries.reduce((sum, s) => sum + parseFloat(s.total_hours_pending || 0), 0);
    
    const studentsCompleted = summaries.filter(s => s.completion_status === 'completed').length;
    const studentsInProgress = summaries.filter(s => s.completion_status === 'in_progress').length;
    const studentsPendingVerification = summaries.filter(s => s.completion_status === 'pending_verification').length;
    
    const averageCompletion = totalStudents > 0 
      ? summaries.reduce((sum, s) => sum + parseFloat(s.completion_percentage || 0), 0) / totalStudents 
      : 0;

    return {
      total_students: totalStudents,
      total_hours_required: totalHoursRequired,
      total_hours_rendered: totalHoursRendered,
      total_hours_verified: totalHoursVerified,
      total_hours_pending: totalHoursPending,
      students_completed: studentsCompleted,
      students_in_progress: studentsInProgress,
      students_pending_verification: studentsPendingVerification,
      average_completion_percentage: Math.round(averageCompletion * 100) / 100,
      completion_rate: totalStudents > 0 ? Math.round((studentsCompleted / totalStudents) * 100) : 0
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets students who need hours verification
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<Array>} Array of students with pending verification
 */
async function getStudentsNeedingVerification(deploymentId) {
  try {
    const { data: summaries, error } = await supabase
      .from('rendered_hours_summary')
      .select(`
        *,
        student:users!rendered_hours_summary_student_user_id_fkey(
          user_id,
          email,
          student_profiles(*)
        )
      `)
      .eq('deployment_id', deploymentId)
      .eq('completion_status', 'pending_verification')
      .order('updated_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch students needing verification: ' + error.message);
    }

    // Transform data
    const transformed = (summaries || []).map(summary => {
      const student = summary.student;
      const profile = student?.student_profiles?.[0];

      return {
        student_user_id: summary.student_user_id,
        student_name: profile?.full_name || 'Unknown',
        student_number: profile?.student_number || 'N/A',
        course: profile?.course || 'N/A',
        total_hours_pending: summary.total_hours_pending,
        total_hours_rendered: summary.total_hours_rendered,
        completion_percentage: summary.completion_percentage,
        updated_at: summary.updated_at
      };
    });

    return transformed;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Exports hours summary to CSV format
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<string>} CSV string
 */
async function exportHoursSummaryCSV(deploymentId) {
  try {
    const summaries = await getRenderedHoursSummary(deploymentId);

    // CSV headers
    const headers = [
      'Student Number',
      'Student Name',
      'Course',
      'Hours Required',
      'Hours Rendered',
      'Hours Verified',
      'Hours Pending',
      'Total Sessions',
      'Present',
      'Absent',
      'Late',
      'Excused',
      'Make-up',
      'Completion %',
      'Status'
    ];

    // CSV rows
    const rows = summaries.map(s => [
      s.student_number,
      s.student_name,
      s.course,
      s.total_hours_required,
      s.total_hours_rendered,
      s.total_hours_verified,
      s.total_hours_pending,
      s.total_sessions,
      s.present_count,
      s.absent_count,
      s.late_count,
      s.excused_count,
      s.make_up_count,
      s.completion_percentage,
      s.completion_status
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  getRenderedHoursSummary,
  getStudentHoursSummary,
  getStudentHoursSummaryById,
  refreshStudentHoursSummary,
  getDeploymentHoursStatistics,
  getStudentsNeedingVerification,
  exportHoursSummaryCSV
};