const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Student routes - check in/out
router.post('/check-in', authenticateToken, requireRole(['student']), attendanceController.checkIn);
router.post('/check-out', authenticateToken, requireRole(['student']), attendanceController.checkOut);

// Student routes - view own attendance
router.get('/my-attendance', authenticateToken, requireRole(['student']), attendanceController.getMyAttendance);

// NSTP Official routes - manage attendance
router.post('/manual', authenticateToken, requireRole(['nstp_official']), attendanceController.createManualAttendance);
router.put('/:id', authenticateToken, requireRole(['nstp_official']), attendanceController.updateAttendance);
router.delete('/:id', authenticateToken, requireRole(['nstp_official']), attendanceController.deleteAttendance);

// NSTP Official routes - verify attendance
router.put('/:id/verify', authenticateToken, requireRole(['nstp_official']), attendanceController.verifyAttendance);
router.put('/:id/reject', authenticateToken, requireRole(['nstp_official']), attendanceController.rejectAttendance);

// NSTP Official routes - view attendance
router.get('/deployment/:deploymentId', authenticateToken, requireRole(['nstp_official']), attendanceController.getDeploymentAttendance);
router.get('/student/:studentId', authenticateToken, requireRole(['nstp_official']), attendanceController.getStudentAttendance);

module.exports = router;
