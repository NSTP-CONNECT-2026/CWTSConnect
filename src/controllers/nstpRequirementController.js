/**
 * NSTPConnect - NSTP Requirement Controller
 * Handles NSTP Official requirement compliance management requests
 */

const {
  getAllStudentsWithRequirements,
  getStudentRequirementDetails,
  reviewRequirement,
  getComplianceSummaryStats,
  getRequirementFileUrl
} = require('../services/nstpRequirementService');
const {
  getAllRequirementsConfig,
  getActiveRequirements,
  addRequirement,
  updateRequirement,
  deleteRequirement,
  resetToDefaults
} = require('../services/requirementConfigService');

/**
 * GET /api/nstp/requirements
 * Gets all students with CMO requirement records and compliance summary
 */
async function getRequirements(req, res) {
  try {
    const { status, search } = req.query;
    
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (search && search.trim() !== '') {
      filters.search = search.trim();
    }

    const students = await getAllStudentsWithRequirements(filters);

    res.json({
      success: true,
      data: students,
      message: 'Students with requirements fetched successfully'
    });
  } catch (error) {
    console.error('Get requirements error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requirements: ' + error.message
    });
  }
}

/**
 * GET /api/nstp/requirements/:studentId
 * Gets detailed requirement records of one student
 */
async function getStudentRequirements(req, res) {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const studentDetails = await getStudentRequirementDetails(studentId);

    res.json({
      success: true,
      data: studentDetails,
      message: 'Student requirements fetched successfully'
    });
  } catch (error) {
    console.error('Get student requirements error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch student requirements: ' + error.message
    });
  }
}

/**
 * PUT /api/nstp/requirements/:requirementId/review
 * Approve or reject one requirement
 */
async function reviewRequirementById(req, res) {
  try {
    const { requirementId } = req.params;
    const { status, remarks } = req.body;
    const reviewerId = req.session.user.user_id;

    if (!requirementId) {
      return res.status(400).json({
        success: false,
        message: 'Requirement ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updatedRequirement = await reviewRequirement(
      requirementId,
      reviewerId,
      status,
      remarks
    );

    // Audit log
    try {
      const { logAction } = require('../services/auditLogger');
      logAction({
        actorId: reviewerId,
        actorName: req.session.user?.full_name || req.session.user?.email || 'NSTP Coordinator',
        actorRole: 'nstp_official',
        actionType: status.toLowerCase() === 'approved' ? 'CMO_APPROVED' : 'CMO_REJECTED',
        targetType: 'requirement',
        targetId: requirementId,
        targetName: updatedRequirement?.requirement_type || 'CMO Requirement',
        description: `${status.toLowerCase() === 'approved' ? 'Approved' : 'Rejected'} requirement (${updatedRequirement?.requirement_type || 'CMO Document'}). Remarks: "${remarks || 'None'}"`,
        req
      });
    } catch (e) {}

    res.json({
      success: true,
      data: updatedRequirement,
      message: 'Requirement reviewed successfully'
    });
  } catch (error) {
    console.error('Review requirement error:', error.message);
    
    if (error.message.includes('Invalid status') || 
        error.message.includes('Remarks are required') ||
        error.message.includes('Cannot change status')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to review requirement: ' + error.message
    });
  }
}

/**
 * GET /api/nstp/requirements/file/:requirementId
 * Get secure preview or download URL for uploaded requirement file
 */
async function getRequirementFile(req, res) {
  try {
    const { requirementId } = req.params;
    const requesterId = req.session.user.user_id;

    if (!requirementId) {
      return res.status(400).json({
        success: false,
        message: 'Requirement ID is required'
      });
    }

    const fileInfo = await getRequirementFileUrl(requirementId, requesterId);

    res.json({
      success: true,
      data: fileInfo,
      message: 'File URL generated successfully'
    });
  } catch (error) {
    console.error('Get requirement file error:', error.message);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get file URL: ' + error.message
    });
  }
}

/**
 * GET /api/nstp/compliance-summary
 * Get dashboard summary counts
 */
async function getComplianceSummary(req, res) {
  try {
    const summary = await getComplianceSummaryStats();

    res.json({
      success: true,
      data: summary,
      message: 'Compliance summary fetched successfully'
    });
  } catch (error) {
    console.error('Get compliance summary error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance summary: ' + error.message
    });
  }
}

/**
 * GET /api/nstp/requirements-config
 * Gets all configured requirements (both active and inactive)
 */
async function getRequirementsConfig(req, res) {
  try {
    const all = getAllRequirementsConfig();
    const active = getActiveRequirements();

    res.json({
      success: true,
      data: {
        requirements: all,
        active: active,
        total_active: active.length
      },
      message: 'Requirements configuration fetched successfully'
    });
  } catch (error) {
    console.error('Get requirements config error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requirements configuration: ' + error.message
    });
  }
}

/**
 * POST /api/nstp/requirements-config
 * Adds a new requirement definition
 */
async function createRequirementConfig(req, res) {
  try {
    const { name, description, code, is_required } = req.body;
    const actorId = req.user ? req.user.user_id : 'coordinator';

    const newReq = addRequirement({ name, description, code, is_required }, actorId);

    res.status(201).json({
      success: true,
      data: newReq,
      message: `Requirement "${newReq.name}" added successfully.`
    });
  } catch (error) {
    console.error('Create requirement config error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * PUT /api/nstp/requirements-config/:code
 * Updates an existing requirement definition
 */
async function updateRequirementConfig(req, res) {
  try {
    const { code } = req.params;
    const updates = req.body;
    const actorId = req.user ? req.user.user_id : 'coordinator';

    const updated = updateRequirement(code, updates, actorId);

    res.json({
      success: true,
      data: updated,
      message: `Requirement "${updated.name}" updated successfully.`
    });
  } catch (error) {
    console.error('Update requirement config error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * DELETE /api/nstp/requirements-config/:code
 * Deletes or deactivates a requirement definition
 */
async function deleteRequirementConfig(req, res) {
  try {
    const { code } = req.params;
    const actorId = req.user ? req.user.user_id : 'coordinator';

    const removed = deleteRequirement(code, actorId);

    res.json({
      success: true,
      data: removed,
      message: `Requirement "${removed.name}" removed successfully.`
    });
  } catch (error) {
    console.error('Delete requirement config error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * POST /api/nstp/requirements-config/reset
 * Resets requirements configuration back to standard defaults
 */
async function resetRequirementsConfig(req, res) {
  try {
    const actorId = req.user ? req.user.user_id : 'coordinator';
    const defaults = resetToDefaults(actorId);

    res.json({
      success: true,
      data: defaults,
      message: 'Requirements configuration reset to standard defaults.'
    });
  } catch (error) {
    console.error('Reset requirements config error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getRequirements,
  getStudentRequirements,
  reviewRequirementById,
  getRequirementFile,
  getComplianceSummary,
  getRequirementsConfig,
  createRequirementConfig,
  updateRequirementConfig,
  deleteRequirementConfig,
  resetRequirementsConfig
};