/**
 * NSTPConnect - DSS Matching Routes
 * Defines API routes for DSS matching functionality
 */

const express = require('express');
const router = express.Router();
const dssMatchingController = require('../controllers/dssMatchingController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');

// Apply authentication and role middleware to all DSS routes
router.use(isAuthenticated);
router.use(roleMiddleware('nstp_official'));

// ─── DSS Dashboard Routes ────────────────────────────────────────────────────

/**
 * GET /api/nstp/dss/summary
 * Get DSS dashboard summary statistics
 */
router.get('/summary', dssMatchingController.getDashboardSummary);

/**
 * GET /api/nstp/dss/approved-requests
 * Get all approved community requests
 */
router.get('/approved-requests', dssMatchingController.getApprovedRequests);

/**
 * GET /api/nstp/dss/eligible-students
 * Get all eligible students for matching
 */
router.get('/eligible-students', dssMatchingController.getEligibleStudents);

// ─── DSS Matching Routes ─────────────────────────────────────────────────────

/**
 * POST /api/nstp/dss/generate/:requestId
 * Generate match recommendations for a specific request
 */
router.post('/generate/:requestId', dssMatchingController.generateMatchRecommendations);

/**
 * GET /api/nstp/dss/results/:requestId
 * Get saved match results for a request
 */
router.get('/results/:requestId', dssMatchingController.getMatchResults);

// ─── Student Profile Routes ──────────────────────────────────────────────────

/**
 * GET /api/nstp/dss/student/:studentId
 * Get student profile for quick view
 */
router.get('/student/:studentId', dssMatchingController.getStudentQuickView);

module.exports = router;