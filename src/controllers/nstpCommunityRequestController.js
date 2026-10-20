/**
 * NSTPConnect - NSTP Community Request Controller
 * Handles NSTP Official's community request management
 */

const {
  getAllCommunityRequests,
  getCommunityRequestByIdForNSTP,
  approveCommunityRequest,
  rejectCommunityRequest
} = require('../services/communityRequestService');

/**
 * GET /api/nstp/community-requests
 * Get all community requests (for NSTP Officials)
 */
async function getAllRequests(req, res) {
  try {
    const { status, activity_type, component, search } = req.query;

    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (activity_type && activity_type !== 'all') {
      filters.activity_type = activity_type;
    }
    if (component && component !== 'all') {
      filters.component = component;
    }
    if (search && search.trim() !== '') {
      filters.search = search.trim();
    }

    const requests = await getAllCommunityRequests(filters);

    res.json({
      success: true,
      data: requests,
      requests: requests,
      message: 'Requests fetched successfully'
    });
  } catch (error) {
    console.error('Get all requests error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests: ' + error.message
    });
  }
}

/**
 * GET /api/nstp/community-requests/:requestId
 * Get a single request by ID (for NSTP Officials)
 */
async function getRequestById(req, res) {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const request = await getCommunityRequestByIdForNSTP(requestId);

    res.json({
      success: true,
      data: request,
      request: request,
      message: 'Request fetched successfully'
    });
  } catch (error) {
    console.error('Get request by ID error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch request: ' + error.message
    });
  }
}

/**
 * PUT /api/nstp/community-requests/:requestId/approve
 * Approve a community request
 */
async function approveRequest(req, res) {
  try {
    const nstpUserId = req.session && req.session.user ? req.session.user.user_id : null;
    const { requestId } = req.params;
    const rawNotes = (req.body.review_notes || req.body.remarks || req.body.feedback || req.body.reason || '').trim();

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const updatedRequest = await approveCommunityRequest(requestId, nstpUserId, rawNotes || null);

    res.json({
      success: true,
      message: 'Request approved successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Approve request error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request: ' + error.message
    });
  }
}

/**
 * PUT /api/nstp/community-requests/:requestId/reject
 * Reject a community request
 */
async function rejectRequest(req, res) {
  try {
    const nstpUserId = req.session && req.session.user ? req.session.user.user_id : null;
    const { requestId } = req.params;
    const rawNotes = (req.body.review_notes || req.body.remarks || req.body.feedback || req.body.reason || '').trim();
    const review_notes = rawNotes || 'Request reviewed and rejected by NSTP Coordinator.';

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const updatedRequest = await rejectCommunityRequest(requestId, nstpUserId, review_notes);

    res.json({
      success: true,
      message: 'Request rejected successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Reject request error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request: ' + error.message
    });
  }
}

module.exports = {
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest
};
