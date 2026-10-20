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

// ─── Student Deployment Status Routes ────────────────────────────────────────
// Students can check their own deployment status
router.get('/student/:studentId/current', deploymentController.getStudentCurrentDeployment);
router.get('/student/:studentId/check-active', deploymentController.checkStudentActiveDeployment);

// ─── NSTP Official Deployment Management Routes ──────────────────────────────
// Only NSTP Officials can manage deployments
router.use(roleMiddleware('nstp_official'));

/**
 * GET /api/nstp/deployments/summary
 * Get deployment dashboard summary statistics
 */
router.get('/summary', deploymentController.getDeploymentDashboardSummary);

/**
 * GET /api/nstp/deployments/deployable-requests
 * Get approved community requests available for deployment
 */
router.get('/deployable-requests', deploymentController.getDeployableRequests);

/**
 * Recommendations for deployment assignment (Supports both path styles)
 * GET /api/nstp/deployments/recommendations/:requestId
 * GET /api/nstp/deployments/request/:requestId/recommendations
 */
router.get('/recommendations/:requestId', deploymentController.getDSSRecommendationsForDeployment);
router.get('/request/:requestId/recommendations', deploymentController.getDSSRecommendationsForDeployment);

/**
 * Create a new deployment assignment (Supports POST / and POST /create)
 * POST /api/nstp/deployments
 * POST /api/nstp/deployments/create
 */
router.post('/', deploymentController.createDeployment);
router.post('/create', deploymentController.createDeployment);

/**
 * GET /api/nstp/deployments
 * Get all deployments with optional filtering
 * Query params: status, search, limit, offset
 */
router.get('/', deploymentController.getDeployments);

/**
 * GET /api/nstp/deployments/:deploymentId
 * Get deployment details by ID
 */
router.get('/:deploymentId', deploymentController.getDeploymentDetails);

/**
 * Update deployment status (Supports both PATCH and PUT)
 * PATCH /api/nstp/deployments/:deploymentId/status
 * PUT /api/nstp/deployments/:deploymentId/status
 */
router.patch('/:deploymentId/status', deploymentController.updateDeploymentStatus);
router.put('/:deploymentId/status', deploymentController.updateDeploymentStatus);

module.exports = router;