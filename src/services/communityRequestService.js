/**
 * NSTPConnect - Community Request Service
 * Handles community request business logic
 */

const supabase = require('../config/supabaseClient');
const { 
  validateCommunityRequest, 
  canEditRequest, 
  canCancelRequest 
} = require('../utils/requestValidators');

/**
 * Maps custom request type to one of the standard PostgreSQL check constraint types
 */
function getStandardActivityType(customType) {
  const t = (customType || '').toLowerCase();
  if (t.includes('clean') || t.includes('sanitat') || t.includes('waste') || t.includes('paligid') || t.includes('ilog')) return 'Clean-up Drive';
  if (t.includes('tree') || t.includes('plant') || t.includes('green') || t.includes('forest')) return 'Tree Planting';
  if (t.includes('computer') || t.includes('digital') || t.includes('it') || t.includes('tech')) return 'Computer Literacy Training';
  if (t.includes('literacy') || t.includes('tutor') || t.includes('read') || t.includes('educat') || t.includes('teach')) return 'Literacy Program';
  if (t.includes('feed') || t.includes('nutrit') || t.includes('food')) return 'Feeding Program';
  if (t.includes('disaster') || t.includes('calamity') || t.includes('emerg') || t.includes('prepared') || t.includes('risk')) return 'Disaster Preparedness';
  if (t.includes('survey') || t.includes('census') || t.includes('profil')) return 'Community Survey';
  if (t.includes('health') || t.includes('medical') || t.includes('first aid') || t.includes('hygiene') || t.includes('care')) return 'Health Awareness Program';
  return 'Others';
}

/**
 * Normalizes request records so that both database column names and frontend aliases are always present
 */
function normalizeRequestRecord(req) {
  if (!req || typeof req !== 'object') return req;

  let activityType = req.activity_type || '';
  let specialInstructions = req.special_instructions || '';

  if (specialInstructions && specialInstructions.includes('[CUSTOM_REQUEST_TYPE:')) {
    const match = specialInstructions.match(/\[CUSTOM_REQUEST_TYPE:(.*?)\]/);
    if (match && match[1]) {
      activityType = match[1].trim();
      specialInstructions = specialInstructions.replace(/\[CUSTOM_REQUEST_TYPE:.*?\]/g, '').trim() || null;
    }
  }

  const description = req.activity_description || req.description || '';
  const startDate = req.preferred_start_date || req.target_start_date || req.date || '';
  const endDate = req.preferred_end_date || req.target_end_date || startDate;
  const skills = Array.isArray(req.needed_skills) ? req.needed_skills : (Array.isArray(req.skills_required) ? req.skills_required : []);
  const completeAddress = req.community_address || req.complete_address || '';

  let locStr = req.location || '';
  let coordsObj = req.coordinates || null;
  if (!locStr && req.user_id) {
    try {
      const { getOfficialProfile } = require('./communityOfficialStore');
      const offProfile = getOfficialProfile(req.user_id);
      if (offProfile) {
        locStr = offProfile.location || (offProfile.latitude && offProfile.longitude ? `${offProfile.latitude},${offProfile.longitude}` : '');
        coordsObj = offProfile.coordinates || (offProfile.latitude && offProfile.longitude ? { lat: offProfile.latitude, lng: offProfile.longitude } : null);
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    ...req,
    activity_type: activityType,
    special_instructions: specialInstructions,
    description: description,
    activity_description: description,
    target_start_date: startDate,
    preferred_start_date: startDate,
    target_end_date: endDate,
    preferred_end_date: endDate,
    skills_required: skills,
    needed_skills: skills,
    complete_address: completeAddress,
    community_address: completeAddress,
    location: locStr,
    coordinates: coordsObj
  };
}

/**
 * Creates a new community request
 * @param {string} userId - Community Official user ID
 * @param {object} requestData - Request data
 * @returns {Promise<object>} Created request
 */
async function createCommunityRequest(userId, requestData) {
  try {
    // Validate request data
    const validation = validateCommunityRequest(requestData);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    const activityTitle = (requestData.activity_title || '').trim();
    const activityDesc = (requestData.activity_description || requestData.description || '').trim();
    const activityType = (requestData.activity_type || requestData.request_type || '').trim();
    const startDate = requestData.preferred_start_date || requestData.target_start_date || requestData.date;
    const endDate = requestData.preferred_end_date || requestData.target_end_date || startDate;

    // Auto-resolve skills from coordinator's request types if not provided
    let neededSkills = Array.isArray(requestData.needed_skills)
      ? requestData.needed_skills
      : (Array.isArray(requestData.skills_required) ? requestData.skills_required : []);

    if (neededSkills.length === 0 && activityType) {
      try {
        const { getRequestTypes } = require('./requestTypeService');
        const allTypes = await getRequestTypes({ is_active: true });
        const matched = allTypes.find(t => t.name.toLowerCase() === activityType.toLowerCase());
        if (matched && Array.isArray(matched.required_skills) && matched.required_skills.length > 0) {
          neededSkills = matched.required_skills;
        }
      } catch (err) {
        console.warn('Could not auto-resolve skills from request type:', err.message);
      }
    }

    // Community location fallback
    let commName = (requestData.community_name || '').trim();
    let commAddr = (requestData.community_address || requestData.complete_address || '').trim();
    let brgy = (requestData.barangay || '').trim();
    let mun = (requestData.municipality || '').trim();
    let prov = (requestData.province || '').trim() || 'Laguna';

    try {
      const { getOfficialProfile } = require('./communityOfficialStore');
      const offProfile = getOfficialProfile(userId);
      if (offProfile) {
        if (!commName && offProfile.community_name) commName = offProfile.community_name;
        if (!brgy && offProfile.barangay) brgy = offProfile.barangay;
        if (!mun && offProfile.municipality) mun = offProfile.municipality;
        if ((!prov || prov === 'Laguna') && offProfile.province) prov = offProfile.province;
        if (!commAddr && brgy && mun) commAddr = `Barangay ${brgy}, ${mun}, ${prov}`;
      }
    } catch (e) {
      // ignore
    }

    if (!commName || !commAddr || !brgy || !mun) {
      try {
        const { data: prevReq } = await supabase
          .from('community_requests')
          .select('community_name, community_address, barangay, municipality, province')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevReq) {
          if (!commName && prevReq.community_name) commName = prevReq.community_name;
          if (!commAddr && prevReq.community_address) commAddr = prevReq.community_address;
          if (!brgy && prevReq.barangay) brgy = prevReq.barangay;
          if (!mun && prevReq.municipality) mun = prevReq.municipality;
          if (!prov && prevReq.province) prov = prevReq.province;
        }
      } catch (e) {
        // ignore
      }

      if (!commName) commName = 'Community Partner';
      if (!commAddr) commAddr = 'Barangay Center';
      if (!brgy) brgy = 'Poblacion';
      if (!mun) mun = 'Santa Cruz';
    }

    // Prepare request data for database
    const dbRequestData = {
      user_id: userId,
      community_name: commName,
      community_address: commAddr,
      barangay: brgy,
      municipality: mun,
      province: prov,
      activity_title: activityTitle,
      activity_description: activityDesc,
      activity_type: activityType,
      preferred_nstp_component: requestData.preferred_nstp_component || 'CWTS',
      students_needed: parseInt(requestData.students_needed, 10) || 15,
      preferred_start_date: startDate,
      preferred_end_date: endDate,
      preferred_schedule: (requestData.preferred_schedule || 'Flexible / As Scheduled').trim(),
      urgency_level: requestData.urgency_level || 'Medium',
      needed_skills: neededSkills,
      target_beneficiaries: (requestData.target_beneficiaries || 'Community Residents & Youth').trim(),
      special_instructions: requestData.special_instructions ? requestData.special_instructions.trim() : null,
      request_status: 'pending'
    };

    // Insert into database
    let { data: newRequest, error } = await supabase
      .from('community_requests')
      .insert(dbRequestData)
      .select()
      .single();

    // If check constraint fails on custom activity type, fallback to standard mapped type with custom type embedded in special_instructions
    if (error && error.message && error.message.includes('community_requests_activity_type_check')) {
      const fallbackType = getStandardActivityType(activityType);
      const existingInstructions = dbRequestData.special_instructions || '';
      const fallbackInstructions = existingInstructions 
        ? `${existingInstructions}\n[CUSTOM_REQUEST_TYPE:${activityType}]`
        : `[CUSTOM_REQUEST_TYPE:${activityType}]`;

      const fallbackData = {
        ...dbRequestData,
        activity_type: fallbackType,
        special_instructions: fallbackInstructions
      };

      const retryRes = await supabase
        .from('community_requests')
        .insert(fallbackData)
        .select()
        .single();

      if (retryRes.error) {
        throw new Error('Failed to create request: ' + retryRes.error.message);
      }
      newRequest = retryRes.data;
      error = null;
    }

    if (error) {
      throw new Error('Failed to create request: ' + error.message);
    }

    // Notify coordinators of new community request
    try {
      const { notifyCoordinators } = require('./notificationService');
      await notifyCoordinators({
        notification_type: 'system_announcement',
        title: 'New Community Request',
        message: `${commName || 'Barangay Official'} submitted a proposal for ${activityTitle}.`,
        related_request_id: newRequest.request_id,
        action_url: 'community-requests.html',
        action_label: 'Review Request'
      });
    } catch (notifErr) {
      console.warn('Failed to notify coordinators of request:', notifErr.message);
    }

    return normalizeRequestRecord(newRequest);
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets all requests for a Community Official
 * @param {string} userId - Community Official user ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of requests
 */
async function getCommunityRequests(userId, filters = {}) {
  try {
    let query = supabase
      .from('community_requests')
      .select('*')
      .eq('user_id', userId);

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('request_status', filters.status);
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`
        activity_title.ilike.%${filters.search}%,
        community_name.ilike.%${filters.search}%,
        activity_type.ilike.%${filters.search}%
      `);
    }

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: requests, error } = await query;

    if (error) {
      throw new Error('Failed to fetch requests: ' + error.message);
    }

    return (requests || []).map(normalizeRequestRecord);
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets a single request by ID
 * @param {string} requestId - Request ID
 * @param {string} userId - Community Official user ID
 * @returns {Promise<object>} Request details
 */
async function getCommunityRequestById(requestId, userId) {
  try {
    const { data: request, error } = await supabase
      .from('community_requests')
      .select('*')
      .eq('request_id', requestId)
      .eq('user_id', userId) // Ensure user can only access their own requests
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Request not found or access denied');
      }
      throw new Error('Failed to fetch request: ' + error.message);
    }

    return normalizeRequestRecord(request);
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Updates a community request
 * @param {string} requestId - Request ID
 * @param {string} userId - Community Official user ID
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} Updated request
 */
async function updateCommunityRequest(requestId, userId, updateData) {
  try {
    // Get current request
    const currentRequest = await getCommunityRequestById(requestId, userId);

    // Check if request can be edited
    if (!canEditRequest(currentRequest.request_status)) {
      throw new Error(`Cannot edit ${currentRequest.request_status} requests. Only pending or rejected requests can be edited.`);
    }

    // Validate update data
    const validation = validateCommunityRequest(updateData);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    const activityTitle = (updateData.activity_title || currentRequest.activity_title || '').trim();
    const activityDesc = (updateData.activity_description || updateData.description || currentRequest.activity_description || '').trim();
    const activityType = (updateData.activity_type || updateData.request_type || currentRequest.activity_type || '').trim();
    const startDate = updateData.preferred_start_date || updateData.target_start_date || updateData.date || currentRequest.preferred_start_date;
    const endDate = updateData.preferred_end_date || updateData.target_end_date || startDate;

    let neededSkills = Array.isArray(updateData.needed_skills)
      ? updateData.needed_skills
      : (Array.isArray(updateData.skills_required) ? updateData.skills_required : currentRequest.needed_skills || []);

    if (neededSkills.length === 0 && activityType) {
      try {
        const { getRequestTypes } = require('./requestTypeService');
        const allTypes = await getRequestTypes({ is_active: true });
        const matched = allTypes.find(t => t.name.toLowerCase() === activityType.toLowerCase());
        if (matched && Array.isArray(matched.required_skills) && matched.required_skills.length > 0) {
          neededSkills = matched.required_skills;
        }
      } catch (err) {
        // ignore
      }
    }

    // Prepare update data
    const dbUpdateData = {
      community_name: (updateData.community_name || currentRequest.community_name || 'Community Partner').trim(),
      community_address: (updateData.community_address || updateData.complete_address || currentRequest.community_address || 'Barangay Center').trim(),
      barangay: (updateData.barangay || currentRequest.barangay || 'Poblacion').trim(),
      municipality: (updateData.municipality || currentRequest.municipality || 'Santa Cruz').trim(),
      province: (updateData.province || currentRequest.province || 'Laguna').trim(),
      activity_title: activityTitle,
      activity_description: activityDesc,
      activity_type: activityType,
      preferred_nstp_component: updateData.preferred_nstp_component || currentRequest.preferred_nstp_component || 'CWTS',
      students_needed: parseInt(updateData.students_needed, 10) || currentRequest.students_needed || 15,
      preferred_start_date: startDate,
      preferred_end_date: endDate,
      preferred_schedule: (updateData.preferred_schedule || currentRequest.preferred_schedule || 'Flexible / As Scheduled').trim(),
      urgency_level: updateData.urgency_level || currentRequest.urgency_level || 'Medium',
      needed_skills: neededSkills,
      target_beneficiaries: (updateData.target_beneficiaries || currentRequest.target_beneficiaries || 'Community Residents & Youth').trim(),
      special_instructions: updateData.special_instructions !== undefined ? updateData.special_instructions : currentRequest.special_instructions,
      // Reset status to pending if it was rejected
      request_status: currentRequest.request_status === 'rejected' ? 'pending' : currentRequest.request_status,
      // Clear NSTP remarks if resubmitting
      nstp_remarks: currentRequest.request_status === 'rejected' ? null : currentRequest.nstp_remarks
    };

    // Update in database
    let { data: updatedRequest, error } = await supabase
      .from('community_requests')
      .update(dbUpdateData)
      .eq('request_id', requestId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error && error.message && error.message.includes('community_requests_activity_type_check')) {
      const fallbackType = getStandardActivityType(activityType);
      const existingInstructions = (dbUpdateData.special_instructions || '').replace(/\[CUSTOM_REQUEST_TYPE:.*?\]/g, '').trim();
      const fallbackInstructions = existingInstructions 
        ? `${existingInstructions}\n[CUSTOM_REQUEST_TYPE:${activityType}]`
        : `[CUSTOM_REQUEST_TYPE:${activityType}]`;

      const fallbackData = {
        ...dbUpdateData,
        activity_type: fallbackType,
        special_instructions: fallbackInstructions
      };

      const retryRes = await supabase
        .from('community_requests')
        .update(fallbackData)
        .eq('request_id', requestId)
        .eq('user_id', userId)
        .select()
        .single();

      if (retryRes.error) {
        throw new Error('Failed to update request: ' + retryRes.error.message);
      }
      updatedRequest = retryRes.data;
      error = null;
    }

    if (error) {
      throw new Error('Failed to update request: ' + error.message);
    }

    return normalizeRequestRecord(updatedRequest);
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Cancels a community request
 * @param {string} requestId - Request ID
 * @param {string} userId - Community Official user ID
 * @returns {Promise<object>} Cancelled request
 */
async function cancelCommunityRequest(requestId, userId) {
  try {
    // Get current request
    const currentRequest = await getCommunityRequestById(requestId, userId);

    // Check if request can be cancelled
    if (!canCancelRequest(currentRequest.request_status)) {
      throw new Error(`Cannot cancel ${currentRequest.request_status} requests. Only pending requests can be cancelled.`);
    }

    // Update status to cancelled
    const { data: cancelledRequest, error } = await supabase
      .from('community_requests')
      .update({ 
        request_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('request_id', requestId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to cancel request: ' + error.message);
    }

    return cancelledRequest;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Deletes a cancelled community request permanently
 * @param {string} requestId - Request ID
 * @param {string} userId - Community Official user ID
 * @returns {Promise<boolean>}
 */
async function deleteCommunityRequest(requestId, userId) {
  try {
    // Get current request to verify ownership and cancelled status
    const currentRequest = await getCommunityRequestById(requestId, userId);

    const status = (currentRequest.request_status || '').toLowerCase();
    if (status !== 'cancelled') {
      throw new Error(`Only cancelled requests can be deleted. Current status is ${currentRequest.request_status}.`);
    }

    // Delete from Supabase
    const { error } = await supabase
      .from('community_requests')
      .delete()
      .eq('request_id', requestId)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to delete request: ' + error.message);
    }

    return true;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets request summary statistics for a Community Official
 * @param {string} userId - Community Official user ID
 * @returns {Promise<object>} Summary statistics
 */
async function getRequestSummary(userId) {
  try {
    // 1. Fetch requests for this community official
    const { data: requests, error: reqError } = await supabase
      .from('community_requests')
      .select('request_id, request_status, activity_title')
      .eq('user_id', userId);

    if (reqError) {
      throw new Error('Failed to fetch requests: ' + reqError.message);
    }

    const reqList = requests || [];
    const totalRequests = reqList.length;
    let pendingRequests = 0;
    let approvedRequests = 0;
    let rejectedRequests = 0;

    const requestIds = [];
    reqList.forEach(r => {
      requestIds.push(r.request_id);
      if (r.request_status === 'pending') pendingRequests++;
      else if (r.request_status === 'approved') approvedRequests++;
      else if (r.request_status === 'rejected') rejectedRequests++;
    });

    let ongoingDeployments = 0;
    let scheduledDeployments = 0;
    let completedDeployments = 0;
    let totalDeployments = 0;
    let assignedStudents = 0;
    let totalHoursRendered = 0;
    let attendanceRecordsCount = 0;
    let verifiedAttendanceCount = 0;

    if (requestIds.length > 0) {
      // 2. Fetch deployments associated with these requests
      const { data: deployments } = await supabase
        .from('deployments')
        .select('deployment_id, deployment_status, deployment_start_date')
        .in('request_id', requestIds);

      const depList = deployments || [];
      totalDeployments = depList.length;
      const deploymentIds = [];

      depList.forEach(d => {
        deploymentIds.push(d.deployment_id);
        const st = (d.deployment_status || '').toLowerCase();
        if (st === 'active' || st === 'ongoing') ongoingDeployments++;
        else if (st === 'scheduled') scheduledDeployments++;
        else if (st === 'completed') completedDeployments++;
      });

      if (deploymentIds.length > 0) {
        // 3. Fetch assigned students in these deployments
        const { data: depStudents } = await supabase
          .from('deployment_students')
          .select('student_user_id')
          .in('deployment_id', deploymentIds);

        const uniqueStudentIds = new Set((depStudents || []).map(s => s.student_user_id));
        assignedStudents = uniqueStudentIds.size;

        // 4. Fetch attendance records in these deployments
        const { data: attRecords } = await supabase
          .from('attendance_records')
          .select('attendance_id, hours_rendered, student_remarks, verified_at, verified_by')
          .in('deployment_id', deploymentIds);

        const attList = attRecords || [];
        attendanceRecordsCount = attList.length;

        attList.forEach(att => {
          const isVerified = Boolean(
            att.verified_at ||
            att.verified_by ||
            (att.student_remarks && /\[CREDITED:[0-9.]+\]/i.test(att.student_remarks))
          );
          if (isVerified) verifiedAttendanceCount++;

          const match = String(att.student_remarks || '').match(/\[CREDITED:([0-9.]+)\]/i);
          const credited = match ? parseFloat(match[1]) : (Number(att.hours_rendered) || 0);
          totalHoursRendered += credited;
        });
      }
    }

    totalHoursRendered = Math.round(totalHoursRendered * 10) / 10;
    const attendanceRate = attendanceRecordsCount > 0 
      ? Math.round((verifiedAttendanceCount / attendanceRecordsCount) * 100) 
      : 100;

    return {
      total_requests: totalRequests,
      pending_requests: pendingRequests,
      approved_requests: approvedRequests,
      rejected_requests: rejectedRequests,
      completed_activities: completedDeployments,
      ongoing_deployments: ongoingDeployments,
      scheduled_deployments: scheduledDeployments,
      completed_deployments: completedDeployments,
      total_deployments: totalDeployments,
      assigned_students: assignedStudents,
      total_hours_rendered: totalHoursRendered,
      attendance_records_count: attendanceRecordsCount,
      verified_attendance_count: verifiedAttendanceCount,
      attendance_rate: attendanceRate
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets ALL community requests (for NSTP Officials)
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of all requests
 */
async function getAllCommunityRequests(filters = {}) {
  try {
    let query = supabase
      .from('community_requests')
      .select('*');

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('request_status', filters.status);
    }

    // Apply activity type filter
    if (filters.activity_type && filters.activity_type !== 'all') {
      query = query.eq('activity_type', filters.activity_type);
    }

    // Apply component filter
    if (filters.component && filters.component !== 'all') {
      query = query.eq('preferred_nstp_component', filters.component);
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`
        activity_title.ilike.%${filters.search}%,
        community_name.ilike.%${filters.search}%,
        municipality.ilike.%${filters.search}%
      `);
    }

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: requests, error } = await query;

    if (error) {
      throw new Error('Failed to fetch requests: ' + error.message);
    }

    return (requests || []).map(normalizeRequestRecord);
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets a single request by ID (for NSTP Officials - no user restriction)
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Request details
 */
async function getCommunityRequestByIdForNSTP(requestId) {
  try {
    const { data: request, error } = await supabase
      .from('community_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Request not found');
      }
      throw new Error('Failed to fetch request: ' + error.message);
    }

    // Get user email separately if needed
    if (request.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', request.user_id)
        .single();
      
      if (userData) {
        request.contact_person = userData.email;
        request.contact_email = userData.email;
      }
    }

    // Get reviewer email if reviewed
    if (request.reviewed_by) {
      const { data: reviewerData } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', request.reviewed_by)
        .single();
      
      if (reviewerData) {
        request.reviewed_by_name = reviewerData.email;
      }
    }

    return normalizeRequestRecord(request);
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Approves a community request (NSTP Official only)
 * @param {string} requestId - Request ID
 * @param {string} nstpUserId - NSTP Official user ID
 * @param {string} reviewNotes - Review notes
 * @returns {Promise<object>} Updated request
 */
async function approveCommunityRequest(requestId, nstpUserId, reviewNotes) {
  try {
    const notes = reviewNotes ? reviewNotes.trim() : null;
    const now = new Date().toISOString();
    const { data: updatedRequest, error } = await supabase
      .from('community_requests')
      .update({
        request_status: 'approved',
        reviewed_by: nstpUserId,
        review_notes: notes,
        nstp_remarks: notes,
        approved_by: nstpUserId,
        approved_at: now,
        reviewed_at: now,
        updated_at: now
      })
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to approve request: ' + error.message);
    }

    // Notify the community official of approval
    try {
      if (updatedRequest.user_id) {
        const { createNotification } = require('./notificationService');
        await createNotification({
          user_id: updatedRequest.user_id,
          notification_type: 'request_approved',
          title: 'Community Request Approved',
          message: `Your project proposal (${updatedRequest.activity_title}) has been approved by the NSTP Coordinator.`,
          related_request_id: updatedRequest.request_id,
          action_url: 'community-requests.html',
          action_label: 'View Request'
        });
      }
    } catch (notifErr) {
      console.warn('Failed to notify official of approval:', notifErr.message);
    }

    return updatedRequest;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Rejects a community request (NSTP Official only)
 * @param {string} requestId - Request ID
 * @param {string} nstpUserId - NSTP Official user ID
 * @param {string} reviewNotes - Review notes (optional, defaults if empty)
 * @returns {Promise<object>} Updated request
 */
async function rejectCommunityRequest(requestId, nstpUserId, reviewNotes) {
  try {
    const notes = (reviewNotes && reviewNotes.trim()) ? reviewNotes.trim() : 'Request reviewed and rejected by NSTP Coordinator.';
    const now = new Date().toISOString();

    const { data: updatedRequest, error } = await supabase
      .from('community_requests')
      .update({
        request_status: 'rejected',
        reviewed_by: nstpUserId,
        review_notes: notes,
        nstp_remarks: notes,
        reviewed_at: now,
        updated_at: now
      })
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to reject request: ' + error.message);
    }

    // Notify the community official of rejection
    try {
      if (updatedRequest.user_id) {
        const { createNotification } = require('./notificationService');
        await createNotification({
          user_id: updatedRequest.user_id,
          notification_type: 'request_rejected',
          title: 'Community Request Decision',
          message: `Your project proposal (${updatedRequest.activity_title}) was not approved. Remarks: ${notes}`,
          related_request_id: updatedRequest.request_id,
          action_url: 'community-requests.html',
          action_label: 'View Request'
        });
      }
    } catch (notifErr) {
      console.warn('Failed to notify official of rejection:', notifErr.message);
    }

    return updatedRequest;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  createCommunityRequest,
  getCommunityRequests,
  getCommunityRequestById,
  updateCommunityRequest,
  cancelCommunityRequest,
  deleteCommunityRequest,
  getRequestSummary,
  // NSTP Official methods
  getAllCommunityRequests,
  getCommunityRequestByIdForNSTP,
  approveCommunityRequest,
  rejectCommunityRequest
};