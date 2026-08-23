/**
 * NSTPConnect - Community Official Routes
 * Defines Community Official dashboard, deployment, monitoring, and attendance API routes
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { getCommunityOfficialProfile } = require('../controllers/communityController');
const {
  getCommunityDeployments,
  getCommunityDeploymentDetails,
  getCommunityAssignedStudents
} = require('../controllers/communityDeploymentController');
const {
  recordBatchAttendance,
  getCommunityAttendanceHistory,
  getSessionsForVerification,
  verifyAndCreditHours
} = require('../controllers/communityAttendanceController');
const {
  getCommunityDeploymentsForEvaluation,
  getCommunityFeedbackAndEvaluations,
  submitCommunityFeedback,
  submitStudentEvaluation
} = require('../controllers/communityFeedbackEvaluationController');

const router = express.Router();

// Apply middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('community_official'));

/**
 * GET /api/community/me
 * Get Community Official profile information
 */
router.get('/me', getCommunityOfficialProfile);

// ─── Deployment & Monitoring Routes ─────────────────────────────────────────

/**
 * GET /api/community/deployments
 * Get all deployments belonging to this community official
 */
router.get('/deployments', getCommunityDeployments);

/**
 * GET /api/community/deployments/students/all
 * Get all assigned students directory across all deployments
 */
router.get('/deployments/students/all', getCommunityAssignedStudents);

/**
 * GET /api/community/deployments/:deploymentId
 * Get deployment details and student participation roster
 */
router.get('/deployments/:deploymentId', getCommunityDeploymentDetails);

// ─── Attendance & Service Hours Logging Routes ─────────────────────────────

/**
 * POST /api/community/attendance/batch
 * Batch record daily student attendance
 */
router.post('/attendance/batch', recordBatchAttendance);

/**
 * GET /api/community/attendance/history
 * Get attendance records history
 */
router.get('/attendance/history', getCommunityAttendanceHistory);

/**
 * GET /api/community/hours/sessions
 * Fetch sessions for service hours verification and crediting
 */
router.get('/hours/sessions', getSessionsForVerification);

/**
 * POST /api/community/hours/verify-credit
 * Verify and credit rendered service hours based on time in/out
 */
router.post('/hours/verify-credit', verifyAndCreditHours);

// ─── Feedback & Performance Evaluation Routes ─────────────────────────────

/**
 * GET /api/community/feedback-evaluations/deployments
 * Fetch deployments and students available for feedback and evaluation
 */
router.get('/feedback-evaluations/deployments', getCommunityDeploymentsForEvaluation);

/**
 * GET /api/community/feedback-evaluations/records
 * Fetch all recorded feedback and evaluations
 */
router.get('/feedback-evaluations/records', getCommunityFeedbackAndEvaluations);

/**
 * POST /api/community/feedback-evaluations/feedback
 * Submit community feedback and rating
 */
router.post('/feedback-evaluations/feedback', submitCommunityFeedback);

/**
 * POST /api/community/feedback-evaluations/evaluation
 * Submit student academic performance evaluation
 */
router.post('/feedback-evaluations/evaluation', submitStudentEvaluation);

module.exports = router;