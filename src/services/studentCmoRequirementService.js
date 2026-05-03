const supabase = require('../config/supabaseClient');
const { 
  getAllRequirementTypes, 
  STATUS_TYPES, 
  CMO_COMPLIANCE_STATUS,
  isValidRequirementType 
} = require('../utils/requirementTypes');
const { uploadCmoRequirementFile, deleteCmoRequirementFile } = require('./fileUploadService');

/**
 * Gets all CMO requirements for a student
 * @param {string} userId - Student user ID
 * @returns {Promise<Array>} Array of requirements with status
 */
async function getStudentCmoRequirements(userId) {
  try {
    // Get existing requirements from database
    const { data: existingRequirements, error } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to fetch CMO requirements: ' + error.message);
    }

    // Create a map of existing requirements
    const requirementMap = {};
    if (existingRequirements) {
      existingRequirements.forEach(req => {
        requirementMap[req.requirement_type] = req;
      });
    }

    // Return all requirement types with their current status
    const allRequirementTypes = getAllRequirementTypes();
    return allRequirementTypes.map(type => {
      const existing = requirementMap[type];
      return {
        requirement_type: type,
        status: existing ? existing.status : STATUS_TYPES.NOT_SUBMITTED,
        file_name: existing ? existing.file_name : null,
        file_url: existing ? existing.file_url : null,
        file_size: existing ? existing.file_size : null,
        uploaded_at: existing ? existing.uploaded_at : null,
        remarks: existing ? existing.remarks : null,
        requirement_id: existing ? existing.requirement_id : null
      };
    });
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Uploads or updates a CMO requirement
 * @param {string} userId - Student user ID
 * @param {string} requirementType - Type of requirement
 * @param {object} file - Multer file object
 * @returns {Promise<object>} Upload result
 */
async function uploadCmoRequirement(userId, requirementType, file) {
  try {
    // Validate requirement type
    if (!isValidRequirementType(requirementType)) {
      throw new Error('Invalid requirement type');
    }

    // Check if requirement already exists and is approved
    const { data: existingReq, error: fetchError } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('user_id', userId)
      .eq('requirement_type', requirementType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error('Failed to check existing requirement: ' + fetchError.message);
    }

    // Don't allow replacement if already approved
    if (existingReq && existingReq.status === STATUS_TYPES.APPROVED) {
      throw new Error('Cannot replace approved requirement. Contact NSTP Official if changes are needed.');
    }

    // Upload file to Supabase Storage
    const uploadResult = await uploadCmoRequirementFile(
      file.buffer,
      file.originalname,
      userId,
      requirementType
    );

    // Delete old file if exists
    if (existingReq && existingReq.file_path) {
      await deleteCmoRequirementFile(existingReq.file_path);
    }

    // Prepare requirement data
    const requirementData = {
      user_id: userId,
      requirement_type: requirementType,
      file_name: uploadResult.fileName,
      file_path: uploadResult.filePath,
      file_url: uploadResult.fileUrl,
      file_type: file.mimetype,
      file_size: file.size,
      status: STATUS_TYPES.PENDING,
      remarks: null, // Clear old remarks on resubmission
      uploaded_at: new Date().toISOString()
    };

    let result;
    if (existingReq) {
      // Update existing requirement
      const { data, error } = await supabase
        .from('student_cmo_requirements')
        .update(requirementData)
        .eq('requirement_id', existingReq.requirement_id)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update requirement: ' + error.message);
      }
      result = data;
    } else {
      // Create new requirement
      const { data, error } = await supabase
        .from('student_cmo_requirements')
        .insert(requirementData)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to create requirement: ' + error.message);
      }
      result = data;
    }

    return result;
  } catch (error) {
    throw new Error('Upload service error: ' + error.message);
  }
}

/**
 * Gets CMO requirements status summary for a student
 * @param {string} userId - Student user ID
 * @returns {Promise<object>} Status summary
 */
async function getCmoRequirementsStatus(userId) {
  try {
    // Get all requirements
    const requirements = await getStudentCmoRequirements(userId);
    
    // Count by status
    const totalRequired = requirements.length;
    const submittedCount = requirements.filter(req => req.status !== STATUS_TYPES.NOT_SUBMITTED).length;
    const pendingCount = requirements.filter(req => req.status === STATUS_TYPES.PENDING).length;
    const approvedCount = requirements.filter(req => req.status === STATUS_TYPES.APPROVED).length;
    const rejectedCount = requirements.filter(req => req.status === STATUS_TYPES.REJECTED).length;

    // Determine overall status
    let overallStatus;
    if (rejectedCount > 0) {
      overallStatus = CMO_COMPLIANCE_STATUS.REJECTED;
    } else if (approvedCount === totalRequired) {
      overallStatus = CMO_COMPLIANCE_STATUS.COMPLIANT;
    } else if (submittedCount === totalRequired) {
      overallStatus = CMO_COMPLIANCE_STATUS.PENDING_REVIEW;
    } else {
      overallStatus = CMO_COMPLIANCE_STATUS.INCOMPLETE;
    }

    return {
      total_required: totalRequired,
      submitted_count: submittedCount,
      pending_count: pendingCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      overall_status: overallStatus,
      requirements: requirements
    };
  } catch (error) {
    throw new Error('Status service error: ' + error.message);
  }
}

/**
 * Updates user's CMO compliance status
 * @param {string} userId - Student user ID
 * @returns {Promise<string>} Updated status
 */
async function updateUserCmoComplianceStatus(userId) {
  try {
    const { data, error } = await supabase
      .rpc('update_cmo_compliance_status', { student_user_id: userId });

    if (error) {
      throw new Error('Failed to update CMO compliance status: ' + error.message);
    }

    return data;
  } catch (error) {
    console.error('CMO compliance status update error:', error.message);
    return null;
  }
}

module.exports = {
  getStudentCmoRequirements,
  uploadCmoRequirement,
  getCmoRequirementsStatus,
  updateUserCmoComplianceStatus
};