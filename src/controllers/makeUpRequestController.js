/**
 * NSTPConnect - Make-up Request Controller
 * Handles make-up session requests HTTP requests
 */

const makeUpRequestService = require('../services/makeUpRequestService');

/**
 * Gets make-up requests for deployment
 * GET /api/nstp/make-up-requests/:deploymentId
 */
async function getMakeUpRequests(req, res) {
  try {
    const { deploymentId } = req.params;
    const filters = {
      status: req.query.status,
      student_id: req.query.student_id
    };

    const requests = await makeUpRequestService.getMakeUpRequests(deploymentId, filters);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get Make-up Requests Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets student's make-up requests
 * GET /api/student/make-up-requests
 */
async function getStudentMakeUpRequests(req, res) {
  try {
    const studentId = req.session.user.user_id;
    const deploymentId = req.query.deployment_id || null;

    const requests = await makeUpRequestService.getStudentMakeUpRequests(studentId, deploymentId);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get Student Make-up Requests Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Creates a make-up request
 * POST /api/student/make-up-requests
 */
async function createMakeUpRequest(req, res) {
  try {
    const studentId = req.session.user.user_id;
    const requestData = req.body;

    const request = await makeUpRequestService.createMakeUpRequest(studentId, requestData);
    
    res.status(201).json({
      success: true,
      message: 'Make-up request submitted successfully',
      data: request
    });
  } catch (error) {
    console.error('Create Make-up Request Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Reviews a make-up request
 * PUT /api/nstp/make-up-requests/:makeUpId/review
 */
async function reviewMakeUpRequest(req, res) {
  try {
    const { makeUpId } = req.params;
    const reviewedBy = req.session.user.user_id;
    const reviewData = req.body;

    const request = await makeUpRequestService.reviewMakeUpRequest(makeUpId, reviewedBy, reviewData);
    
    res.json({
      success: true,
      message: `Make-up request ${reviewData.status}`,
      data: request
    });
  } catch (error) {
    console.error('Review Make-up Request Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Records make-up session completion
 * POST /api/nstp/make-up-requests/:makeUpId/complete
 */
async function recordMakeUpCompletion(req, res) {
  try {
    const { makeUpId } = req.params;
    const verifiedBy = req.session.user.user_id;
    const completionData = req.body;

    const request = await makeUpRequestService.recordMakeUpCompletion(makeUpId, completionData, verifiedBy);
    
    res.json({
      success: true,
      message: 'Make-up session completed successfully',
      data: request
    });
  } catch (error) {
    console.error('Record Make-up Completion Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Cancels a make-up request
 * DELETE /api/student/make-up-requests/:makeUpId
 */
async function cancelMakeUpRequest(req, res) {
  try {
    const { makeUpId } = req.params;
    const studentId = req.session.user.user_id;

    const request = await makeUpRequestService.cancelMakeUpRequest(makeUpId, studentId);
    
    res.json({
      success: true,
      message: 'Make-up request cancelled successfully',
      data: request
    });
  } catch (error) {
    console.error('Cancel Make-up Request Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets make-up statistics
 * GET /api/nstp/make-up-requests/:deploymentId/statistics
 */
async function getMakeUpStatistics(req, res) {
  try {
    const { deploymentId } = req.params;
    const stats = await makeUpRequestService.getMakeUpStatistics(deploymentId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get Make-up Statistics Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getMakeUpRequests,
  getStudentMakeUpRequests,
  createMakeUpRequest,
  reviewMakeUpRequest,
  recordMakeUpCompletion,
  cancelMakeUpRequest,
  getMakeUpStatistics,
  // Aliases for route compatibility
  getMyMakeUpRequests: getStudentMakeUpRequests,
  getDeploymentMakeUpRequests: getMakeUpRequests,
  approveMakeUpRequest: async (req, res) => {
    req.body = { ...req.body, status: 'approved' };
    return reviewMakeUpRequest(req, res);
  },
  rejectMakeUpRequest: async (req, res) => {
    req.body = { ...req.body, status: 'rejected' };
    return reviewMakeUpRequest(req, res);
  },
  completeMakeUpRequest: recordMakeUpCompletion
};