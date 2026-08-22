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
      
      let query = require('../config/supabaseClient')
        .from('attendance_records')
        .select(`
          *,
          student:users!attendance_records_student_user_id_fkey(
            email,
            student_profiles(full_name, student_number)
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
      
      // Transform data
      const attendance = data.map(record => ({
        ...record,
        student_name: record.student?.student_profiles?.[0]?.full_name || 'N/A',
        student_number: record.student?.student_profiles?.[0]?.student_number || 'N/A',
        verified_by_name: record.verified_by_user?.student_profiles?.[0]?.full_name || null
      }));
      
      res.json({
        success: true,
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