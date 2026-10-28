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
    const deploymentId = req.params.deploymentId || req.body?.deployment_id || req.body?.deploymentId || req.query?.deployment_id;
    const studentId = req.session?.user?.user_id || req.user?.user_id;
    const checkInData = req.body || {};

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!deploymentId) {
      return res.status(400).json({
        success: false,
        message: 'Deployment ID is required for check-in'
      });
    }

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
    const attendanceId = req.params.attendanceId || req.body?.attendance_id || req.body?.attendanceId || req.query?.attendance_id;
    const checkOutData = req.body || {};

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record ID is required for check-out'
      });
    }

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
 * GET /api/attendance/my-attendance
 * GET /api/attendance/student/:studentId
 */
async function getStudentAttendance(req, res) {
  try {
    const deploymentId = req.params.deploymentId || req.query.deploymentId || req.query.deployment_id;
    const studentId = req.params.studentId || req.session?.user?.user_id || req.user?.user_id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

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
    const deploymentId = req.params.deploymentId || req.query.deploymentId || req.query.deployment_id;
    const studentId = req.params.studentId || req.session?.user?.user_id || req.user?.user_id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

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
          .select('student_user_id, deployment_id, deployment_student_status');

        const { data: allAttendance } = await supabase
          .from('attendance_records')
          .select('student_user_id, hours_rendered, attendance_status, verified_at, verified_by, student_remarks');

        const depCountMap = new Map();
        (assignmentsData || []).forEach(a => {
          if (a.deployment_student_status !== 'removed') {
            depCountMap.set(a.student_user_id, (depCountMap.get(a.student_user_id) || 0) + 1);
          }
        });

        const attCountMap = new Map();
        const hoursMap = new Map();
        (allAttendance || []).forEach(att => {
          if (att.attendance_status === 'present' || att.attendance_status === 'late' || Number(att.hours_rendered || 0) > 0) {
            attCountMap.set(att.student_user_id, (attCountMap.get(att.student_user_id) || 0) + 1);
          }
          
          let customHours = null;
          if (att.student_remarks) {
            const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
            if (match) {
              const parsedVal = parseFloat(match[1]);
              if (!isNaN(parsedVal)) customHours = parsedVal;
            }
          }
          const isCredited = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
          if (isCredited) {
            const creditedVal = (customHours !== null) ? customHours : Number(att.hours_rendered || 0);
            hoursMap.set(att.student_user_id, (hoursMap.get(att.student_user_id) || 0) + creditedVal);
          }
        });

        const summary = (studentsData || []).map(stu => {
          let prof = {};
          if (stu.student_profiles) {
            prof = Array.isArray(stu.student_profiles) ? (stu.student_profiles[0] || {}) : stu.student_profiles;
          }

          const isProfileComplete = Boolean(prof.full_name && (prof.course || prof.section));
          let formattedSection = '---';
          if (prof.section) {
            const sStr = String(prof.section).trim();
            formattedSection = sStr.toLowerCase().startsWith('section') ? sStr : `Section ${sStr.replace(/^sec\.?\s*/i, '')}`;
          } else if (isProfileComplete) {
            formattedSection = 'Section A';
          }

          let formattedYear = '---';
          if (prof.year_level) {
            const yStr = String(prof.year_level).trim();
            formattedYear = yStr.toLowerCase().includes('year') ? yStr : (yStr === '1' ? '1st Year' : `${yStr} Year`);
          } else if (isProfileComplete) {
            formattedYear = '1st Year';
          }

          return {
            student_user_id: stu.user_id,
            student_name: prof.full_name || stu.email,
            student_number: prof.student_number || '---',
            course: prof.course || (isProfileComplete ? 'BSIT' : '---'),
            section: formattedSection,
            year_level: formattedYear,
            profile_completed: isProfileComplete,
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
      const { data: batchAssignments, error: assignErr } = await supabase
        .from('deployment_students')
        .select(`
          deployment_student_id,
          deployment_id,
          student_user_id,
          deployment_student_status,
          student:users!deployment_students_student_user_id_fkey(
            user_id,
            email,
            student_profiles(full_name, student_number, course, section, year_level)
          )
        `)
        .eq('deployment_id', deploymentId)
        .neq('deployment_student_status', 'removed');

      if (assignErr) throw new Error(assignErr.message);

      const studentUserIds = (batchAssignments || []).map(b => b.student_user_id);

      let allAssignmentsForStudents = [];
      let allAttendanceForStudents = [];

      if (studentUserIds.length > 0) {
        const { data: allAssign } = await supabase
          .from('deployment_students')
          .select('student_user_id, deployment_id, deployment_student_status')
          .in('student_user_id', studentUserIds)
          .neq('deployment_student_status', 'removed');
        allAssignmentsForStudents = allAssign || [];

        const { data: allAtt } = await supabase
          .from('attendance_records')
          .select('attendance_id, student_user_id, deployment_id, attendance_date, check_in_time, check_out_time, attendance_status, hours_rendered, verified_at, verified_by, student_remarks')
          .in('student_user_id', studentUserIds);
        allAttendanceForStudents = allAtt || [];
      }

      const totalDepCountMap = new Map();
      allAssignmentsForStudents.forEach(a => {
        totalDepCountMap.set(a.student_user_id, (totalDepCountMap.get(a.student_user_id) || 0) + 1);
      });

      const totalAttCountMap = new Map();
      const totalHoursMap = new Map();
      const currentBatchAttMap = new Map();

      allAttendanceForStudents.forEach(att => {
        if (att.attendance_status === 'present' || att.attendance_status === 'late' || Number(att.hours_rendered || 0) > 0) {
          totalAttCountMap.set(att.student_user_id, (totalAttCountMap.get(att.student_user_id) || 0) + 1);
        }

        let customHours = null;
        if (att.student_remarks) {
          const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
          if (match) {
            const parsedVal = parseFloat(match[1]);
            if (!isNaN(parsedVal)) customHours = parsedVal;
          }
        }
        const isCredited = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
        if (isCredited) {
          const creditedVal = (customHours !== null) ? customHours : Number(att.hours_rendered || 0);
          totalHoursMap.set(att.student_user_id, (totalHoursMap.get(att.student_user_id) || 0) + creditedVal);
        }

        if (att.deployment_id === deploymentId) {
          currentBatchAttMap.set(att.student_user_id, att);
        }
      });

      const summary = (batchAssignments || []).map(item => {
        const student = item.student || {};
        let prof = {};
        if (student.student_profiles) {
          prof = Array.isArray(student.student_profiles) ? (student.student_profiles[0] || {}) : student.student_profiles;
        }

        const batchAtt = currentBatchAttMap.get(item.student_user_id);
        const isPresent = Boolean(batchAtt && (batchAtt.attendance_status === 'present' || batchAtt.attendance_status === 'late' || Number(batchAtt.hours_rendered || 0) > 0));

        let isCredited = false;
        let batchCreditedHours = 0;
        if (batchAtt) {
          let customHours = null;
          if (batchAtt.student_remarks) {
            const match = String(batchAtt.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
            if (match) {
              const parsedVal = parseFloat(match[1]);
              if (!isNaN(parsedVal)) customHours = parsedVal;
            }
          }
          isCredited = Boolean(batchAtt.verified_at || batchAtt.verified_by || (batchAtt.student_remarks && /\[CREDITED:[0-9.]+\]/.test(batchAtt.student_remarks)));
          if (isCredited) {
            batchCreditedHours = (customHours !== null) ? customHours : Number(batchAtt.hours_rendered || 0);
          }
        }

        const isProfileComplete = Boolean(prof.full_name && (prof.course || prof.section));
        let formattedSection = '---';
        if (prof.section) {
          const sStr = String(prof.section).trim();
          formattedSection = sStr.toLowerCase().startsWith('section') ? sStr : `Section ${sStr.replace(/^sec\.?\s*/i, '')}`;
        } else if (isProfileComplete) {
          formattedSection = 'Section A';
        }

        let formattedYear = '---';
        if (prof.year_level) {
          const yStr = String(prof.year_level).trim();
          formattedYear = yStr.toLowerCase().includes('year') ? yStr : (yStr === '1' ? '1st Year' : `${yStr} Year`);
        } else if (isProfileComplete) {
          formattedYear = '1st Year';
        }

        return {
          student_user_id: item.student_user_id,
          deployment_id: deploymentId,
          student_name: prof.full_name || student.email || 'Student Volunteer',
          student_number: prof.student_number || '---',
          course: prof.course || (isProfileComplete ? 'BSIT' : '---'),
          section: formattedSection,
          year_level: formattedYear,
          profile_completed: isProfileComplete,
          total_deployments: totalDepCountMap.get(item.student_user_id) || 1,
          total_attendance: totalAttCountMap.get(item.student_user_id) || 0,
          total_hours_rendered: totalHoursMap.get(item.student_user_id) || 0,
          is_present: isPresent,
          batch_attendance_status: isPresent ? 'Present' : 'Absent',
          check_in_time: batchAtt ? batchAtt.check_in_time : null,
          check_out_time: batchAtt ? batchAtt.check_out_time : null,
          is_credited: isCredited,
          batch_rendered_hours: batchCreditedHours
        };
      });

      return res.json({
        success: true,
        mode: 'batch_details',
        deployment_id: deploymentId,
        attendance: summary
      });
    } catch (error) {
      console.error('getDeploymentAttendance Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};