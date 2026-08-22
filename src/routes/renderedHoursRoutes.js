const express = require('express');
const router = express.Router();
const renderedHoursController = require('../controllers/renderedHoursController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Student routes - view own hours
router.get('/my-hours', authenticateToken, requireRole(['student']), renderedHoursController.getMyHours);

// NSTP Official routes - view hours
router.get('/student/:studentId', authenticateToken, requireRole(['nstp_official']), renderedHoursController.getStudentHours);
router.get('/deployment/:deploymentId', authenticateToken, requireRole(['nstp_official']), renderedHoursController.getDeploymentHours);
router.get('/deployment/:deploymentId/statistics', authenticateToken, requireRole(['nstp_official']), renderedHoursController.getDeploymentStatistics);

// NSTP Official routes - export
router.get('/student/:studentId/export', authenticateToken, requireRole(['nstp_official']), renderedHoursController.exportStudentHours);
router.get('/deployment/:deploymentId/export', authenticateToken, requireRole(['nstp_official']), renderedHoursController.exportDeploymentHours);

module.exports = router;
