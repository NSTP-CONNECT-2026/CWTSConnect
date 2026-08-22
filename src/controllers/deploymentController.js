/**
 * NSTPConnect - Deployment Controller
 * Handles deployment management HTTP requests and responses
 */

const deploymentService = require('../services/deploymentService');

/**
 * Gets deployment dashboard summary statistics
 * GET /api/nstp/deployments/summary
 */
async function getDeploymentDashboardSummary(req, res) {
  try {
    const summary = await deploymentService.getDeploymentDashboardSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Deployment Dashboard Summary Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets all deployments with optional filtering
 * GET /api/nstp/deployments
 */
async function getDeployments(req, res) {
  try {
    const options = {
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    const deployments = await deploymentService.getDeployments(options);
    
    res.json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error('Get Deployments Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets deployable requests (approved requests available for deployment)
 * GET /api/nstp/deployments/deployable-requests
 */
async function getDeployableRequests(req, res) {
  try {
    const requests = await deploymentService.getDeployableRequests();
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get Deployable Requests Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets DSS recommendations for deployment assignment
 * GET /api/nstp/deployments/request/:requestId/recommendations
 */
async function getDSSRecommendationsForDeployment(req, res) {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const recommendations = await deploymentService.getDSSRecommendationsForDeployment(requestId);
    
    res.json({
      success: true,
      data: {
        request_id: requestId,
        total_recommendations: recommendations.length,
        recommendations: recommendations
      }
    });
  } catch (error) {
    console.error('Get DSS Recommendations Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Creates a new deployment assignment
 * POST /api/nstp/deployments/create
 */
async function createDeployment(req, res) {
  try {
    const deploymentData = req.body;
    const assignedBy = req.session.user.user_id;

    if (!deploymentData) {
      return res.status(400).json({
        success: false,
        message: 'Deployment data is required'
      });
    }

    const newDeployment = await deploymentService.createDeployment(deploymentData, assignedBy);
    
    res.status(201).json({
      success: true,
      message: 'Deployment created successfully',
      data: newDeployment
    });
  } catch (error) {
    console.error('Create Deployment Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets deployment details by ID
 * GET /api/nstp/deployments/:deploymentId
 */
async function getDeploymentDetails(req, res) {
  try {
    const { deploymentId } = req.params;

    if (!deploymentId) {
      return res.status(400).json({
        success: false,
        message: 'Deployment ID is required'
      });
    }

    const deployment = await deploymentService.getDeploymentDetails(deploymentId);
    
    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    console.error('Get Deployment Details Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Updates deployment status
 * PUT /api/nstp/deployments/:deploymentId/status
 */
async function updateDeploymentStatus(req, res) {
  try {
    const { deploymentId } = req.params;
    const { status } = req.body;
    const updatedBy = req.session.user.user_id;

    if (!deploymentId) {
      return res.status(400).json({
        success: false,
        message: 'Deployment ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'New status is required'
      });
    }

    const updatedDeployment = await deploymentService.updateDeploymentStatus(
      deploymentId, 
      status, 
      updatedBy
    );
    
    res.json({
      success: true,
      message: `Deployment status updated to ${status}`,
      data: updatedDeployment
    });
  } catch (error) {
    console.error('Update Deployment Status Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets student's current deployment status
 * GET /api/nstp/deployments/student/:studentId/current
 */
async function getStudentCurrentDeployment(req, res) {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const deployment = await deploymentService.getStudentCurrentDeployment(studentId);
    
    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    console.error('Get Student Current Deployment Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Checks if student has active deployment
 * GET /api/nstp/deployments/student/:studentId/check-active
 */
async function checkStudentActiveDeployment(req, res) {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const hasActiveDeployment = await deploymentService.checkStudentActiveDeployment(studentId);
    
    res.json({
      success: true,
      data: {
        student_id: studentId,
        has_active_deployment: hasActiveDeployment
      }
    });
  } catch (error) {
    console.error('Check Student Active Deployment Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getDeploymentDashboardSummary,
  getDeployments,
  getDeployableRequests,
  getDSSRecommendationsForDeployment,
  createDeployment,
  getDeploymentDetails,
  updateDeploymentStatus,
  getStudentCurrentDeployment,
  checkStudentActiveDeployment
};