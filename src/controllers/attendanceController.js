/**
 * NSTPConnect - Attendance Controller
 * Handles attendance tracking HTTP requests
 */

const attendanceService = require('../services/attendanceService');

/**
 * Gets attendance dashboard summary
 * GET /api/nstp/attendance/:deploymentId/summary
 */
async function getAttendanceDashboardSummary(req, res) {
  try {
    const { deploymentId } = req.params;
    const summary = await attendanceService.getAttendanceDashboardSummary(deploymentId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get Attendance Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets attendance records
 * GET /api/nstp/attendance/:deploymentId/records
 */
async function getAttendanceRecords(req, res) {
  try {
    const { deploymentId } = req.params;
    const filters = {
      date: req.query.date,
      status: req.query.status,
      student_id: req.query.student_id
    };

    const records = await attendanceService.getAttendanceRecords(deploymentId, filters);
    
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Get Attendance Records Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Records student check-in
 * POST /api/student/attendance/:deploymentId/check-in
 */
async function recordCheckIn(req, res) {
  try {
    const { deploymentId } = req.params;
    const studentId = req.session.user.user_id;
    const checkInData = req.body;

    const record = await attendanceService.recordCheckIn(deploymentId, studentId, checkInData);
    
    res.status(201).json({
      success: true,
      message: 'Check-in recorded successfully',
      data: record
    });
  } catch (error) {
    console.error('Record Check-in Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Records student check-out
 * POST /api/student/attendance/:attendanceId/check-out
 */
async function recordCheckOut(req, res) {
  try {
    const { attendanceId } = req.params;
    const checkOutData = req.body;

    const record = await attendanceService.recordCheckOut(attendanceId, checkOutData);
    
    res.json({
      success: true,
      message: 'Check-out recorded successfully',
      data: record
    });
  } catch (error) {
    console.error('Record Check-out Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Manually records attendance (NSTP Official)
 * POST /api/nstp/attendance/:deploymentId/manual
 */
async function manualAttendanceRecord(req, res) {
  try {
    const { deploymentId } = req.params;
    const recordedBy = req.session.user.user_id;
    const attendanceData = req.body;

    const record = await attendanceService.manualAttendanceRecord(deploymentId, attendanceData, recordedBy);
    
    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: record
    });
  } catch (error) {
    console.error('Manual Attendance Record Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Updates attendance record
 * PUT /api/nstp/attendance/:attendanceId
 */
async function updateAttendanceRecord(req, res) {
  try {
    const { attendanceId } = req.params;
    const updatedBy = req.session.user.user_id;
    const updateData = req.body;

    const record = await attendanceService.updateAttendanceRecord(attendanceId, updateData, updatedBy);
    
    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: record
    });
  } catch (error) {
    console.error('Update Attendance Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Verifies attendance hours
 * POST /api/nstp/attendance/:attendanceId/verify
 */
async function verifyAttendanceHours(req, res) {
  try {
    const { attendanceId } = req.params;
    const verifiedBy = req.session.user.user_id;

    const record = await attendanceService.verifyAttendanceHours(attendanceId, verifiedBy);
    
    res.json({
      success: true,
      message: 'Attendance hours verified successfully',
      data: record
    });
  } catch (error) {
    console.error('Verify Attendance Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets student's attendance records
 * GET /api/student/attendance/:deploymentId
 */
async function getStudentAttendance(req, res) {
  try {
    const { deploymentId } = req.params;
    const studentId = req.session.user.user_id;

    const records = await attendanceService.getStudentAttendance(deploymentId, studentId);
    
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Get Student Attendance Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets today's attendance status
 * GET /api/student/attendance/:deploymentId/today
 */
async function getTodayAttendance(req, res) {
  try {
    const { deploymentId } = req.params;
    const studentId = req.session.user.user_id;

    const record = await attendanceService.getTodayAttendance(deploymentId, studentId);
    
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Get Today Attendance Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Bulk creates attendance records
 * POST /api/nstp/attendance/:deploymentId/bulk-create
 */
async function bulkCreateAttendance(req, res) {
  try {
    const { deploymentId } = req.params;
    const { attendance_date } = req.body;
    const recordedBy = req.session.user.user_id;

    if (!attendance_date) {
      return res.status(400).json({
        success: false,
        message: 'Attendance date is required'
      });
    }

    const records = await attendanceService.bulkCreateAttendance(deploymentId, attendance_date, recordedBy);
    
    res.status(201).json({
      success: true,
      message: `Created ${records.length} attendance records`,
      data: records
    });
  } catch (error) {
    console.error('Bulk Create Attendance Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
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
  bulkCreateAttendance,
  // Aliases for route compatibility
  checkIn: recordCheckIn,
  checkOut: recordCheckOut,
  getMyAttendance: getStudentAttendance,
  createManualAttendance: manualAttendanceRecord,
  updateAttendance: updateAttendanceRecord,
  deleteAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      // Delete attendance record
      const { error } = await require('../config/supabaseClient')
        .from('attendance_records')
        .delete()
        .eq('attendance_id', id);
      
      if (error) throw new Error(error.message);
      
      res.json({
        success: true,
        message: 'Attendance deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },
  verifyAttendance: verifyAttendanceHours,
  rejectAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const rejectedBy = req.user.user_id;
      
      const { data, error } = await require('../config/supabaseClient')
        .from('attendance_records')
        .update({
          verification_status: 'rejected',
          rejection_reason,
          verified_by: rejectedBy,
          verified_at: new Date().toISOString()
        })
        .eq('attendance_id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      res.json({
        success: true,
        message: 'Attendance rejected',
        data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },
  getDeploymentAttendance: async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const { status, date } = req.query;
      const supabase = require('../config/supabaseClient');

      // MODE 1: ALL STUDENTS OVERVIEW (Total Deployments & Total Attendance)
      if (!deploymentId || deploymentId === 'all') {
        const { data: studentsData, error: stuErr } = await supabase
          .from('users')
          .select(`
            user_id,
            email,
            student_profiles(full_name, student_number, course, section, year_level)
          `)
          .eq('role', 'student');

        if (stuErr) throw new Error(stuErr.message);

        const { data: assignmentsData } = await supabase
          .from('deployment_students')
          .select('student_user_id, deployment_id');

        const { data: allAttendance } = await supabase
          .from('attendance_records')
          .select('student_user_id, hours_rendered, attendance_status, verification_status');

        const depCountMap = new Map();
        (assignmentsData || []).forEach(a => {
          depCountMap.set(a.student_user_id, (depCountMap.get(a.student_user_id) || 0) + 1);
        });

        const attCountMap = new Map();
        const hoursMap = new Map();
        (allAttendance || []).forEach(att => {
          attCountMap.set(att.student_user_id, (attCountMap.get(att.student_user_id) || 0) + 1);
          hoursMap.set(att.student_user_id, (hoursMap.get(att.student_user_id) || 0) + Number(att.hours_rendered || 0));
        });

        const summary = (studentsData || []).map(stu => {
          const prof = stu.student_profiles?.[0] || {};
          return {
            student_user_id: stu.user_id,
            student_name: prof.full_name || stu.email,
            student_number: prof.student_number || 'N/A',
            course: prof.course || 'BSIT',
            section: prof.section || '1',
            year_level: prof.year_level || '1',
            total_deployments: depCountMap.get(stu.user_id) || 0,
            total_attendance: attCountMap.get(stu.user_id) || 0,
            total_hours_rendered: hoursMap.get(stu.user_id) || 0
          };
        });

        return res.json({
          success: true,
          mode: 'all_students',
          attendance: summary
        });
      }

      // MODE 2: SPECIFIC DEPLOYMENT BATCH
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          student:users!attendance_records_student_user_id_fkey(
            email,
            student_profiles(full_name, student_number, course, section, year_level)
          ),
          verified_by_user:users!attendance_records_verified_by_fkey(
            email,
            student_profiles(full_name)
          )
        `)
        .eq('deployment_id', deploymentId)
        .order('attendance_date', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('verification_status', status);
      }

      if (date) {
        query = query.eq('attendance_date', date);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      // Get deployment default date
      const { data: depData } = await supabase
        .from('deployments')
        .select('deployment_start_date, deployment_batch_name, activity_title')
        .eq('deployment_id', deploymentId)
        .single();
      const defaultDate = depData?.deployment_start_date ? depData.deployment_start_date.split('T')[0] : new Date().toISOString().split('T')[0];

      // Transform logged attendance
      const attendance = (data || []).map(record => {
        const prof = record.student?.student_profiles?.[0] || {};
        return {
          ...record,
          student_name: prof.full_name || 'N/A',
          student_number: prof.student_number || 'N/A',
          course: prof.course || 'N/A',
          section: prof.section || '1',
          year_level: prof.year_level || '1',
          attendance_date: record.attendance_date || defaultDate,
          verified_by_name: record.verified_by_user?.student_profiles?.[0]?.full_name || null
        };
      });

      // Include all assigned students for this batch even if they haven't timed in yet
      const { data: assignedStudents } = await supabase
        .from('deployment_students')
        .select(`
          student_user_id,
          student:users!deployment_students_student_user_id_fkey(
            email,
            student_profiles(full_name, student_number, course, section, year_level)
          )
        `)
        .eq('deployment_id', deploymentId);

      const loggedStudentIds = new Set((data || []).map(d => d.student_user_id));
      if (assignedStudents && assignedStudents.length > 0) {
        assignedStudents.forEach(as => {
          if (!loggedStudentIds.has(as.student_user_id)) {
            const prof = as.student?.student_profiles?.[0] || {};
            attendance.push({
              attendance_id: `pending-${as.student_user_id}`,
              deployment_id: deploymentId,
              student_user_id: as.student_user_id,
              student_name: prof.full_name || 'Student Volunteer',
              student_number: prof.student_number || 'N/A',
              course: prof.course || 'BSIT',
              section: prof.section || '1',
              year_level: prof.year_level || '1',
              attendance_date: defaultDate,
              check_in_time: null,
              check_out_time: null,
              hours_rendered: 0,
              attendance_status: 'not_logged',
              verification_status: 'pending'
            });
          }
        });
      }

      res.json({
        success: true,
        mode: 'batch_details',
        attendance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};