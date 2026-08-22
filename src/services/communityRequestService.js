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

    // Prepare request data for database
    const dbRequestData = {
      user_id: userId,
      community_name: requestData.community_name.trim(),
      community_address: requestData.community_address.trim(),
      barangay: requestData.barangay.trim(),
      municipality: requestData.municipality.trim(),
      province: requestData.province.trim(),
      activity_title: requestData.activity_title.trim(),
      activity_description: requestData.activity_description.trim(),
      activity_type: requestData.activity_type,
      preferred_nstp_component: requestData.preferred_nstp_component,
      students_needed: parseInt(requestData.students_needed),
      preferred_start_date: requestData.preferred_start_date,
      preferred_end_date: requestData.preferred_end_date,
      preferred_schedule: requestData.preferred_schedule.trim(),
      urgency_level: requestData.urgency_level,
      needed_skills: requestData.needed_skills || [],
      target_beneficiaries: requestData.target_beneficiaries.trim(),
      special_instructions: requestData.special_instructions ? requestData.special_instructions.trim() : null,
      request_status: 'pending'
    };

    // Insert into database
    const { data: newRequest, error } = await supabase
      .from('community_requests')
      .insert(dbRequestData)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create request: ' + error.message);
    }

    return newRequest;
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

    return requests || [];
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

    return request;
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

    // Prepare update data
    const dbUpdateData = {
      community_name: updateData.community_name.trim(),
      community_address: updateData.community_address.trim(),
      barangay: updateData.barangay.trim(),
      municipality: updateData.municipality.trim(),
      province: updateData.province.trim(),
      activity_title: updateData.activity_title.trim(),
      activity_description: updateData.activity_description.trim(),
      activity_type: updateData.activity_type,
      preferred_nstp_component: updateData.preferred_nstp_component,
      students_needed: parseInt(updateData.students_needed),
      preferred_start_date: updateData.preferred_start_date,
      preferred_end_date: updateData.preferred_end_date,
      preferred_schedule: updateData.preferred_schedule.trim(),
      urgency_level: updateData.urgency_level,
      needed_skills: updateData.needed_skills || [],
      target_beneficiaries: updateData.target_beneficiaries.trim(),
      special_instructions: updateData.special_instructions ? updateData.special_instructions.trim() : null,
      // Reset status to pending if it was rejected
      request_status: currentRequest.request_status === 'rejected' ? 'pending' : currentRequest.request_status,
      // Clear NSTP remarks if resubmitting
      nstp_remarks: currentRequest.request_status === 'rejected' ? null : currentRequest.nstp_remarks
    };

    // Update in database
    const { data: updatedRequest, error } = await supabase
      .from('community_requests')
      .update(dbUpdateData)
      .eq('request_id', requestId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update request: ' + error.message);
    }

    return updatedRequest;
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
 * Gets request summary statistics for a Community Official
 * @param {string} userId - Community Official user ID
 * @returns {Promise<object>} Summary statistics
 */
async function getRequestSummary(userId) {
  try {
    const { data, error } = await supabase
      .rpc('get_community_request_summary', { community_official_id: userId });

    if (error) {
      throw new Error('Failed to fetch request summary: ' + error.message);
    }

    // Return the first row (should only be one)
    return data[0] || {
      total_requests: 0,
      pending_requests: 0,
      approved_requests: 0,
      rejected_requests: 0,
      completed_activities: 0
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

    return requests || [];
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

    return request;
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
    const { data: updatedRequest, error } = await supabase
      .from('community_requests')
      .update({
        request_status: 'approved',
        reviewed_by: nstpUserId,
        review_notes: reviewNotes || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to approve request: ' + error.message);
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
 * @param {string} reviewNotes - Review notes (required for rejection)
 * @returns {Promise<object>} Updated request
 */
async function rejectCommunityRequest(requestId, nstpUserId, reviewNotes) {
  try {
    if (!reviewNotes || reviewNotes.trim() === '') {
      throw new Error('Review notes are required when rejecting a request');
    }

    const { data: updatedRequest, error } = await supabase
      .from('community_requests')
      .update({
        request_status: 'rejected',
        reviewed_by: nstpUserId,
        review_notes: reviewNotes.trim(),
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('request_id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to reject request: ' + error.message);
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
  getRequestSummary,
  // NSTP Official methods
  getAllCommunityRequests,
  getCommunityRequestByIdForNSTP,
  approveCommunityRequest,
  rejectCommunityRequest
};