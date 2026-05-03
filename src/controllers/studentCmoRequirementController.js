const { 
  getStudentCmoRequirements, 
  uploadCmoRequirement, 
  getCmoRequirementsStatus 
} = require('../services/studentCmoRequirementService');
const { validateFile } = require('../services/fileUploadService');
const { isValidRequirementType, getRequirementInfo } = require('../utils/requirementTypes');

/**
 * GET /api/student/cmo-requirements
 * Returns all CMO requirement records for the logged-in student
 */
async function getCmoRequirements(req, res) {
  try {
    const userId = req.user.user_id;
    
    const requirements = await getStudentCmoRequirements(userId);
    const requirementInfo = getRequirementInfo();

    // Merge requirement info with current status
    const enrichedRequirements = requirementInfo.map(info => {
      const current = requirements.find(req => req.requirement_type === info.type);
      return {
        ...info,
        ...current
      };
    });

    res.json({
      success: true,
      data: {
        requirements: enrichedRequirements
      }
    });
  } catch (error) {
    console.error('Get CMO requirements error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch CMO requirements'
    });
  }
}

/**
 * POST /api/student/cmo-requirements/upload
 * Uploads or replaces a CMO requirement file
 */
async function uploadCmoRequirementFile(req, res) {
  try {
    const userId = req.user.user_id;
    const { requirement_type } = req.body;
    const file = req.file;

    // Validate inputs
    if (!requirement_type) {
      return res.status(400).json({
        success: false,
        message: 'Requirement type is required'
      });
    }

    if (!isValidRequirementType(requirement_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid requirement type'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    // Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: fileValidation.error
      });
    }

    // Upload requirement
    const result = await uploadCmoRequirement(userId, requirement_type, file);

    res.json({
      success: true,
      message: 'Requirement uploaded successfully. Please wait for NSTP Official review.',
      data: result
    });
  } catch (error) {
    console.error('Upload CMO requirement error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload requirement'
    });
  }
}

/**
 * GET /api/student/cmo-requirements/status
 * Returns CMO requirements status summary
 */
async function getCmoRequirementsStatusSummary(req, res) {
  try {
    const userId = req.user.user_id;
    
    const statusSummary = await getCmoRequirementsStatus(userId);

    res.json({
      success: true,
      data: statusSummary
    });
  } catch (error) {
    console.error('Get CMO requirements status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch CMO requirements status'
    });
  }
}

module.exports = {
  getCmoRequirements,
  uploadCmoRequirementFile,
  getCmoRequirementsStatusSummary
};