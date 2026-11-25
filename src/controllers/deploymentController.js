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
 * GET /api/nstp/deployments/recommendations/:requestId
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

    let customWeights = undefined;
    if (req.query && (req.query.w_loc !== undefined || req.query.w_skill !== undefined)) {
      customWeights = {
        location: req.query.w_loc !== undefined ? parseFloat(req.query.w_loc) : 0.30,
        skills: req.query.w_skill !== undefined ? parseFloat(req.query.w_skill) : 0.70
      };
    }

    const recommendations = await deploymentService.getDSSRecommendationsForDeployment(requestId, customWeights);
    
    // Provide both direct Array in data and wrapped object for maximum compatibility
    res.json({
      success: true,
      data: recommendations,
      recommendations: recommendations,
      total_recommendations: recommendations.length,
      request_id: requestId
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
 * POST /api/nstp/deployments
 * POST /api/nstp/deployments/create
 */
async function createDeployment(req, res) {
  try {
    const deploymentData = req.body;
    const assignedBy = req.session?.user?.user_id || req.user?.user_id;

    if (!deploymentData) {
      return res.status(400).json({
        success: false,
        message: 'Deployment data is required'
      });
    }

    if (!assignedBy) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Session user ID missing'
      });
    }

    const newDeployment = await deploymentService.createDeployment(deploymentData, assignedBy);
    
    // Audit log
    try {
      const { logAction } = require('../services/auditLogger');
      logAction({
        actorId: assignedBy,
        actorName: req.session?.user?.full_name || req.session?.user?.email || 'NSTP Coordinator',
        actorRole: 'nstp_official',
        actionType: 'DEPLOYMENT_CREATED',
        targetType: 'deployment',
        targetId: newDeployment?.deployment_id || 'N/A',
        targetName: `Deployment for Request #${deploymentData.request_id || ''}`,
        description: `Created deployment assignment for request #${deploymentData.request_id || ''} with ${deploymentData.student_user_ids?.length || 0} students assigned.`,
        req
      });
    } catch (e) {}

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
 * PATCH /api/nstp/deployments/:deploymentId/status
 * PUT /api/nstp/deployments/:deploymentId/status
 */
async function updateDeploymentStatus(req, res) {
  try {
    const { deploymentId } = req.params;
    const { status } = req.body;
    const updatedBy = req.session?.user?.user_id || req.user?.user_id;

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

    const targetDate = req.query.targetDate || req.query.date || req.query.deployment_start_date || null;
    const targetSchedule = req.query.targetSchedule || req.query.schedule || req.query.preferred_schedule || '';
    const hasActiveDeployment = await deploymentService.checkStudentActiveDeployment(studentId, targetDate, targetSchedule);
    
    res.json({
      success: true,
      data: {
        student_id: studentId,
        has_active_deployment: hasActiveDeployment,
        target_date: targetDate,
        target_schedule: targetSchedule
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