/**
 * NSTPConnect - Deployment Routes
 * Defines API routes for deployment management functionality
 */

const express = require('express');
const router = express.Router();
const deploymentController = require('../controllers/deploymentController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');

// Apply authentication to all deployment routes
router.use(isAuthenticated);

// ─── NSTP Official Deployment Management Routes ──────────────────────────────
// Only NSTP Officials can manage deployments
router.use(roleMiddleware('nstp_official'));

/**
 * GET /api/nstp/deployments/summary
 * Get deployment dashboard summary statistics
 */
router.get('/summary', deploymentController.getDeploymentDashboardSummary);

/**
 * GET /api/nstp/deployments
 * Get all deployments with optional filtering
 * Query params: status, search, limit, offset
 */
router.get('/', deploymentController.getDeployments);

/**
 * GET /api/nstp/deployments/deployable-requests
 * Get approved community requests available for deployment
 */
router.get('/deployable-requests', deploymentController.getDeployableRequests);

/**
 * GET /api/nstp/deployments/request/:requestId/recommendations
 * Get DSS recommendations for deployment assignment
 */
router.get('/request/:requestId/recommendations', deploymentController.getDSSRecommendationsForDeployment);

/**
 * POST /api/nstp/deployments/create
 * Create a new deployment assignment
 */
router.post('/create', deploymentController.createDeployment);

/**
 * GET /api/nstp/deployments/:deploymentId
 * Get deployment details by ID
 */
router.get('/:deploymentId', deploymentController.getDeploymentDetails);

/**
 * PUT /api/nstp/deployments/:deploymentId/status
 * Update deployment status
 */
router.put('/:deploymentId/status', deploymentController.updateDeploymentStatus);

// ─── Student Deployment Status Routes ────────────────────────────────────────
// These routes can be accessed by students to check their own deployment status

/**
 * GET /api/nstp/deployments/student/:studentId/current
 * Get student's current deployment status
 * Note: In production, add middleware to ensure students can only access their own data
 */
router.get('/student/:studentId/current', deploymentController.getStudentCurrentDeployment);

/**
 * GET /api/nstp/deployments/student/:studentId/check-active
 * Check if student has active deployment
 * Note: In production, add middleware to ensure students can only access their own data
 */
router.get('/student/:studentId/check-active', deploymentController.checkStudentActiveDeployment);

module.exports = router;