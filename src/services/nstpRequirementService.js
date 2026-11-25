/**
 * NSTPConnect - NSTP Requirement Service
 * Handles NSTP Official requirement compliance management operations
 */

const supabase = require('../config/supabaseClient');
const { STATUS_TYPES, CMO_COMPLIANCE_STATUS } = require('../utils/requirementTypes');
const { getActiveRequirements } = require('./requirementConfigService');
const { 
  getCustomRequirementsForUser, 
  getCustomRequirementById, 
  updateCustomRequirementStatus 
} = require('./customStudentRequirementStorage');
const { 
  computeOverallComplianceStatus, 
  getComplianceSummary,
  isValidStatusTransition 
} = require('../utils/complianceStatusUtils');

/**
 * Gets all students with CMO requirement submissions for NSTP Official dashboard
 * @param {object} filters - Optional filters (status, search)
 * @returns {Promise<Array>} Array of students with requirement data
 */
async function getAllStudentsWithRequirements(filters = {}) {
  try {
    let query = supabase
      .from('users')
      .select(`
        user_id,
        email,
        cmo_compliance_status,
        created_at,
        student_profiles (
          full_name,
          student_number,
          course,
          year_level,
          section,
          nstp_component
        )
      `)
      .eq('role', 'student')
      .not('student_profiles', 'is', null);

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('cmo_compliance_status', filters.status);
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`
        student_profiles.full_name.ilike.%${filters.search}%,
        student_profiles.student_number.ilike.%${filters.search}%,
        student_profiles.course.ilike.%${filters.search}%
      `);
    }

    const { data: students, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch students: ' + error.message);
    }

    if (!students || students.length === 0) {
      return [];
    }

    // Batch fetch all requirements for returned students in a single query (eliminates N+1 latency)
    const studentIds = students.map(s => s.user_id);
    const { data: allRequirements, error: reqError } = await supabase
      .from('student_cmo_requirements')
      .select('requirement_id, user_id, status, uploaded_at')
      .in('user_id', studentIds);

    if (reqError) {
      console.error('Error batch fetching requirements:', reqError.message);
    }

    const reqsByUser = new Map();
    (allRequirements || []).forEach(req => {
      if (!reqsByUser.has(req.user_id)) {
        reqsByUser.set(req.user_id, []);
      }
      reqsByUser.get(req.user_id).push(req);
    });

    const activeConfig = getActiveRequirements();
    const dynamicTotalRequired = activeConfig.length > 0 ? activeConfig.length : 4;

    // Map requirement counts in memory
    const studentsWithCounts = students.map((student) => {
      const dbReqs = reqsByUser.get(student.user_id) || [];
      const customReqs = getCustomRequirementsForUser(student.user_id) || [];
      const reqs = [...dbReqs, ...customReqs];

      const approvedCount = reqs.filter(req => req.status === STATUS_TYPES.APPROVED).length;
      const pendingCount = reqs.filter(req => req.status === STATUS_TYPES.PENDING).length;
      const rejectedCount = reqs.filter(req => req.status === STATUS_TYPES.REJECTED).length;
      const submittedCount = reqs.filter(req => req.status && req.status !== STATUS_TYPES.NOT_SUBMITTED).length;
      const lastSubmission = reqs.length > 0 
        ? Math.max(...reqs.map(req => new Date(req.uploaded_at).getTime()))
        : null;

      let profileData = {};
      if (Array.isArray(student.student_profiles)) {
        profileData = student.student_profiles[0] || {};
      } else if (student.student_profiles && typeof student.student_profiles === 'object') {
        profileData = student.student_profiles;
      }

      const computedStatus = student.cmo_compliance_status || (approvedCount >= dynamicTotalRequired ? 'compliant' : (submittedCount >= dynamicTotalRequired ? 'pending_review' : 'incomplete'));

      return {
        ...student,
        student_id: student.user_id,
        profile: profileData,
        compliance_status: computedStatus,
        approved_count: approvedCount,
        pending_count: pendingCount,
        rejected_count: rejectedCount,
        submitted_documents_count: submittedCount,
        total_required: dynamicTotalRequired,
        last_submission_date: lastSubmission ? new Date(lastSubmission).toISOString() : null
      };
    });

    return studentsWithCounts;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets detailed CMO requirements for a specific student
 * @param {string} studentId - Student user ID
 * @returns {Promise<object>} Student details with requirements
 */
async function getStudentRequirementDetails(studentId) {
  try {
    // Get student information
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        cmo_compliance_status,
        student_profiles (
          full_name,
          student_number,
          course,
          year_level,
          section,
          nstp_component
        )
      `)
      .eq('user_id', studentId)
      .eq('role', 'student')
      .single();

    if (studentError) {
      throw new Error('Student not found: ' + studentError.message);
    }

    // Get all requirements for this student
    const { data: requirements, error: reqError } = await supabase
      .from('student_cmo_requirements')
      .select(`
        requirement_id,
        requirement_type,
        file_name,
        file_path,
        file_url,
        file_type,
        file_size,
        status,
        remarks,
        uploaded_at,
        reviewed_at,
        reviewed_by
      `)
      .eq('user_id', studentId);

    if (reqError) {
      throw new Error('Failed to fetch requirements: ' + reqError.message);
    }

    // Create a map of existing requirements (Supabase + local custom records)
    const requirementMap = {};
    if (requirements) {
      requirements.forEach(req => {
        requirementMap[req.requirement_type] = req;
      });
    }
    const customReqs = getCustomRequirementsForUser(studentId) || [];
    customReqs.forEach(req => {
      requirementMap[req.requirement_type] = req;
    });

    // Dynamically retrieve coordinator-configured active requirements
    const activeConfig = getActiveRequirements();

    // Build complete requirements array
    const completeRequirements = activeConfig.map(reqDef => {
      const type = reqDef.code;
      const existing = requirementMap[type];
      return {
        requirement_type: type,
        type: type,
        key: type,
        name: reqDef.name,
        displayName: reqDef.name,
        desc: reqDef.description,
        description: reqDef.description,
        is_required: reqDef.is_required !== false,
        order: reqDef.order || 0,
        requirement_id: existing ? existing.requirement_id : null,
        file_name: existing ? existing.file_name : null,
        file_path: existing ? existing.file_path : null,
        file_url: existing ? existing.file_url : null,
        file_type: existing ? existing.file_type : null,
        file_size: existing ? existing.file_size : null,
        status: existing ? existing.status : STATUS_TYPES.NOT_SUBMITTED,
        remarks: existing ? existing.remarks : null,
        uploaded_at: existing ? existing.uploaded_at : null,
        reviewed_at: existing ? existing.reviewed_at : null,
        reviewed_by: existing ? existing.reviewed_by : null
      };
    });

    return {
      student: student,
      requirements: completeRequirements,
      configured_requirements: activeConfig,
      total_required: activeConfig.length
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Reviews a specific requirement (approve or reject)
 * @param {string} requirementId - Requirement ID
 * @param {string} reviewerId - NSTP Official user ID
 * @param {string} status - New status (approved or rejected)
 * @param {string} remarks - Optional remarks (required for rejection)
 * @returns {Promise<object>} Updated requirement
 */
async function reviewRequirement(requirementId, reviewerId, status, remarks = null) {
  try {
    // Validate status
    if (status !== STATUS_TYPES.APPROVED && status !== STATUS_TYPES.REJECTED) {
      throw new Error('Invalid status. Must be approved or rejected.');
    }

    // Validate remarks for rejection
    if (status === STATUS_TYPES.REJECTED && (!remarks || remarks.trim() === '')) {
      throw new Error('Remarks are required when rejecting a requirement.');
    }

    // Get current requirement
    let currentReq = null;
    let isCustomStorage = false;

    const { data: dbReq, error: fetchError } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('requirement_id', requirementId)
      .single();

    if (dbReq) {
      currentReq = dbReq;
    } else {
      const customReq = getCustomRequirementById(requirementId);
      if (customReq) {
        currentReq = customReq;
        isCustomStorage = true;
      } else {
        throw new Error('Requirement not found: ' + (fetchError ? fetchError.message : 'Invalid ID'));
      }
    }

    // Validate status transition
    if (!isValidStatusTransition(currentReq.status, status)) {
      throw new Error(`Cannot change status from ${currentReq.status} to ${status}`);
    }

    // Update requirement
    let updatedReq;
    if (isCustomStorage) {
      updatedReq = updateCustomRequirementStatus(requirementId, status, remarks, reviewerId);
    } else {
      const updateData = {
        status: status,
        remarks: status === STATUS_TYPES.REJECTED ? remarks : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId
      };

      const { data, error: updateError } = await supabase
        .from('student_cmo_requirements')
        .update(updateData)
        .eq('requirement_id', requirementId)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update requirement: ' + updateError.message);
      }
      updatedReq = data;
    }

    // Update overall compliance status for the student
    await updateStudentComplianceStatus(currentReq.user_id);

    // Notify student about requirement review outcome
    try {
      const notificationService = require('./notificationService');
      const isApproved = status === STATUS_TYPES.APPROVED;
      const formattedType = (currentReq.requirement_type || 'requirement').replace(/_/g, ' ');
      await notificationService.createNotification({
        user_id: currentReq.user_id,
        notification_type: isApproved ? 'requirement_approved' : 'requirement_rejected',
        title: isApproved ? 'Requirement Verified' : 'Requirement Needs Attention',
        message: isApproved
          ? `Your CMO requirement (${formattedType}) has been verified and approved by the NSTP Coordinator.`
          : `Your submitted CMO requirement (${formattedType}) was rejected. Remarks: ${remarks || 'Please re-upload valid document.'}`,
        action_url: 'cmo-requirements.html',
        action_label: 'View Requirements'
      });
    } catch (notifErr) {
      console.warn('Failed to send requirement notification:', notifErr.message);
    }

    return updatedReq;
  } catch (error) {
    throw new Error('Review service error: ' + error.message);
  }
}

/**
 * Updates a student's overall CMO compliance status
 * @param {string} studentId - Student user ID
 * @returns {Promise<string>} Updated compliance status
 */
async function updateStudentComplianceStatus(studentId) {
  try {
    const { getCmoRequirementsStatus } = require('./studentCmoRequirementService');
    const summary = await getCmoRequirementsStatus(studentId);
    
    await supabase
      .from('users')
      .update({ cmo_compliance_status: summary.overall_status })
      .eq('user_id', studentId);

    return summary.overall_status;
  } catch (error) {
    console.error('Compliance status update error:', error.message);
    throw error;
  }
}

/**
 * Gets compliance summary statistics for dashboard
 * @returns {Promise<object>} Summary statistics
 */
async function getComplianceSummaryStats() {
  try {
    // Get all students with their compliance status
    const { data: students, error } = await supabase
      .from('users')
      .select('user_id, cmo_compliance_status')
      .eq('role', 'student');

    if (error) {
      throw new Error('Failed to fetch compliance data: ' + error.message);
    }

    const allStudents = students || [];
    const totalStudents = allStudents.length;
    const compliantCount = allStudents.filter(s => s.cmo_compliance_status === 'compliant').length;
    const pendingCount = allStudents.filter(s => s.cmo_compliance_status === 'pending_review').length;
    const nonCompliantCount = allStudents.filter(s => !s.cmo_compliance_status || s.cmo_compliance_status === 'incomplete' || s.cmo_compliance_status === 'non_compliant' || s.cmo_compliance_status === 'rejected').length;

    const summary = getComplianceSummary(allStudents);

    return {
      ...summary,
      total_students: totalStudents,
      compliant_students: compliantCount,
      pending_review: pendingCount,
      non_compliant_students: nonCompliantCount,
      totalStudentsWithSubmissions: totalStudents - nonCompliantCount,
      compliantStudents: compliantCount,
      pendingReview: pendingCount,
      incompleteSubmissions: nonCompliantCount
    };
  } catch (error) {
    throw new Error('Summary service error: ' + error.message);
  }
}

/**
 * Gets secure file URL for requirement file
 * @param {string} requirementId - Requirement ID
 * @param {string} requesterId - User ID requesting the file
 * @returns {Promise<object>} File information with secure URL
 */
async function getRequirementFileUrl(requirementId, requesterId) {
  try {
    // Get requirement details
    const { data: requirement, error } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('requirement_id', requirementId)
      .single();

    if (error) {
      throw new Error('Requirement not found: ' + error.message);
    }

    // Verify requester has access (NSTP Official or file owner)
    const { data: requester, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', requesterId)
      .single();

    if (userError) {
      throw new Error('User not found: ' + userError.message);
    }

    const hasAccess = requester.role === 'nstp_official' || requirement.user_id === requesterId;
    if (!hasAccess) {
      throw new Error('Access denied to this file');
    }

    // If requirement already has a full HTTP/HTTPS URL (e.g. from Cloudinary or public storage), use it directly
    let fileUrl = requirement.file_url;

    if (!fileUrl || !fileUrl.startsWith('http')) {
      // Generate signed URL for file access from Supabase storage
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('student-cmo-requirements')
        .createSignedUrl(requirement.file_path, 3600); // 1 hour expiry

      if (urlError) {
        console.error('Supabase Storage Error:', urlError);
        console.error('File Path:', requirement.file_path);
        console.error('Bucket:', 'student-cmo-requirements');
        throw new Error('Failed to generate file URL: ' + urlError.message);
      }
      fileUrl = signedUrl.signedUrl;
    }

    return {
      requirement_id: requirement.requirement_id,
      file_name: requirement.file_name,
      file_type: requirement.file_type,
      file_size: requirement.file_size,
      file_url: fileUrl,
      uploaded_at: requirement.uploaded_at
    };
  } catch (error) {
    throw new Error('File service error: ' + error.message);
  }
}

module.exports = {
  getAllStudentsWithRequirements,
  getStudentRequirementDetails,
  reviewRequirement,
  updateStudentComplianceStatus,
  getComplianceSummaryStats,
  getRequirementFileUrl
};