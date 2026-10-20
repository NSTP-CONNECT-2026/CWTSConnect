/**
 * NSTPConnect - Community Request Controller
 * Handles community request HTTP requests and responses
 */

const {
  createCommunityRequest,
  getCommunityRequests,
  getCommunityRequestById,
  updateCommunityRequest,
  cancelCommunityRequest,
  deleteCommunityRequest,
  getRequestSummary
} = require('../services/communityRequestService');

/**
 * POST /api/community/requests
 * Create a new community request
 */
async function createRequest(req, res) {
  try {
    const userId = req.session.user.user_id;
    const requestData = req.body;

    const newRequest = await createCommunityRequest(userId, requestData);

    res.status(201).json({
      success: true,
      message: 'Community request submitted successfully. Please wait for NSTP Official review.',
      data: newRequest
    });
  } catch (error) {
    console.error('Create request error:', error.message);
    
    if (error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create request: ' + error.message
    });
  }
}

/**
 * GET /api/community/requests
 * Get all requests for the logged-in Community Official
 */
async function getRequests(req, res) {
  try {
    const userId = req.session.user.user_id;
    const { status, search } = req.query;

    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (search && search.trim() !== '') {
      filters.search = search.trim();
    }

    const requests = await getCommunityRequests(userId, filters);

    res.json({
      success: true,
      data: requests,
      message: 'Requests fetched successfully'
    });
  } catch (error) {
    console.error('Get requests error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests: ' + error.message
    });
  }
}

/**
 * GET /api/community/requests/:requestId
 * Get a single request by ID
 */
async function getRequestById(req, res) {
  try {
    const userId = req.session.user.user_id;
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const request = await getCommunityRequestById(requestId, userId);

    res.json({
      success: true,
      data: request,
      message: 'Request fetched successfully'
    });
  } catch (error) {
    console.error('Get request by ID error:', error.message);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
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
 * PUT /api/community/requests/:requestId
 * Update a community request
 */
async function updateRequest(req, res) {
  try {
    const userId = req.session.user.user_id;
    const { requestId } = req.params;
    const updateData = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const updatedRequest = await updateCommunityRequest(requestId, userId, updateData);

    res.json({
      success: true,
      message: 'Request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Update request error:', error.message);
    
    if (error.message.includes('Cannot edit') || error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update request: ' + error.message
    });
  }
}

/**
 * PUT /api/community/requests/:requestId/cancel
 * Cancel a community request
 */
async function cancelRequest(req, res) {
  try {
    const userId = req.session.user.user_id;
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const cancelledRequest = await cancelCommunityRequest(requestId, userId);

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: cancelledRequest
    });
  } catch (error) {
    console.error('Cancel request error:', error.message);
    
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cancel request: ' + error.message
    });
  }
}

/**
 * GET /api/community/request-summary
 * Get request summary statistics
 */
async function getRequestSummaryStats(req, res) {
  try {
    const userId = req.session.user.user_id;

    const summary = await getRequestSummary(userId);

    res.json({
      success: true,
      data: summary,
      message: 'Request summary fetched successfully'
    });
  } catch (error) {
    console.error('Get request summary error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request summary: ' + error.message
    });
  }
}

/**
 * DELETE /api/community/requests/:requestId
 * Permanently deletes a cancelled community request
 */
async function deleteRequest(req, res) {
  try {
    const { requestId } = req.params;
    const userId = req.session.user.user_id;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    await deleteCommunityRequest(requestId, userId);

    res.json({
      success: true,
      message: 'Cancelled request deleted successfully'
    });
  } catch (error) {
    console.error('Delete request error:', error.message);

    if (error.message.includes('Only cancelled requests')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete request: ' + error.message
    });
  }
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  cancelRequest,
  deleteRequest,
  getRequestSummaryStats
};