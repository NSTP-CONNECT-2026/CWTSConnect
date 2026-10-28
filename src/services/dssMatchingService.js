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
 * Normalizes date string or Date object to YYYY-MM-DD
 */
function normalizeDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0].trim();
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return null;
}

/**
 * Checks if a deployment has a schedule or date conflict with a target request
 * Conflict only occurs if they are scheduled on the same day or date
 * @param {object} targetRequest - Target community request
 * @param {object} deployment - Existing active deployment
 * @returns {boolean} True if there is a conflict on the same date/day
 */
function hasDeploymentScheduleConflict(targetRequest, deployment) {
  if (!targetRequest || !deployment) return false;

  const targetStartDate = normalizeDate(targetRequest.preferred_start_date || targetRequest.deployment_start_date);
  const targetEndDate = normalizeDate(targetRequest.preferred_end_date || targetRequest.deployment_end_date) || targetStartDate;
  const targetSchedule = String(targetRequest.preferred_schedule || targetRequest.schedule || '').toLowerCase();

  const depStartDate = normalizeDate(
    deployment.deployment_start_date || 
    (deployment.community_requests && deployment.community_requests.preferred_start_date)
  );
  const depEndDate = normalizeDate(
    deployment.deployment_end_date || 
    (deployment.community_requests && deployment.community_requests.preferred_end_date)
  ) || depStartDate;
  const depSchedule = String(
    deployment.notes || 
    (deployment.community_requests && deployment.community_requests.preferred_schedule) || 
    deployment.schedule || ''
  ).toLowerCase();

  // If both lack start dates, conflict only if exact same request
  if (!targetStartDate || !depStartDate) {
    if (deployment.request_id && targetRequest.request_id && deployment.request_id === targetRequest.request_id) {
      return true;
    }
    return false;
  }

  // Exact same request ID is always a conflict
  if (deployment.request_id && targetRequest.request_id && deployment.request_id === targetRequest.request_id) {
    return true;
  }

  // Exact single date match
  if (targetStartDate === depStartDate) {
    return true;
  }

  // Check date range overlap
  const overlap = (targetStartDate <= depEndDate) && (depStartDate <= targetEndDate);
  if (!overlap) {
    return false;
  }

  // If date ranges overlap, check for specific recurring days of week (e.g. Saturdays, Sundays)
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetHasDay = daysOfWeek.find(day => targetSchedule.includes(day));
  const depHasDay = daysOfWeek.find(day => depSchedule.includes(day));
  if (targetHasDay && depHasDay) {
    return targetHasDay === depHasDay;
  }

  return true;
}

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
 * Gets all eligible students for matching, considering schedule conflicts for a target request
 * @param {object|string} [targetRequestOrId] - Optional target request or request ID to check schedule conflict against
 * @returns {Promise<Array>} Array of eligible students
 */
async function getEligibleStudents(targetRequestOrId) {
  try {
    let targetRequest = null;
    if (targetRequestOrId) {
      if (typeof targetRequestOrId === 'object') {
        targetRequest = targetRequestOrId;
      } else if (typeof targetRequestOrId === 'string') {
        const { data: req } = await supabase
          .from('community_requests')
          .select('*')
          .eq('request_id', targetRequestOrId)
          .maybeSingle();
        targetRequest = req;
      }
    }

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

    // 2. Fetch active deployment student assignments with dates and schedules
    const { data: activeDeployments, error: depError } = await supabase
      .from('deployments')
      .select(`
        deployment_id,
        deployment_batch_name,
        deployment_status,
        deployment_start_date,
        deployment_end_date,
        notes,
        request_id,
        community_requests(activity_title, preferred_start_date, preferred_schedule)
      `)
      .in('deployment_status', ['pending', 'active', 'ongoing']);

    const conflictingStudentIds = new Set();
    if (!depError && activeDeployments && activeDeployments.length > 0) {
      const depIds = activeDeployments.map(d => d.deployment_id);
      const depMap = new Map();
      activeDeployments.forEach(d => depMap.set(d.deployment_id, d));
      
      const { data: assignments, error: assError } = await supabase
        .from('deployment_students')
        .select('deployment_id, student_user_id')
        .in('deployment_id', depIds)
        .in('deployment_student_status', ['assigned', 'active']);

      if (!assError && assignments) {
        assignments.forEach(a => {
          const dep = depMap.get(a.deployment_id);
          if (dep) {
            if (targetRequest) {
              // Only conflict if scheduled on the same date or day!
              if (hasDeploymentScheduleConflict(targetRequest, dep)) {
                conflictingStudentIds.add(a.student_user_id);
              }
            } else {
              conflictingStudentIds.add(a.student_user_id);
            }
          }
        });
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

    // 4. Filter: only students not conflicting AND not completed
    const filteredStudents = students.filter(student => 
      !conflictingStudentIds.has(student.user_id) && 
      !completedStudentIds.includes(student.user_id)
    );

    return filteredStudents;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets all students screened according to SOURCE CODE.TXT Gatekeeper Rules:
 * Check 1: Mandatory CMO requirements completed (4/4 approved)?
 * Check 2: Profile completed and student not deployed on the same date/day?
 * Returns all candidates with eligibility status and breakdown
 * @param {object|string} [targetRequestOrId] - Optional target request or request ID
 * @returns {Promise<object>} Screening result with all_students, eligible_list, and summary
 */
async function getScreeningStudents(targetRequestOrId) {
  try {
    let targetRequest = null;
    if (targetRequestOrId) {
      if (typeof targetRequestOrId === 'object') {
        targetRequest = targetRequestOrId;
      } else if (typeof targetRequestOrId === 'string') {
        const { data: req } = await supabase
          .from('community_requests')
          .select('*')
          .eq('request_id', targetRequestOrId)
          .maybeSingle();
        targetRequest = req;
      }
    }

    // 1. Fetch all student users and their profiles
    const { data: students, error: sError } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        account_status,
        profile_status,
        cmo_compliance_status,
        created_at,
        student_profiles (
          full_name,
          student_number,
          course,
          year_level,
          section,
          nstp_component,
          contact_number,
          complete_address,
          barangay,
          municipality,
          province,
          location,
          skills
        )
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (sError) throw new Error('Failed to fetch students: ' + sError.message);

    // 2. Fetch all student requirements counts
    const { data: allReqs, error: rError } = await supabase
      .from('student_cmo_requirements')
      .select('user_id, status');

    const reqsCountMap = {};
    if (!rError && allReqs) {
      allReqs.forEach(r => {
        if (!reqsCountMap[r.user_id]) {
          reqsCountMap[r.user_id] = { approved: 0, pending: 0, rejected: 0, total: 0 };
        }
        reqsCountMap[r.user_id].total++;
        if (r.status === 'approved') reqsCountMap[r.user_id].approved++;
        else if (r.status === 'pending') reqsCountMap[r.user_id].pending++;
        else if (r.status === 'rejected') reqsCountMap[r.user_id].rejected++;
      });
    }

    // 3. Fetch active deployment assignments with dates and schedules
    const { data: activeDeployments } = await supabase
      .from('deployments')
      .select(`
        deployment_id,
        deployment_batch_name,
        deployment_status,
        deployment_start_date,
        deployment_end_date,
        notes,
        request_id,
        community_requests(activity_title, preferred_start_date, preferred_schedule)
      `)
      .in('deployment_status', ['pending', 'active', 'ongoing']);

    const studentDeploymentsMap = new Map();
    if (activeDeployments && activeDeployments.length > 0) {
      const depIds = activeDeployments.map(d => d.deployment_id);
      const depMap = new Map();
      activeDeployments.forEach(d => depMap.set(d.deployment_id, d));

      const { data: assignments } = await supabase
        .from('deployment_students')
        .select('deployment_id, student_user_id, deployment_student_status')
        .in('deployment_id', depIds)
        .in('deployment_student_status', ['assigned', 'active']);

      if (assignments) {
        assignments.forEach(a => {
          const dep = depMap.get(a.deployment_id);
          if (dep) {
            if (!studentDeploymentsMap.has(a.student_user_id)) {
              studentDeploymentsMap.set(a.student_user_id, []);
            }
            studentDeploymentsMap.get(a.student_user_id).push({
              deployment_id: dep.deployment_id,
              deployment_batch_name: dep.deployment_batch_name,
              deployment_status: dep.deployment_status,
              deployment_start_date: dep.deployment_start_date,
              deployment_end_date: dep.deployment_end_date,
              notes: dep.notes,
              request_id: dep.request_id,
              activity_title: dep.community_requests ? dep.community_requests.activity_title : '',
              preferred_start_date: dep.community_requests ? dep.community_requests.preferred_start_date : null,
              preferred_schedule: dep.community_requests ? dep.community_requests.preferred_schedule : null
            });
          }
        });
      }
    }

    // 4. Fetch students with completed hours
    const { data: completedHours } = await supabase
      .from('rendered_hours_summary')
      .select('student_user_id')
      .eq('completion_status', 'completed');

    const completedStudentIds = new Set();
    if (completedHours) {
      completedHours.forEach(h => completedStudentIds.add(h.student_user_id));
    }

    // 5. Evaluate each student using SOURCE CODE.TXT logic:
    const screenedList = (students || []).map(student => {
      let profile = {};
      if (Array.isArray(student.student_profiles)) {
        profile = student.student_profiles[0] || {};
      } else if (student.student_profiles && typeof student.student_profiles === 'object') {
        profile = student.student_profiles;
      }

      const reqSummary = reqsCountMap[student.user_id] || { approved: 0, pending: 0, rejected: 0, total: 0 };
      const approvedCount = reqSummary.approved;
      
      // Check 1: Are mandatory requirements completed (4/4 approved)?
      const check1Passed = approvedCount === 4 || student.cmo_compliance_status === 'compliant';
      const check1Status = check1Passed ? 'COMPLIANT' : 'INCOMPLETE';
      const check1Reason = check1Passed 
        ? '4/4 Mandatory Requirements Approved' 
        : `Incomplete Requirements (${approvedCount}/4 Approved)`;

      // Check 2: Is profile completed and is student deployed on the same date/day?
      const hasProfile = (student.profile_status === 'complete' || Boolean(profile.full_name && profile.student_number));
      const studentActiveDeployments = studentDeploymentsMap.get(student.user_id) || [];

      let isDeployed = false;
      let conflictingDeployment = null;

      if (studentActiveDeployments.length > 0) {
        if (targetRequest) {
          for (const dep of studentActiveDeployments) {
            if (hasDeploymentScheduleConflict(targetRequest, dep)) {
              isDeployed = true;
              conflictingDeployment = dep;
              break;
            }
          }
        } else {
          // No specific target request evaluated on server yet;
          // default isDeployed to false so students are not prematurely marked Deployed,
          // while active_deployments is attached for client-side selection evaluation.
          isDeployed = false;
        }
      }

      const isCompleted = completedStudentIds.has(student.user_id);
      const check2Passed = hasProfile && !isDeployed && !isCompleted;
      
      let check2Status = 'AVAILABLE';
      let check2Reason = 'Profile Complete & Not Deployed';
      if (!hasProfile) {
        check2Status = 'INCOMPLETE_PROFILE';
        check2Reason = 'Pending Profile Setup';
      } else if (isDeployed) {
        check2Status = 'DEPLOYED';
        check2Reason = conflictingDeployment && conflictingDeployment.deployment_start_date
          ? `Deployed on ${conflictingDeployment.deployment_start_date}`
          : 'Already Deployed on Same Date';
      } else if (isCompleted) {
        check2Status = 'HOURS_COMPLETED';
        check2Reason = 'Service Hours Completed';
      }

      // Mark as ELIGIBLE or INELIGIBLE
      const isEligible = check1Passed && check2Passed;
      let eligibilityReason = '';
      if (isEligible) {
        eligibilityReason = 'Eligible for DSS Engine';
      } else if (!check1Passed) {
        eligibilityReason = `Ineligible: Incomplete Requirements (${approvedCount}/4 Approved)`;
      } else if (!hasProfile) {
        eligibilityReason = 'Ineligible: Pending Profile Setup';
      } else if (isDeployed) {
        eligibilityReason = conflictingDeployment && conflictingDeployment.deployment_start_date
          ? `Ineligible: Deployed on ${conflictingDeployment.deployment_start_date}`
          : 'Ineligible: Already Deployed on Same Date';
      } else {
        eligibilityReason = 'Ineligible: Service Hours Completed';
      }

      return {
        user_id: student.user_id,
        email: student.email,
        full_name: profile.full_name || 'Student Candidate',
        student_number: profile.student_number || 'N/A',
        course: profile.course || 'BSIT',
        year_level: profile.year_level || '1st Year',
        section: profile.section ? (String(profile.section).toLowerCase().startsWith('section') ? profile.section : `Section ${String(profile.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A',
        nstp_component: profile.nstp_component || 'CWTS',
        barangay: profile.barangay || '',
        municipality: profile.municipality || '',
        province: profile.province || '',
        complete_address: profile.complete_address || '',
        location: profile.location || null,
        skills: profile.skills || [],
        profile_status: student.profile_status,
        cmo_compliance_status: student.cmo_compliance_status,
        
        // Active deployments for client-side schedule conflict checks
        active_deployments: studentActiveDeployments,
        conflicting_deployment: conflictingDeployment,

        // Check 1 Results
        approved_requirements_count: approvedCount,
        total_mandatory_requirements: 4,
        check1_passed: check1Passed,
        check1_status: check1Status,
        check1_reason: check1Reason,

        // Check 2 Results
        has_profile: hasProfile,
        is_deployed: isDeployed,
        is_completed: isCompleted,
        check2_passed: check2Passed,
        check2_status: check2Status,
        check2_reason: check2Reason,

        // Overall Eligibility
        is_eligible: isEligible,
        eligibility_result: isEligible ? 'ELIGIBLE' : 'INELIGIBLE',
        eligibility_reason: eligibilityReason
      };
    });

    const eligibleList = screenedList.filter(s => s.is_eligible);

    return {
      all_students: screenedList,
      eligible_list: eligibleList,
      summary: {
        total_students: screenedList.length,
        eligible_count: eligibleList.length,
        ineligible_count: screenedList.length - eligibleList.length,
        check1_passed_count: screenedList.filter(s => s.check1_passed).length,
        check2_passed_count: screenedList.filter(s => s.check2_passed).length
      }
    };
  } catch (error) {
    throw new Error('Service error in getScreeningStudents: ' + error.message);
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

    // Enrich request with official's pinned coordinates and location
    if (!request.location && request.user_id) {
      try {
        const { getOfficialProfile } = require('./communityOfficialStore');
        const offProfile = getOfficialProfile(request.user_id);
        if (offProfile) {
          request.location = offProfile.location || (offProfile.latitude && offProfile.longitude ? `${offProfile.latitude},${offProfile.longitude}` : '');
          request.coordinates = offProfile.coordinates || (offProfile.latitude && offProfile.longitude ? { lat: offProfile.latitude, lng: offProfile.longitude } : null);
        }
      } catch (e) {
        // ignore
      }
    }

    // Get all eligible students (excluding conflicting deployed on same date/day or completed)
    const eligibleStudents = await getEligibleStudents(request);

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
      latitude: profile.latitude || null,
      longitude: profile.longitude || null,
      location: profile.location || null,
      emergency_contact_name: profile.emergency_contact_name || null,
      emergency_contact_number: profile.emergency_contact_number || null,
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
      'Highly Suitable': 'Highly Recommended',
      'Suitable': 'Recommended',
      'Low Suitability': 'Low Match',
      'Excellent': 'Highly Recommended',
      'Good': 'Recommended',
      'Fair': 'Possible Match',
      'Poor': 'Low Match'
    };

    const insertData = matchResults.map(result => ({
      request_id: requestId,
      student_user_id: result.student_user_id,
      match_score: result.totalScore,
      match_label: dbLabelMap[result.matchLabel] || 'Possible Match',
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
  getScreeningStudents,
  generateMatchRecommendations,
  getMatchResults,
  getStudentQuickView,
  hasDeploymentScheduleConflict,
  normalizeDate
};