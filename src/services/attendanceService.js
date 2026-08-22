/**
 * NSTPConnect - Attendance Service
 * Handles attendance tracking business logic
 */

const supabase = require('../config/supabaseClient');

/**
 * Gets attendance dashboard summary for a deployment
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<object>} Dashboard summary data
 */
async function getAttendanceDashboardSummary(deploymentId) {
  try {
    const { data, error } = await supabase
      .rpc('get_attendance_dashboard_summary', { target_deployment_id: deploymentId });

    if (error) {
      throw new Error('Failed to fetch attendance dashboard summary: ' + error.message);
    }

    return data[0] || {
      total_students: 0,
      total_sessions: 0,
      total_attendance_records: 0,
      average_attendance_rate: 0,
      total_hours_rendered: 0,
      total_hours_verified: 0,
      pending_make_up_requests: 0,
      students_completed: 0
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets attendance records for a deployment
 * @param {string} deploymentId - Deployment ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of attendance records
 */
async function getAttendanceRecords(deploymentId, filters = {}) {
  try {
    let query = supabase
      .from('attendance_monitoring_view')
      .select('*')
      .eq('deployment_id', deploymentId);

    // Apply date filter
    if (filters.date) {
      query = query.eq('attendance_date', filters.date);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('attendance_status', filters.status);
    }

    // Apply student filter
    if (filters.student_id) {
      query = query.eq('student_user_id', filters.student_id);
    }

    // Order by date and student name
    query = query.order('attendance_date', { ascending: false })
                 .order('student_name', { ascending: true });

    const { data: records, error } = await query;

    if (error) {
      throw new Error('Failed to fetch attendance records: ' + error.message);
    }

    return records || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Records student check-in
 * @param {string} deploymentId - Deployment ID
 * @param {string} studentId - Student user ID
 * @param {object} checkInData - Check-in data
 * @returns {Promise<object>} Created attendance record
 */
async function recordCheckIn(deploymentId, studentId, checkInData) {
  try {
    const attendanceDate = checkInData.attendance_date || new Date().toISOString().split('T')[0];
    const checkInTime = checkInData.check_in_time || new Date().toTimeString().split(' ')[0];

    // Check if attendance record already exists for this date
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('attendance_id')
      .eq('deployment_id', deploymentId)
      .eq('student_user_id', studentId)
      .eq('attendance_date', attendanceDate)
      .single();

    if (existing) {
      throw new Error('Attendance already recorded for this date');
    }

    // Create attendance record
    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert({
        deployment_id: deploymentId,
        student_user_id: studentId,
        attendance_date: attendanceDate,
        check_in_time: checkInTime,
        attendance_status: 'present',
        student_remarks: checkInData.remarks || null
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to record check-in: ' + error.message);
    }

    return record;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Records student check-out
 * @param {string} attendanceId - Attendance record ID
 * @param {object} checkOutData - Check-out data
 * @returns {Promise<object>} Updated attendance record
 */
async function recordCheckOut(attendanceId, checkOutData) {
  try {
    const checkOutTime = checkOutData.check_out_time || new Date().toTimeString().split(' ')[0];

    // Update attendance record with check-out time
    const { data: record, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: checkOutTime,
        student_remarks: checkOutData.remarks || null
      })
      .eq('attendance_id', attendanceId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to record check-out: ' + error.message);
    }

    return record;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Manually records attendance (for NSTP Officials)
 * @param {string} deploymentId - Deployment ID
 * @param {object} attendanceData - Attendance data
 * @param {string} recordedBy - NSTP Official user ID
 * @returns {Promise<object>} Created attendance record
 */
async function manualAttendanceRecord(deploymentId, attendanceData, recordedBy) {
  try {
    // Validate required fields
    if (!attendanceData.student_user_id) {
      throw new Error('Student ID is required');
    }
    if (!attendanceData.attendance_date) {
      throw new Error('Attendance date is required');
    }
    if (!attendanceData.attendance_status) {
      throw new Error('Attendance status is required');
    }

    // Check if record already exists
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('attendance_id')
      .eq('deployment_id', deploymentId)
      .eq('student_user_id', attendanceData.student_user_id)
      .eq('attendance_date', attendanceData.attendance_date)
      .single();

    if (existing) {
      throw new Error('Attendance already recorded for this student on this date');
    }

    // Create attendance record
    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert({
        deployment_id: deploymentId,
        student_user_id: attendanceData.student_user_id,
        attendance_date: attendanceData.attendance_date,
        check_in_time: attendanceData.check_in_time || null,
        check_out_time: attendanceData.check_out_time || null,
        attendance_status: attendanceData.attendance_status,
        hours_rendered: attendanceData.hours_rendered || 0,
        nstp_remarks: attendanceData.remarks || null
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to record attendance: ' + error.message);
    }

    return record;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Updates attendance record
 * @param {string} attendanceId - Attendance record ID
 * @param {object} updateData - Update data
 * @param {string} updatedBy - User ID who is updating
 * @returns {Promise<object>} Updated attendance record
 */
async function updateAttendanceRecord(attendanceId, updateData, updatedBy) {
  try {
    const updates = {};

    if (updateData.attendance_status) {
      updates.attendance_status = updateData.attendance_status;
    }
    if (updateData.check_in_time !== undefined) {
      updates.check_in_time = updateData.check_in_time;
    }
    if (updateData.check_out_time !== undefined) {
      updates.check_out_time = updateData.check_out_time;
    }
    if (updateData.hours_rendered !== undefined) {
      updates.hours_rendered = updateData.hours_rendered;
    }
    if (updateData.nstp_remarks !== undefined) {
      updates.nstp_remarks = updateData.nstp_remarks;
    }

    const { data: record, error } = await supabase
      .from('attendance_records')
      .update(updates)
      .eq('attendance_id', attendanceId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update attendance: ' + error.message);
    }

    return record;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Verifies attendance hours
 * @param {string} attendanceId - Attendance record ID
 * @param {string} verifiedBy - NSTP Official user ID
 * @returns {Promise<object>} Updated attendance record
 */
async function verifyAttendanceHours(attendanceId, verifiedBy) {
  try {
    const { data: record, error } = await supabase
      .from('attendance_records')
      .update({
        verified_by: verifiedBy,
        verified_at: new Date().toISOString()
      })
      .eq('attendance_id', attendanceId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to verify attendance: ' + error.message);
    }

    return record;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets student's attendance records for a deployment
 * @param {string} deploymentId - Deployment ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<Array>} Array of attendance records
 */
async function getStudentAttendance(deploymentId, studentId) {
  try {
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('deployment_id', deploymentId)
      .eq('student_user_id', studentId)
      .order('attendance_date', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch student attendance: ' + error.message);
    }

    return records || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets today's attendance status for a student
 * @param {string} deploymentId - Deployment ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<object|null>} Today's attendance record or null
 */
async function getTodayAttendance(deploymentId, studentId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: record, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('deployment_id', deploymentId)
      .eq('student_user_id', studentId)
      .eq('attendance_date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No record for today
      }
      throw new Error('Failed to fetch today\'s attendance: ' + error.message);
    }

    return record;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Bulk create attendance records for all students in deployment
 * @param {string} deploymentId - Deployment ID
 * @param {string} attendanceDate - Date for attendance
 * @param {string} recordedBy - NSTP Official user ID
 * @returns {Promise<Array>} Created attendance records
 */
async function bulkCreateAttendance(deploymentId, attendanceDate, recordedBy) {
  try {
    // Get all students in deployment
    const { data: students, error: studentsError } = await supabase
      .from('deployment_students')
      .select('student_user_id')
      .eq('deployment_id', deploymentId)
      .in('deployment_student_status', ['assigned', 'active']);

    if (studentsError) {
      throw new Error('Failed to fetch students: ' + studentsError.message);
    }

    if (!students || students.length === 0) {
      throw new Error('No students found in deployment');
    }

    // Create attendance records for all students (default: absent)
    const attendanceRecords = students.map(student => ({
      deployment_id: deploymentId,
      student_user_id: student.student_user_id,
      attendance_date: attendanceDate,
      attendance_status: 'absent',
      hours_rendered: 0
    }));

    const { data: records, error } = await supabase
      .from('attendance_records')
      .insert(attendanceRecords)
      .select();

    if (error) {
      throw new Error('Failed to create attendance records: ' + error.message);
    }

    return records || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  getAttendanceDashboardSummary,
  getAttendanceRecords,
  recordCheckIn,
  recordCheckOut,
  manualAttendanceRecord,
  updateAttendanceRecord,
  verifyAttendanceHours,
  getStudentAttendance,
  getTodayAttendance,
  bulkCreateAttendance
};