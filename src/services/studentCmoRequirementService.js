const supabase = require('../config/supabaseClient');
const { 
  getAllRequirementTypes, 
  STATUS_TYPES, 
  CMO_COMPLIANCE_STATUS,
  isValidRequirementType 
} = require('../utils/requirementTypes');
const { getActiveRequirements } = require('./requirementConfigService');
const { 
  getCustomRequirementsForUser, 
  saveCustomRequirement 
} = require('./customStudentRequirementStorage');
const { uploadCmoRequirementFile, deleteCmoRequirementFile } = require('./fileUploadService');

/**
 * Gets all CMO requirements for a student
 * Dynamically driven by active requirements configured by NSTP Coordinator
 * @param {string} userId - Student user ID
 * @returns {Promise<Array>} Array of requirements with status
 */
async function getStudentCmoRequirements(userId) {
  try {
    // 1. Get existing requirements from Supabase database
    const { data: existingRequirements, error } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[studentCmoRequirementService] Supabase fetch notice:', error.message);
    }

    // 2. Get local custom records fallback
    const customReqs = getCustomRequirementsForUser(userId);

    // Create a unified map of existing requirement records
    const requirementMap = {};
    if (existingRequirements) {
      existingRequirements.forEach(req => {
        requirementMap[req.requirement_type] = req;
      });
    }
    if (customReqs) {
      customReqs.forEach(req => {
        requirementMap[req.requirement_type] = req;
      });
    }

    // 3. Return all currently active requirements configured by Coordinator
    const activeReqs = getActiveRequirements();
    return activeReqs.map(reqDef => {
      const existing = requirementMap[reqDef.code];
      return {
        requirement_type: reqDef.code,
        type: reqDef.code,
        displayName: reqDef.name,
        name: reqDef.name,
        description: reqDef.description,
        is_required: reqDef.is_required !== false,
        status: existing ? existing.status : STATUS_TYPES.NOT_SUBMITTED,
        file_name: existing ? existing.file_name : null,
        file_url: existing ? existing.file_url : null,
        file_path: existing ? existing.file_path : null,
        file_size: existing ? existing.file_size : null,
        file_type: existing ? existing.file_type : null,
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
 * Allows students to submit all requirements through images (JPG, PNG, WEBP, etc.) or PDF
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

    // Check existing in Supabase
    const { data: existingReq, error: fetchError } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('user_id', userId)
      .eq('requirement_type', requirementType)
      .single();

    // Check existing in custom storage fallback
    const customList = getCustomRequirementsForUser(userId);
    const existingCustom = customList.find(r => r.requirement_type === requirementType);
    const currentRecord = existingReq || existingCustom;

    // Don't allow replacement if already approved
    if (currentRecord && currentRecord.status === STATUS_TYPES.APPROVED) {
      throw new Error('Cannot replace approved requirement. Contact NSTP Coordinator if changes are needed.');
    }

    // Upload file to Cloudinary (or Supabase Storage fallback)
    const uploadResult = await uploadCmoRequirementFile(
      file.buffer,
      file.originalname,
      userId,
      requirementType
    );

    // Delete old file if exists
    if (currentRecord && currentRecord.file_path) {
      try {
        await deleteCmoRequirementFile(currentRecord.file_path);
      } catch (_) {}
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
      remarks: null,
      uploaded_at: new Date().toISOString()
    };

    let result;
    try {
      if (existingReq) {
        // Update existing in Supabase
        const { data, error } = await supabase
          .from('student_cmo_requirements')
          .update(requirementData)
          .eq('requirement_id', existingReq.requirement_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new in Supabase
        const { data, error } = await supabase
          .from('student_cmo_requirements')
          .insert(requirementData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }
    } catch (dbError) {
      // If DB has check constraint on requirement_type, fallback to local storage adapter
      if (dbError.message && dbError.message.includes('check constraint')) {
        console.warn(`[Storage Fallback] Supabase CHECK constraint detected for "${requirementType}". Persisting locally.`);
        result = saveCustomRequirement({
          ...requirementData,
          requirement_id: currentRecord?.requirement_id || 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
        });
      } else {
        throw dbError;
      }
    }

    // Synchronize overall CMO compliance status in users table
    try {
      const statusSummary = await getCmoRequirementsStatus(userId);
      await supabase
        .from('users')
        .update({ cmo_compliance_status: statusSummary.overall_status })
        .eq('user_id', userId);
    } catch (statusSyncError) {
      console.warn('Could not sync user cmo_compliance_status:', statusSyncError.message);
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
    // Get all active requirements
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
    } else if (totalRequired > 0 && approvedCount >= totalRequired) {
      overallStatus = CMO_COMPLIANCE_STATUS.COMPLIANT;
    } else if (totalRequired > 0 && submittedCount >= totalRequired) {
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
    const summary = await getCmoRequirementsStatus(userId);
    await supabase
      .from('users')
      .update({ cmo_compliance_status: summary.overall_status })
      .eq('user_id', userId);
    return summary.overall_status;
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
