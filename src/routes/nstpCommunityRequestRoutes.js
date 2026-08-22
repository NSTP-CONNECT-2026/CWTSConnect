/**
 * NSTPConnect - NSTP Community Request Routes
 * Routes for NSTP Officials to manage community requests
 */

const express = require('express');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest
} = require('../controllers/nstpCommunityRequestController');

const router = express.Router();

// Apply authentication and role middleware to all routes
router.use(isAuthenticated);
router.use(roleMiddleware('nstp_official'));

/**
 * GET /api/nstp/community-requests
 * Get all community requests
 * Query params: status, activity_type, component, search (all optional)
 */
router.get('/community-requests', getAllRequests);

/**
 * GET /api/nstp/community-requests/:requestId
 * Get a single request by ID
 */
router.get('/community-requests/:requestId', getRequestById);

/**
 * PUT /api/nstp/community-requests/:requestId/approve
 * Approve a community request
 */
router.put('/community-requests/:requestId/approve', approveRequest);

/**
 * PUT /api/nstp/community-requests/:requestId/reject
 * Reject a community request
 */
router.put('/community-requests/:requestId/reject', rejectRequest);

module.exports = router;
