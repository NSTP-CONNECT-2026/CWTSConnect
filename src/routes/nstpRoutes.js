const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { 
  getNstpOfficialProfile,
  getAllStudents,
  getStudentById,
  getAllCommunityOfficials,
  addCommunityOfficial,
  updateCommunityOfficialStatus,
  updateCommunityOfficialDetails
} = require('../controllers/nstpController');
const { getNstpFeedbackAndEvaluations } = require('../controllers/nstpFeedbackEvaluationController');
const { getNstpAnalytics } = require('../controllers/nstpAnalyticsController');
const { generateReport } = require('../controllers/nstpReportsController');

const router = express.Router();

// Apply middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('nstp_official'));

// GET /api/nstp/me - Get NSTP Official profile
router.get('/me', getNstpOfficialProfile);

// GET /api/nstp/students - Get all students
router.get('/students', getAllStudents);

// GET /api/nstp/students/:userId - Get single student details
router.get('/students/:userId', getStudentById);

// GET /api/nstp/community-officials - Get all community officials
router.get('/community-officials', getAllCommunityOfficials);

// POST /api/nstp/community-officials - Add community official
router.post('/community-officials', addCommunityOfficial);

// PUT /api/nstp/community-officials/:userId/status - Update status
router.put('/community-officials/:userId/status', updateCommunityOfficialStatus);

// PUT /api/nstp/community-officials/:userId/details - Update basic details
router.put('/community-officials/:userId/details', updateCommunityOfficialDetails);

// GET /api/nstp/feedback-evaluations/records - Get all feedback and evaluations for coordinator
router.get('/feedback-evaluations/records', getNstpFeedbackAndEvaluations);

// GET /api/nstp/analytics - Comprehensive analytics dashboard records
router.get('/analytics', getNstpAnalytics);

// GET /api/nstp/reports/generate - Generate institutional reports
router.get('/reports/generate', generateReport);

module.exports = router;