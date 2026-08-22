/**
 * NSTPConnect - NSTP Requirement Service
 * Handles NSTP Official requirement compliance management operations
 */

const supabase = require('../config/supabaseClient');
const { STATUS_TYPES, CMO_COMPLIANCE_STATUS } = require('../utils/requirementTypes');
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

    // Get requirement counts for each student
    const studentsWithCounts = await Promise.all(
      students.map(async (student) => {
        const { data: requirements, error: reqError } = await supabase
          .from('student_cmo_requirements')
          .select('requirement_id, status, uploaded_at')
          .eq('user_id', student.user_id);

        if (reqError) {
          console.error('Error fetching requirements for student:', student.user_id, reqError.message);
          return {
            ...student,
            submitted_documents_count: 0,
            last_submission_date: null
          };
        }

        const submittedCount = requirements.filter(req => req.status !== STATUS_TYPES.NOT_SUBMITTED).length;
        const lastSubmission = requirements.length > 0 
          ? Math.max(...requirements.map(req => new Date(req.uploaded_at).getTime()))
          : null;

        return {
          ...student,
          submitted_documents_count: submittedCount,
          last_submission_date: lastSubmission ? new Date(lastSubmission).toISOString() : null
        };
      })
    );

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

    // Create a map of existing requirements
    const requirementMap = {};
    if (requirements) {
      requirements.forEach(req => {
        requirementMap[req.requirement_type] = req;
      });
    }

    // Define all required types
    const allRequirementTypes = [
      'notarized_parent_waiver',
      'validated_student_id',
      'valid_parent_id',
      'medical_certificate'
    ];

    // Build complete requirements array
    const completeRequirements = allRequirementTypes.map(type => {
      const existing = requirementMap[type];
      return {
        requirement_type: type,
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
      requirements: completeRequirements
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
    const { data: currentReq, error: fetchError } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('requirement_id', requirementId)
      .single();

    if (fetchError) {
      throw new Error('Requirement not found: ' + fetchError.message);
    }

    // Validate status transition
    if (!isValidStatusTransition(currentReq.status, status)) {
      throw new Error(`Cannot change status from ${currentReq.status} to ${status}`);
    }

    // Update requirement
    const updateData = {
      status: status,
      remarks: status === STATUS_TYPES.REJECTED ? remarks : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId
    };

    const { data: updatedReq, error: updateError } = await supabase
      .from('student_cmo_requirements')
      .update(updateData)
      .eq('requirement_id', requirementId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update requirement: ' + updateError.message);
    }

    // Update overall compliance status for the student
    await updateStudentComplianceStatus(currentReq.user_id);

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
    // Use the database function to update compliance status
    const { data, error } = await supabase
      .rpc('update_cmo_compliance_status', { student_user_id: studentId });

    if (error) {
      throw new Error('Failed to update compliance status: ' + error.message);
    }

    return data;
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
      .eq('role', 'student')
      .not('cmo_compliance_status', 'is', null);

    if (error) {
      throw new Error('Failed to fetch compliance data: ' + error.message);
    }

    return getComplianceSummary(students);
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

    // Generate signed URL for file access
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('student-cmo-requirements')
      .createSignedUrl(requirement.file_path, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Supabase Storage Error:', urlError);
      console.error('File Path:', requirement.file_path);
      console.error('Bucket:', 'student-cmo-requirements');
      throw new Error('Failed to generate file URL: ' + urlError.message);
    }

    return {
      requirement_id: requirement.requirement_id,
      file_name: requirement.file_name,
      file_type: requirement.file_type,
      file_size: requirement.file_size,
      file_url: signedUrl.signedUrl,
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