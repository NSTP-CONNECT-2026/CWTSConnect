/**
 * NSTPConnect - Community Request Routes
 * Defines community request management routes
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  cancelRequest,
  getRequestSummaryStats
} = require('../controllers/communityRequestController');

const router = express.Router();

// Apply authentication and role middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('community_official'));

/**
 * POST /api/community/requests
 * Create a new community request
 */
router.post('/requests', createRequest);

/**
 * GET /api/community/requests
 * Get all requests for the logged-in Community Official
 * Query params: status (optional), search (optional)
 */
router.get('/requests', getRequests);

/**
 * GET /api/community/requests/:requestId
 * Get a single request by ID
 */
router.get('/requests/:requestId', getRequestById);

/**
 * PUT /api/community/requests/:requestId
 * Update a community request
 */
router.put('/requests/:requestId', updateRequest);

/**
 * PUT /api/community/requests/:requestId/cancel
 * Cancel a community request
 */
router.put('/requests/:requestId/cancel', cancelRequest);

/**
 * GET /api/community/request-summary
 * Get request summary statistics
 */
router.get('/request-summary', getRequestSummaryStats);

module.exports = router;