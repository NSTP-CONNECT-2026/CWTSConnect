/**
 * NSTPConnect - DSS Matching Service
 * Handles Decision Support System matching logic
 */

const supabase = require('../config/supabaseClient');
const { 
  calculateOverallMatchScore, 
  rankMatchResults 
} = require('../utils/matchingScoreUtils');

/**
 * Gets dashboard summary statistics
 * @returns {Promise<object>} Dashboard summary data
 */
/**
 * Gets dashboard summary statistics
 * @returns {Promise<object>} Dashboard summary data
 */
async function getDashboardSummary() {
  try {
    const { data, error } = await supabase
      .rpc('get_dss_dashboard_summary');

    if (error) {
      throw new Error('Failed to fetch dashboard summary: ' + error.message);
    }

    const summary = data[0] || {
      total_eligible_students: 0,
      approved_community_requests: 0,
      recommended_matches_generated: 0,
      students_already_assigned: 0,
      pending_deployment_requests: 0
    };

    // Keep dashboard count in sync with the new filters (only not deployed, not completed)
    try {
      const eligibleList = await getEligibleStudents();
      summary.total_eligible_students = eligibleList.length;
    } catch (e) {
      console.error('Error syncing eligible students count:', e);
    }

    return summary;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets all approved community requests
 * @returns {Promise<Array>} Array of approved requests
 */
async function getApprovedRequests() {
  try {
    const { data: requests, error } = await supabase
      .from('approved_community_requests')
      .select('*')
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch approved requests: ' + error.message);
    }

    return requests || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets all eligible students for matching
 * @returns {Promise<Array>} Array of eligible students
 */
async function getEligibleStudents() {
  try {
    // 1. Get base eligible students from database view (complete profile & compliant CMO)
    const { data: students, error } = await supabase
      .from('eligible_students')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch eligible students: ' + error.message);
    }

    if (!students || students.length === 0) {
      return [];
    }

    // 2. Fetch active deployment student assignments (pending, active, ongoing status)
    const { data: activeDeployments, error: depError } = await supabase
      .from('deployments')
      .select('deployment_id')
      .in('deployment_status', ['pending', 'active', 'ongoing']);

    let deployedStudentIds = [];
    if (!depError && activeDeployments && activeDeployments.length > 0) {
      const depIds = activeDeployments.map(d => d.deployment_id);
      
      const { data: assignments, error: assError } = await supabase
        .from('deployment_students')
        .select('student_user_id')
        .in('deployment_id', depIds)
        .in('deployment_student_status', ['assigned', 'active']);

      if (!assError && assignments) {
        deployedStudentIds = assignments.map(a => a.student_user_id);
      }
    }

    // 3. Fetch students who have completed their service hours requirement
    const { data: completedHours, error: hoursError } = await supabase
      .from('rendered_hours_summary')
      .select('student_user_id')
      .eq('completion_status', 'completed');

    const completedStudentIds = !hoursError && completedHours 
      ? completedHours.map(h => h.student_user_id) 
      : [];

    // 4. Filter: only students not already deployed AND not completed
    const filteredStudents = students.filter(student => 
      !deployedStudentIds.includes(student.user_id) && 
      !completedStudentIds.includes(student.user_id)
    );

    return filteredStudents;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Generates match recommendations for a specific request
 * @param {string} requestId - Community request ID
 * @param {string} generatedBy - NSTP Official user ID
 * @returns {Promise<Array>} Array of ranked match recommendations
 */
async function generateMatchRecommendations(requestId, generatedBy) {
  try {
    // Get the specific request
    const { data: request, error: requestError } = await supabase
      .from('community_requests')
      .select('*')
      .eq('request_id', requestId)
      .eq('request_status', 'approved')
      .single();

    if (requestError) {
      if (requestError.code === 'PGRST116') {
        throw new Error('Approved request not found');
      }
      throw new Error('Failed to fetch request: ' + requestError.message);
    }

    // Get all eligible students (excluding already deployed/completed)
    const eligibleStudents = await getEligibleStudents();

    if (eligibleStudents.length === 0) {
      return [];
    }

    // Filter by relevant NSTP component if applicable
    const relevantStudents = eligibleStudents.filter(student => {
      if (!student.nstp_component || !request.preferred_nstp_component) {
        return true; // Allow matching if data is missing to be safe
      }
      
      const studentComp = student.nstp_component.toUpperCase().trim();
      const preferredComp = request.preferred_nstp_component.toUpperCase().trim();

      // If request accepts Both, any student component is relevant
      if (preferredComp === 'BOTH') {
        return true;
      }
      // Otherwise, the student's component must match the preferred component exactly (CWTS or LTS)
      return studentComp === preferredComp;
    });

    if (relevantStudents.length === 0) {
      return [];
    }

    // Calculate match scores for each student
    const matchResults = relevantStudents.map(student => {
      const scoreResult = calculateOverallMatchScore(student, request);
      
      return {
        student_user_id: student.user_id,
        student_name: student.full_name,
        student_number: student.student_number,
        course: student.course,
        year_level: student.year_level,
        municipality: student.municipality,
        province: student.province,
        skills: student.skills,
        nstp_component: student.nstp_component,
        totalScore: scoreResult.totalScore,
        matchLabel: scoreResult.matchLabel,
        locationScore: scoreResult.breakdown.locationScore,
        skillsScore: scoreResult.breakdown.skillsScore,
        componentScore: scoreResult.breakdown.componentScore,
        availabilityScore: scoreResult.breakdown.availabilityScore
      };
    });

    // Rank the results
    const rankedResults = rankMatchResults(matchResults);

    // Clear existing matches for this request
    await clearExistingMatches(requestId);

    // Save match results to database
    await saveMatchResults(requestId, rankedResults, generatedBy);

    return rankedResults;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets saved match results for a request
 * @param {string} requestId - Community request ID
 * @returns {Promise<Array>} Array of saved match results
 */
async function getMatchResults(requestId) {
  try {
    const { data: results, error } = await supabase
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

    if (error) {
      throw new Error('Failed to fetch match results: ' + error.message);
    }

    // Transform the data for frontend consumption
    const labelMapFromDb = {
      'Highly Recommended': 'Excellent',
      'Recommended': 'Good',
      'Possible Match': 'Fair',
      'Low Match': 'Poor'
    };

    const transformedResults = (results || []).map(result => {
      let profile = {};
      if (result.student && result.student.student_profiles) {
        if (Array.isArray(result.student.student_profiles)) {
          profile = result.student.student_profiles[0] || {};
        } else {
          profile = result.student.student_profiles;
        }
      }

      return {
        match_id: result.match_id,
        student_user_id: result.student_user_id,
        student_name: profile.full_name || 'Unknown',
        student_number: profile.student_number || 'N/A',
        course: profile.course || 'N/A',
        year_level: profile.year_level || 'N/A',
        municipality: profile.municipality || 'N/A',
        province: profile.province || 'N/A',
        skills: profile.skills || [],
        nstp_component: profile.nstp_component || 'N/A',
        totalScore: result.match_score,
        matchLabel: labelMapFromDb[result.match_label] || result.match_label,
        recommendationRank: result.recommendation_rank,
        locationScore: result.location_score,
        skillsScore: result.skills_score,
        componentScore: result.component_score,
        availabilityScore: result.availability_score,
        generated_at: result.generated_at
      };
    });

    return transformedResults;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets student profile for quick view
 * @param {string} studentId - Student user ID
 * @returns {Promise<object>} Student profile data
 */
async function getStudentQuickView(studentId) {
  try {
    const { data: student, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        cmo_compliance_status,
        profile_status,
        student_profiles(*)
      `)
      .eq('user_id', studentId)
      .eq('role', 'student')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Student not found');
      }
      throw new Error('Failed to fetch student: ' + error.message);
    }

    let profile = null;
    if (student.student_profiles) {
      if (Array.isArray(student.student_profiles)) {
        profile = student.student_profiles[0];
      } else {
        profile = student.student_profiles;
      }
    }

    if (!profile) {
      throw new Error('Student profile not found');
    }

    // Ensure skills is an array
    const skills = Array.isArray(profile.skills) ? profile.skills : [];

    return {
      user_id: student.user_id,
      email: student.email,
      full_name: profile.full_name || 'N/A',
      student_number: profile.student_number || 'N/A',
      course: profile.course || 'N/A',
      year_level: profile.year_level || 'N/A',
      section: profile.section || 'N/A',
      nstp_component: profile.nstp_component || 'N/A',
      contact_number: profile.contact_number || 'N/A',
      complete_address: profile.complete_address || 'N/A',
      barangay: profile.barangay || 'N/A',
      municipality: profile.municipality || 'N/A',
      province: profile.province || 'N/A',
      skills: skills,
      cmo_compliance_status: student.cmo_compliance_status || 'incomplete',
      profile_status: student.profile_status || 'incomplete'
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Clears existing match results for a request
 * @param {string} requestId - Community request ID
 * @returns {Promise<number>} Number of deleted records
 */
async function clearExistingMatches(requestId) {
  try {
    const { data, error } = await supabase
      .rpc('clear_dss_matches_for_request', { target_request_id: requestId });

    if (error) {
      throw new Error('Failed to clear existing matches: ' + error.message);
    }

    return data || 0;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Saves match results to database
 * @param {string} requestId - Community request ID
 * @param {Array} matchResults - Array of match results
 * @param {string} generatedBy - NSTP Official user ID
 * @returns {Promise<void>}
 */
async function saveMatchResults(requestId, matchResults, generatedBy) {
  try {
    if (matchResults.length === 0) {
      return;
    }

    // Prepare data for insertion
    const dbLabelMap = {
      'Excellent': 'Highly Recommended',
      'Good': 'Recommended',
      'Fair': 'Possible Match',
      'Poor': 'Low Match'
    };

    const insertData = matchResults.map(result => ({
      request_id: requestId,
      student_user_id: result.student_user_id,
      match_score: result.totalScore,
      match_label: dbLabelMap[result.matchLabel] || result.matchLabel,
      recommendation_rank: result.recommendationRank,
      location_score: result.locationScore,
      skills_score: result.skillsScore,
      component_score: result.componentScore,
      availability_score: result.availabilityScore,
      generated_by: generatedBy
    }));

    const { error } = await supabase
      .from('dss_match_results')
      .insert(insertData);

    if (error) {
      throw new Error('Failed to save match results: ' + error.message);
    }
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  getDashboardSummary,
  getApprovedRequests,
  getEligibleStudents,
  generateMatchRecommendations,
  getMatchResults,
  getStudentQuickView
};