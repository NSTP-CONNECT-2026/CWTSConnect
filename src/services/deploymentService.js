/**
 * NSTPConnect - Deployment Service
 * Handles deployment management business logic
 */

const supabase = require('../config/supabaseClient');
const { 
  validateDeploymentCreation,
  validateDeploymentStatusUpdate,
  validateStudentEligibility,
  validateDeploymentCapacity
} = require('../utils/deploymentValidators');

/**
 * Gets deployment dashboard summary statistics
 * @returns {Promise<object>} Dashboard summary data
 */
async function getDeploymentDashboardSummary() {
  try {
    const { data, error } = await supabase
      .rpc('get_deployment_dashboard_summary');

    if (error) {
      throw new Error('Failed to fetch deployment dashboard summary: ' + error.message);
    }

    return data[0] || {
      total_deployments: 0,
      active_deployments: 0,
      completed_deployments: 0,
      pending_deployments: 0,
      assigned_students: 0
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets all deployments with pagination
 * @param {object} options - Query options
 * @returns {Promise<Array>} Array of deployments
 */
async function getDeployments(options = {}) {
  try {
    let query = supabase
      .from('deployment_management_view')
      .select('*');

    // Apply status filter
    if (options.status && options.status !== 'all') {
      query = query.eq('deployment_status', options.status);
    }

    // Apply search filter
    if (options.search) {
      query = query.or(`
        deployment_batch_name.ilike.%${options.search}%,
        community_name.ilike.%${options.search}%,
        activity_title.ilike.%${options.search}%
      `);
    }

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: deployments, error } = await query;

    if (error) {
      throw new Error('Failed to fetch deployments: ' + error.message);
    }

    return deployments || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets deployable requests (approved requests available for deployment)
 * @returns {Promise<Array>} Array of deployable requests
 */
async function getDeployableRequests() {
  try {
    const { data: requests, error } = await supabase
      .from('deployable_requests_view')
      .select('*')
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch deployable requests: ' + error.message);
    }

    return requests || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets DSS recommendations for a specific request
 * @param {string} requestId - Community request ID
 * @returns {Promise<Array>} Array of DSS recommendations
 */
async function getDSSRecommendationsForDeployment(requestId) {
  try {
    // Get saved DSS match results
    const { data: dssResults, error: dssError } = await supabase
      .from('dss_match_results')
      .select(`
        *,
        student:users!dss_match_results_student_user_id_fkey(
          user_id,
          email,
          student_profiles(*)
        )
      `)
      .eq('request_id', requestId)
      .order('recommendation_rank', { ascending: true });

    if (dssError) {
      throw new Error('Failed to fetch DSS recommendations: ' + dssError.message);
    }

    if (!dssResults || dssResults.length === 0) {
      return [];
    }

    // Transform and filter available students
    const recommendations = [];
    
    for (const result of dssResults) {
      const student = result.student;
      let profile = null;
      if (student && student.student_profiles) {
        if (Array.isArray(student.student_profiles)) {
          profile = student.student_profiles[0];
        } else {
          profile = student.student_profiles;
        }
      }

      if (!profile) {
        continue;
      }
      
      // Check if student has active deployment
      const hasActiveDeployment = await checkStudentActiveDeployment(student.user_id);
      
      recommendations.push({
        student_user_id: student.user_id,
        student_name: profile.full_name,
        student_number: profile.student_number,
        course: profile.course,
        year_level: profile.year_level,
        section: profile.section,
        nstp_component: profile.nstp_component,
        municipality: profile.municipality,
        province: profile.province,
        skills: profile.skills || [],
        match_score: result.match_score,
        match_label: result.match_label,
        recommendation_rank: result.recommendation_rank,
        is_available: !hasActiveDeployment,
        profile_status: 'complete', // Already filtered in DSS
        cmo_compliance_status: 'compliant' // Already filtered in DSS
      });
    }

    return recommendations;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Checks if student has active deployment
 * @param {string} studentId - Student user ID
 * @returns {Promise<boolean>} True if student has active deployment
 */
async function checkStudentActiveDeployment(studentId) {
  try {
    const { data, error } = await supabase
      .rpc('student_has_active_deployment', { target_student_id: studentId });

    if (error) {
      throw new Error('Failed to check student deployment status: ' + error.message);
    }

    return data || false;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Creates a new deployment assignment
 * @param {object} deploymentData - Deployment data
 * @param {string} assignedBy - NSTP Official user ID
 * @returns {Promise<object>} Created deployment
 */
async function createDeployment(deploymentData, assignedBy) {
  try {
    // Validate deployment data
    const validation = validateDeploymentCreation(deploymentData);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    // Get the community request
    const { data: request, error: requestError } = await supabase
      .from('community_requests')
      .select('*')
      .eq('request_id', deploymentData.request_id)
      .eq('request_status', 'approved')
      .single();

    if (requestError) {
      if (requestError.code === 'PGRST116') {
        throw new Error('Approved community request not found');
      }
      throw new Error('Failed to fetch community request: ' + requestError.message);
    }

    // Check if request already has active deployment
    const { data: existingDeployment } = await supabase
      .from('deployments')
      .select('deployment_id')
      .eq('request_id', deploymentData.request_id)
      .in('deployment_status', ['pending', 'active', 'ongoing'])
      .single();

    if (existingDeployment) {
      throw new Error('This request already has an active deployment');
    }

    // Validate deployment capacity
    const capacityValidation = validateDeploymentCapacity(
      request.students_needed,
      deploymentData.selected_students.length
    );
    if (!capacityValidation.isValid) {
      throw new Error('Capacity validation failed: ' + capacityValidation.errors.join(', '));
    }

    // Validate selected students eligibility
    const studentValidationPromises = deploymentData.selected_students.map(async (studentId) => {
      // Check if student exists and is eligible
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select(`
          user_id,
          email,
          profile_status,
          cmo_compliance_status,
          student_profiles(*)
        `)
        .eq('user_id', studentId)
        .eq('role', 'student')
        .single();

      if (studentError) {
        throw new Error(`Student ${studentId} not found or invalid`);
      }

      if (!student.student_profiles || student.student_profiles.length === 0) {
        throw new Error(`Student ${student.email} has no profile`);
      }

      const profile = student.student_profiles[0];
      const eligibilityValidation = validateStudentEligibility(
        {
          full_name: profile.full_name,
          profile_status: student.profile_status,
          cmo_compliance_status: student.cmo_compliance_status
        },
        request
      );

      if (!eligibilityValidation.isValid) {
        throw new Error(eligibilityValidation.errors.join(', '));
      }

      // Check if student has active deployment
      const hasActiveDeployment = await checkStudentActiveDeployment(studentId);
      if (hasActiveDeployment) {
        throw new Error(`Student ${profile.full_name} is already assigned to an active deployment`);
      }

      return student;
    });

    await Promise.all(studentValidationPromises);

    // Create deployment record
    const { data: newDeployment, error: deploymentError } = await supabase
      .from('deployments')
      .insert({
        request_id: deploymentData.request_id,
        deployment_batch_name: deploymentData.deployment_batch_name.trim(),
        deployment_start_date: deploymentData.deployment_start_date,
        deployment_end_date: deploymentData.deployment_end_date,
        assigned_by: assignedBy,
        notes: deploymentData.notes ? deploymentData.notes.trim() : null,
        deployment_status: 'pending'
      })
      .select()
      .single();

    if (deploymentError) {
      throw new Error('Failed to create deployment: ' + deploymentError.message);
    }

    // Create student assignments
    const studentAssignments = deploymentData.selected_students.map(studentId => ({
      deployment_id: newDeployment.deployment_id,
      student_user_id: studentId,
      deployment_student_status: 'assigned'
    }));

    const { error: assignmentError } = await supabase
      .from('deployment_students')
      .insert(studentAssignments);

    if (assignmentError) {
      // Rollback deployment creation
      await supabase
        .from('deployments')
        .delete()
        .eq('deployment_id', newDeployment.deployment_id);
      
      throw new Error('Failed to assign students: ' + assignmentError.message);
    }

    return newDeployment;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets deployment details by ID
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<object>} Deployment details
 */
async function getDeploymentDetails(deploymentId) {
  try {
    // Get deployment details
    const { data: deploymentDetails, error: detailsError } = await supabase
      .rpc('get_deployment_details', { target_deployment_id: deploymentId });

    if (detailsError) {
      throw new Error('Failed to fetch deployment details: ' + detailsError.message);
    }

    if (!deploymentDetails || deploymentDetails.length === 0) {
      throw new Error('Deployment not found');
    }

    const deployment = deploymentDetails[0];

    // Get assigned students
    const { data: assignedStudents, error: studentsError } = await supabase
      .from('deployment_students')
      .select(`
        deployment_student_id,
        deployment_student_status,
        assigned_at,
        notes,
        student:users!deployment_students_student_user_id_fkey(
          user_id,
          email,
          student_profiles(*)
        )
      `)
      .eq('deployment_id', deploymentId)
      .order('assigned_at', { ascending: true });

    if (studentsError) {
      throw new Error('Failed to fetch assigned students: ' + studentsError.message);
    }

    // Transform student data
    const students = (assignedStudents || []).map(assignment => {
      const student = assignment.student;
      let profile = null;
      if (student && student.student_profiles) {
        if (Array.isArray(student.student_profiles)) {
          profile = student.student_profiles[0];
        } else {
          profile = student.student_profiles;
        }
      }
      
      return {
        deployment_student_id: assignment.deployment_student_id,
        student_user_id: student?.user_id,
        student_name: profile?.full_name || 'Unknown',
        student_number: profile?.student_number || 'N/A',
        course: profile?.course || 'N/A',
        year_level: profile?.year_level || 'N/A',
        nstp_component: profile?.nstp_component || 'N/A',
        deployment_student_status: assignment.deployment_student_status,
        assigned_at: assignment.assigned_at,
        notes: assignment.notes
      };
    });

    return {
      ...deployment,
      assigned_students: students
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Updates deployment status
 * @param {string} deploymentId - Deployment ID
 * @param {string} newStatus - New deployment status
 * @param {string} updatedBy - User ID who is updating
 * @returns {Promise<object>} Updated deployment
 */
async function updateDeploymentStatus(deploymentId, newStatus, updatedBy) {
  try {
    // Get current deployment
    const { data: currentDeployment, error: fetchError } = await supabase
      .from('deployments')
      .select('deployment_status')
      .eq('deployment_id', deploymentId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Deployment not found');
      }
      throw new Error('Failed to fetch deployment: ' + fetchError.message);
    }

    // Validate status transition
    const statusValidation = validateDeploymentStatusUpdate(
      currentDeployment.deployment_status,
      newStatus
    );
    if (!statusValidation.isValid) {
      throw new Error('Status validation failed: ' + statusValidation.errors.join(', '));
    }

    // Update deployment status
    const { data: updatedDeployment, error: updateError } = await supabase
      .from('deployments')
      .update({ 
        deployment_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('deployment_id', deploymentId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update deployment status: ' + updateError.message);
    }

    // Update student statuses based on deployment status
    if (newStatus === 'active') {
      await supabase
        .from('deployment_students')
        .update({ deployment_student_status: 'active' })
        .eq('deployment_id', deploymentId)
        .eq('deployment_student_status', 'assigned');
    } else if (newStatus === 'completed') {
      await supabase
        .from('deployment_students')
        .update({ deployment_student_status: 'completed' })
        .eq('deployment_id', deploymentId)
        .in('deployment_student_status', ['assigned', 'active']);
    }

    return updatedDeployment;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets student's current deployment status
 * @param {string} studentId - Student user ID
 * @returns {Promise<object|null>} Current deployment info or null
 */
async function getStudentCurrentDeployment(studentId) {
  try {
    const { data: deployment, error } = await supabase
      .from('deployment_students')
      .select(`
        deployment_student_status,
        assigned_at,
        deployment:deployments(
          deployment_id,
          deployment_batch_name,
          deployment_status,
          deployment_start_date,
          deployment_end_date,
          community_request:community_requests(
            community_name,
            activity_title,
            municipality,
            province
          )
        )
      `)
      .eq('student_user_id', studentId)
      .in('deployment_student_status', ['assigned', 'active'])
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No active deployment
      }
      throw new Error('Failed to fetch student deployment: ' + error.message);
    }

    return deployment;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  getDeploymentDashboardSummary,
  getDeployments,
  getDeployableRequests,
  getDSSRecommendationsForDeployment,
  checkStudentActiveDeployment,
  createDeployment,
  getDeploymentDetails,
  updateDeploymentStatus,
  getStudentCurrentDeployment
};