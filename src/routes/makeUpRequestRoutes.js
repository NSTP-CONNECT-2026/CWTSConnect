const express = require('express');
const router = express.Router();
const makeUpRequestController = require('../controllers/makeUpRequestController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// Student routes - manage own make-up requests
router.post('/', authenticateToken, requireRole(['student']), makeUpRequestController.createMakeUpRequest);
router.get('/my-requests', authenticateToken, requireRole(['student']), makeUpRequestController.getMyMakeUpRequests);
router.put('/:id/cancel', authenticateToken, requireRole(['student']), makeUpRequestController.cancelMakeUpRequest);

// NSTP Official routes - review make-up requests
router.get('/deployment/:deploymentId', authenticateToken, requireRole(['nstp_official']), makeUpRequestController.getDeploymentMakeUpRequests);
router.put('/:id/approve', authenticateToken, requireRole(['nstp_official']), makeUpRequestController.approveMakeUpRequest);
router.put('/:id/reject', authenticateToken, requireRole(['nstp_official']), makeUpRequestController.rejectMakeUpRequest);
router.put('/:id/complete', authenticateToken, requireRole(['nstp_official']), makeUpRequestController.completeMakeUpRequest);

module.exports = router;
