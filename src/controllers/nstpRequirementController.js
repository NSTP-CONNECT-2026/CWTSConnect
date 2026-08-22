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

module.exports = {
  getRequirements,
  getStudentRequirements,
  reviewRequirementById,
  getRequirementFile,
  getComplianceSummary
};