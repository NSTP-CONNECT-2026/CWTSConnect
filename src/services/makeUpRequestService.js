/**
 * NSTPConnect - Make-up Request Service
 * Handles make-up session requests business logic
 */

const supabase = require('../config/supabaseClient');

/**
 * Gets make-up requests for a deployment
 * @param {string} deploymentId - Deployment ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of make-up requests
 */
async function getMakeUpRequests(deploymentId, filters = {}) {
  try {
    let query = supabase
      .from('make_up_requests')
      .select(`
        *,
        student:users!make_up_requests_student_user_id_fkey(
          user_id,
          email,
          student_profiles(*)
        ),
        attendance:attendance_records(
          attendance_date,
          attendance_status
        ),
        reviewer:users!make_up_requests_reviewed_by_fkey(
          email
        )
      `)
      .eq('deployment_id', deploymentId);

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('request_status', filters.status);
    }

    // Apply student filter
    if (filters.student_id) {
      query = query.eq('student_user_id', filters.student_id);
    }

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: requests, error } = await query;

    if (error) {
      throw new Error('Failed to fetch make-up requests: ' + error.message);
    }

    // Transform data
    const transformed = (requests || []).map(request => {
      const student = request.student;
      const profile = student?.student_profiles?.[0];

      return {
        make_up_id: request.make_up_id,
        attendance_id: request.attendance_id,
        student_user_id: request.student_user_id,
        student_name: profile?.full_name || 'Unknown',
        student_number: profile?.student_number || 'N/A',
        student_email: student?.email || 'N/A',
        deployment_id: request.deployment_id,
        missed_date: request.missed_date,
        reason: request.reason,
        proposed_make_up_date: request.proposed_make_up_date,
        proposed_make_up_time: request.proposed_make_up_time,
        request_status: request.request_status,
        reviewed_by: request.reviewed_by,
        reviewed_by_email: request.reviewer?.email || null,
        reviewed_at: request.reviewed_at,
        nstp_remarks: request.nstp_remarks,
        actual_make_up_date: request.actual_make_up_date,
        actual_make_up_time: request.actual_make_up_time,
        hours_rendered: request.hours_rendered,
        completion_verified: request.completion_verified,
        created_at: request.created_at,
        updated_at: request.updated_at
      };
    });

    return transformed;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets student's make-up requests
 * @param {string} studentId - Student user ID
 * @param {string} deploymentId - Optional deployment ID filter
 * @returns {Promise<Array>} Array of make-up requests
 */
async function getStudentMakeUpRequests(studentId, deploymentId = null) {
  try {
    let query = supabase
      .from('make_up_requests')
      .select(`
        *,
        deployment:deployments(
          deployment_batch_name,
          community_request:community_requests(
            community_name,
            activity_title
          )
        )
      `)
      .eq('student_user_id', studentId);

    if (deploymentId) {
      query = query.eq('deployment_id', deploymentId);
    }

    query = query.order('created_at', { ascending: false });

    const { data: requests, error } = await query;

    if (error) {
      throw new Error('Failed to fetch student make-up requests: ' + error.message);
    }

    return requests || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Creates a make-up request
 * @param {string} studentId - Student user ID
 * @param {object} requestData - Make-up request data
 * @returns {Promise<object>} Created make-up request
 */
async function createMakeUpRequest(studentId, requestData) {
  try {
    // Validate required fields
    if (!requestData.attendance_id) {
      throw new Error('Attendance ID is required');
    }
    if (!requestData.deployment_id) {
      throw new Error('Deployment ID is required');
    }
    if (!requestData.missed_date) {
      throw new Error('Missed date is required');
    }
    if (!requestData.reason || requestData.reason.trim().length < 10) {
      throw new Error('Reason must be at least 10 characters long');
    }

    // Check if attendance record exists and is absent
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('attendance_status')
      .eq('attendance_id', requestData.attendance_id)
      .eq('student_user_id', studentId)
      .single();

    if (attendanceError) {
      throw new Error('Attendance record not found');
    }

    if (attendance.attendance_status !== 'absent') {
      throw new Error('Make-up requests can only be created for absent records');
    }

    // Check if make-up request already exists for this attendance
    const { data: existing } = await supabase
      .from('make_up_requests')
      .select('make_up_id')
      .eq('attendance_id', requestData.attendance_id)
      .in('request_status', ['pending', 'approved'])
      .single();

    if (existing) {
      throw new Error('A make-up request already exists for this attendance record');
    }

    // Create make-up request
    const { data: request, error } = await supabase
      .from('make_up_requests')
      .insert({
        attendance_id: requestData.attendance_id,
        student_user_id: studentId,
        deployment_id: requestData.deployment_id,
        missed_date: requestData.missed_date,
        reason: requestData.reason.trim(),
        proposed_make_up_date: requestData.proposed_make_up_date || null,
        proposed_make_up_time: requestData.proposed_make_up_time || null,
        request_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create make-up request: ' + error.message);
    }

    // Update attendance status to make_up_pending
    await supabase
      .from('attendance_records')
      .update({ attendance_status: 'make_up_pending' })
      .eq('attendance_id', requestData.attendance_id);

    return request;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Reviews a make-up request (approve/reject)
 * @param {string} makeUpId - Make-up request ID
 * @param {string} reviewedBy - NSTP Official user ID
 * @param {object} reviewData - Review data
 * @returns {Promise<object>} Updated make-up request
 */
async function reviewMakeUpRequest(makeUpId, reviewedBy, reviewData) {
  try {
    const { status, remarks, actual_make_up_date, actual_make_up_time } = reviewData;

    if (!status || !['approved', 'rejected'].includes(status)) {
      throw new Error('Invalid review status');
    }

    // Get current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('make_up_requests')
      .select('request_status, attendance_id')
      .eq('make_up_id', makeUpId)
      .single();

    if (fetchError) {
      throw new Error('Make-up request not found');
    }

    if (currentRequest.request_status !== 'pending') {
      throw new Error('Only pending requests can be reviewed');
    }

    // Update make-up request
    const { data: request, error } = await supabase
      .from('make_up_requests')
      .update({
        request_status: status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        nstp_remarks: remarks || null,
        actual_make_up_date: actual_make_up_date || null,
        actual_make_up_time: actual_make_up_time || null
      })
      .eq('make_up_id', makeUpId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to review make-up request: ' + error.message);
    }

    // Update attendance status based on review
    if (status === 'rejected') {
      await supabase
        .from('attendance_records')
        .update({ attendance_status: 'absent' })
        .eq('attendance_id', currentRequest.attendance_id);
    }

    // Send notification
    await supabase.rpc('notify_make_up_status', {
      target_make_up_id: makeUpId,
      new_status: status
    });

    return request;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Records make-up session completion
 * @param {string} makeUpId - Make-up request ID
 * @param {object} completionData - Completion data
 * @param {string} verifiedBy - NSTP Official user ID
 * @returns {Promise<object>} Updated make-up request
 */
async function recordMakeUpCompletion(makeUpId, completionData, verifiedBy) {
  try {
    // Get current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('make_up_requests')
      .select('request_status, attendance_id, student_user_id, deployment_id')
      .eq('make_up_id', makeUpId)
      .single();

    if (fetchError) {
      throw new Error('Make-up request not found');
    }

    if (currentRequest.request_status !== 'approved') {
      throw new Error('Only approved requests can be completed');
    }

    // Update make-up request
    const { data: request, error } = await supabase
      .from('make_up_requests')
      .update({
        request_status: 'completed',
        hours_rendered: completionData.hours_rendered || 0,
        completion_verified: true,
        nstp_remarks: completionData.remarks || null
      })
      .eq('make_up_id', makeUpId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to record completion: ' + error.message);
    }

    // Update attendance status to make_up_completed
    await supabase
      .from('attendance_records')
      .update({
        attendance_status: 'make_up_completed',
        hours_rendered: completionData.hours_rendered || 0,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString()
      })
      .eq('attendance_id', currentRequest.attendance_id);

    return request;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Cancels a make-up request
 * @param {string} makeUpId - Make-up request ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<object>} Updated make-up request
 */
async function cancelMakeUpRequest(makeUpId, studentId) {
  try {
    // Get current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('make_up_requests')
      .select('request_status, attendance_id, student_user_id')
      .eq('make_up_id', makeUpId)
      .single();

    if (fetchError) {
      throw new Error('Make-up request not found');
    }

    if (currentRequest.student_user_id !== studentId) {
      throw new Error('Unauthorized to cancel this request');
    }

    if (currentRequest.request_status !== 'pending') {
      throw new Error('Only pending requests can be cancelled');
    }

    // Update make-up request
    const { data: request, error } = await supabase
      .from('make_up_requests')
      .update({ request_status: 'cancelled' })
      .eq('make_up_id', makeUpId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to cancel make-up request: ' + error.message);
    }

    // Update attendance status back to absent
    await supabase
      .from('attendance_records')
      .update({ attendance_status: 'absent' })
      .eq('attendance_id', currentRequest.attendance_id);

    return request;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets make-up request statistics for a deployment
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<object>} Make-up statistics
 */
async function getMakeUpStatistics(deploymentId) {
  try {
    const { data: requests, error } = await supabase
      .from('make_up_requests')
      .select('request_status')
      .eq('deployment_id', deploymentId);

    if (error) {
      throw new Error('Failed to fetch make-up statistics: ' + error.message);
    }

    const allRequests = requests || [];
    
    return {
      total_requests: allRequests.length,
      pending_requests: allRequests.filter(r => r.request_status === 'pending').length,
      approved_requests: allRequests.filter(r => r.request_status === 'approved').length,
      rejected_requests: allRequests.filter(r => r.request_status === 'rejected').length,
      completed_requests: allRequests.filter(r => r.request_status === 'completed').length,
      cancelled_requests: allRequests.filter(r => r.request_status === 'cancelled').length
    };
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  getMakeUpRequests,
  getStudentMakeUpRequests,
  createMakeUpRequest,
  reviewMakeUpRequest,
  recordMakeUpCompletion,
  cancelMakeUpRequest,
  getMakeUpStatistics
};