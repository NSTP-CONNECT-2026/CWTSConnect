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
 * Automatically syncs deployment statuses based on the deployment schedule:
 * - 'pending' deployments automatically become 'active' once the start date arrives (deployment_start_date <= today).
 * - 'active' or 'ongoing' deployments automatically become 'completed' once the end date has passed (deployment_end_date < today).
 * - Past 'pending' deployments whose end date has passed automatically become 'completed'.
 */
async function syncDeploymentStatusesBySchedule() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const today = formatter.format(new Date());

    // 1. Auto-complete: Any deployment whose end date (or start date if null end date) has passed (< today)
    const { data: toCompleteEnd, error: compErrEnd } = await supabase
      .from('deployments')
      .select('deployment_id')
      .in('deployment_status', ['pending', 'active', 'ongoing'])
      .lt('deployment_end_date', today);

    const { data: toCompleteStart, error: compErrStart } = await supabase
      .from('deployments')
      .select('deployment_id')
      .in('deployment_status', ['pending', 'active', 'ongoing'])
      .is('deployment_end_date', null)
      .lt('deployment_start_date', today);

    const allToComplete = [
      ...(toCompleteEnd || []),
      ...(toCompleteStart || [])
    ];

    if (allToComplete.length > 0) {
      const compIds = Array.from(new Set(allToComplete.map(d => d.deployment_id)));
      await supabase
        .from('deployments')
        .update({
          deployment_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .in('deployment_id', compIds);

      await supabase
        .from('deployment_students')
        .update({ deployment_student_status: 'completed', updated_at: new Date().toISOString() })
        .in('deployment_id', compIds)
        .in('deployment_student_status', ['assigned', 'active', 'pending']);
    }

    // 2. Auto-activate: Any pending deployment whose start date has arrived (<= today) and end date >= today
    const { data: toActivate, error: actErr } = await supabase
      .from('deployments')
      .select('deployment_id')
      .eq('deployment_status', 'pending')
      .lte('deployment_start_date', today)
      .gte('deployment_end_date', today);

    if (!actErr && toActivate && toActivate.length > 0) {
      const actIds = toActivate.map(d => d.deployment_id);
      await supabase
        .from('deployments')
        .update({
          deployment_status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('deployment_id', actIds);

      await supabase
        .from('deployment_students')
        .update({ deployment_student_status: 'active' })
        .in('deployment_id', actIds)
        .eq('deployment_student_status', 'assigned');
    }
  } catch (err) {
    console.warn('Auto-sync deployment statuses warning:', err.message);
  }
}

/**
 * Gets deployment dashboard summary statistics
 * @returns {Promise<object>} Dashboard summary data
 */
async function getDeploymentDashboardSummary() {
  try {
    await syncDeploymentStatusesBySchedule();

    let summary = {
      total_deployments: 0,
      active_deployments: 0,
      completed_deployments: 0,
      pending_deployments: 0,
      assigned_students: 0,
      approved_requests: 0
    };

    // Try RPC first
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_deployment_dashboard_summary');

      if (!rpcError && rpcData && rpcData.length > 0) {
        summary.total_deployments = parseInt(rpcData[0].total_deployments, 10) || 0;
        summary.active_deployments = parseInt(rpcData[0].active_deployments, 10) || 0;
        summary.completed_deployments = parseInt(rpcData[0].completed_deployments, 10) || 0;
        summary.pending_deployments = parseInt(rpcData[0].pending_deployments, 10) || 0;
        summary.assigned_students = parseInt(rpcData[0].assigned_students, 10) || 0;
      }
    } catch (rpcErr) {
      console.warn('RPC get_deployment_dashboard_summary fallback:', rpcErr.message);
    }

    // Direct counts fallback / enhancement
    try {
      const { count: totalDeps } = await supabase.from('deployments').select('*', { count: 'exact', head: true });
      const { count: actDeps } = await supabase.from('deployments').select('*', { count: 'exact', head: true }).in('deployment_status', ['active', 'ongoing']);
      const { count: pendDeps } = await supabase.from('deployments').select('*', { count: 'exact', head: true }).eq('deployment_status', 'pending');
      const { count: compDeps } = await supabase.from('deployments').select('*', { count: 'exact', head: true }).eq('deployment_status', 'completed');
      const { count: stCount } = await supabase.from('deployment_students').select('*', { count: 'exact', head: true }).in('deployment_student_status', ['assigned', 'active']);

      if (totalDeps !== null && totalDeps !== undefined) summary.total_deployments = totalDeps;
      if (actDeps !== null && actDeps !== undefined) summary.active_deployments = actDeps;
      if (pendDeps !== null && pendDeps !== undefined) summary.pending_deployments = pendDeps;
      if (compDeps !== null && compDeps !== undefined) summary.completed_deployments = compDeps;
      if (stCount !== null && stCount !== undefined) summary.assigned_students = stCount;

      const { count: reqCount } = await supabase
        .from('community_requests')
        .select('*', { count: 'exact', head: true })
        .eq('request_status', 'approved');
      summary.approved_requests = reqCount || 0;
    } catch (e) {
      console.warn('Direct count fallback error:', e.message);
    }

    return summary;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets all deployments with optional filtering and search
 * @param {object} options - Query options
 * @returns {Promise<Array>} Array of deployments
 */
async function getDeployments(options = {}) {
  try {
    await syncDeploymentStatusesBySchedule();

    let query = supabase
      .from('deployment_management_view')
      .select('*');

    // Apply status filter
    if (options.status && options.status !== 'all') {
      if (options.status === 'active') {
        query = query.in('deployment_status', ['active', 'ongoing']);
      } else {
        query = query.eq('deployment_status', options.status);
      }
    }

    // Apply search filter
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`deployment_batch_name.ilike.%${term}%,community_name.ilike.%${term}%,activity_title.ilike.%${term}%`);
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
      // Fallback direct table query if view has issue
      console.warn('deployment_management_view error, using table fallback:', error.message);
      const fallbackQuery = supabase
        .from('deployments')
        .select(`
          *,
          community_requests:request_id(
            community_name,
            activity_title,
            activity_type,
            municipality,
            province,
            preferred_nstp_component,
            students_needed
          )
        `)
        .order('created_at', { ascending: false });

      const { data: fallbackData, error: fbError } = await fallbackQuery;
      if (fbError) throw new Error(fbError.message);

      return (fallbackData || []).map(d => ({
        deployment_id: d.deployment_id,
        request_id: d.request_id,
        deployment_batch_name: d.deployment_batch_name,
        deployment_status: d.deployment_status,
        deployment_start_date: d.deployment_start_date,
        deployment_end_date: d.deployment_end_date,
        assigned_by: d.assigned_by,
        notes: d.notes,
        created_at: d.created_at,
        updated_at: d.updated_at,
        community_name: d.community_requests?.community_name || '',
        activity_title: d.community_requests?.activity_title || '',
        activity_type: d.community_requests?.activity_type || '',
        municipality: d.community_requests?.municipality || '',
        province: d.community_requests?.province || '',
        preferred_nstp_component: d.community_requests?.preferred_nstp_component || '',
        students_needed: d.community_requests?.students_needed || 0,
        assigned_students: 0
      }));
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

    let candidateRequests = [];
    if (error) {
      console.warn('deployable_requests_view error, fallback to direct query:', error.message);
      const { data: directReqs, error: directErr } = await supabase
        .from('community_requests')
        .select('*')
        .eq('request_status', 'approved')
        .order('created_at', { ascending: true });

      if (directErr) throw new Error(directErr.message);
      candidateRequests = directReqs || [];
    } else {
      candidateRequests = requests || [];
    }

    if (candidateRequests.length === 0) return [];

    // Filter out requests that are already deployed or expired
    const { data: allDeployments } = await supabase
      .from('deployments')
      .select('deployment_id, request_id');

    const deployedIds = new Set((allDeployments || []).map(d => d.request_id).filter(Boolean));
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const filtered = candidateRequests.filter(r => {
      if (deployedIds.has(r.request_id)) return false;
      if (r.deployment_status && r.deployment_status !== 'no_deployment') return false;
      const s = (r.request_status || '').toLowerCase();
      if (['expired', 'lapsed', 'cancelled', 'rejected'].includes(s)) return false;
      const dateStr = (r.preferred_end_date || r.preferred_start_date || r.target_start_date || '').split('T')[0];
      if (dateStr && dateStr < todayStr) return false;
      return true;
    });

    return filtered;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets DSS recommendations for a specific request using exact SAW Suitability Rankings per SOURCE CODE.TXT
 * @param {string} requestId - Community request ID
 * @returns {Promise<Array>} Array of DSS recommendations with exact suitabilityScore
 */
async function getDSSRecommendationsForDeployment(requestId) {
  try {
    const { computeSawSuitabilityRankings } = require('../utils/matchingScoreUtils');

    // 1. Fetch community request criteria
    const { data: request, error: reqError } = await supabase
      .from('community_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (reqError || !request) {
      throw new Error('Community request not found: ' + (reqError ? reqError.message : ''));
    }

    // Enrich request with official's pinned coordinates and location for precise SAW distance calculation
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

    // 2. Fetch eligible candidates (Profile complete & CMO compliant, excluding date conflicts)
    const dssMatchingService = require('./dssMatchingService');
    const eligibleStudents = await dssMatchingService.getEligibleStudents(request);

    if (!eligibleStudents || eligibleStudents.length === 0) {
      return [];
    }

    // Filter by relevant NSTP component if applicable
    const relevantStudents = eligibleStudents.filter(student => {
      if (!student.nstp_component || !request.preferred_nstp_component) {
        return true;
      }
      const studentComp = student.nstp_component.toUpperCase().trim();
      const preferredComp = request.preferred_nstp_component.toUpperCase().trim();
      if (preferredComp === 'BOTH') return true;
      return studentComp === preferredComp;
    });

    const studentsToRank = relevantStudents.length > 0 ? relevantStudents : eligibleStudents;

    // 3. Compute exact SAW Suitability Rankings
    const rankedRecommendations = computeSawSuitabilityRankings(studentsToRank, request);

    // 4. Mark active availability based on the target request's schedule/date
    for (const rec of rankedRecommendations) {
      const hasActiveDeployment = await checkStudentActiveDeployment(
        rec.student_user_id,
        request.preferred_start_date,
        request.preferred_schedule
      );
      rec.is_available = !hasActiveDeployment;
    }

    return rankedRecommendations;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Checks if student has active deployment that conflicts with a specific date/schedule
 * @param {string} studentId - Student user ID
 * @param {string} [targetDate] - Optional date of activity (YYYY-MM-DD)
 * @param {string} [targetSchedule] - Optional schedule string
 * @returns {Promise<boolean>} True if student has conflicting active deployment
 */
async function checkStudentActiveDeployment(studentId, targetDate, targetSchedule) {
  try {
    const { hasDeploymentScheduleConflict } = require('./dssMatchingService');

    // Fetch active assignments with their deployment dates
    const { data: activeAssignments, error: assError } = await supabase
      .from('deployment_students')
      .select(`
        deployment_student_id,
        deployment:deployments!inner(
          deployment_id,
          deployment_batch_name,
          deployment_status,
          deployment_start_date,
          deployment_end_date,
          notes,
          request_id,
          community_requests(activity_title, preferred_start_date, preferred_schedule)
        )
      `)
      .eq('student_user_id', studentId)
      .in('deployment_student_status', ['assigned', 'active'])
      .in('deployments.deployment_status', ['pending', 'active', 'ongoing']);

    if (assError || !activeAssignments || activeAssignments.length === 0) {
      return false;
    }

    // If target date is supplied, only conflict if on the same day or date!
    if (targetDate) {
      const targetReq = {
        preferred_start_date: targetDate,
        preferred_schedule: targetSchedule || ''
      };

      for (const item of activeAssignments) {
        if (item.deployment && hasDeploymentScheduleConflict(targetReq, item.deployment)) {
          return true;
        }
      }
      return false;
    }

    // Fallback if no target date: student has at least one active deployment
    return true;
  } catch (error) {
    return false;
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
      .limit(1);

    if (existingDeployment && existingDeployment.length > 0) {
      throw new Error('This community request already has an active deployment batch');
    }

    // Validate deployment capacity
    const capacityValidation = validateDeploymentCapacity(
      request.students_needed,
      deploymentData.selected_students.length
    );
    if (!capacityValidation.isValid) {
      throw new Error('Capacity validation failed: ' + capacityValidation.errors.join(', '));
    }

    const startDate = deploymentData.deployment_start_date ? String(deploymentData.deployment_start_date).split('T')[0] : (request.preferred_start_date ? String(request.preferred_start_date).split('T')[0] : new Date().toISOString().split('T')[0]);
    const endDate = deploymentData.deployment_end_date ? String(deploymentData.deployment_end_date).split('T')[0] : startDate;
    const targetSchedule = deploymentData.notes || request.preferred_schedule || '';

    // Validate selected students eligibility
    const studentValidationPromises = deploymentData.selected_students.map(async (studentId) => {
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

      if (studentError || !student) {
        throw new Error(`Student ${studentId} not found or invalid`);
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
        throw new Error(`Student ${student.email} has no profile setup`);
      }

      // Check active deployment on the same date/day
      const hasActiveDeployment = await checkStudentActiveDeployment(studentId, startDate, targetSchedule);
      if (hasActiveDeployment) {
        throw new Error(`Student ${profile.full_name || student.email} is already deployed on this scheduled date (${startDate})`);
      }

      return student;
    });

    await Promise.all(studentValidationPromises);

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const today = formatter.format(new Date());

    // Automatic status determination:
    // If start date has arrived (startDate <= today): immediately 'active'
    // If scheduled for future: 'pending'
    const initialStatus = (startDate <= today) ? 'active' : 'pending';
    const initialStudentStatus = (initialStatus === 'active') ? 'active' : 'assigned';

    // Create deployment record
    const { data: newDeployment, error: deploymentError } = await supabase
      .from('deployments')
      .insert({
        request_id: deploymentData.request_id,
        deployment_batch_name: deploymentData.deployment_batch_name.trim(),
        deployment_start_date: startDate,
        deployment_end_date: endDate,
        assigned_by: assignedBy,
        notes: deploymentData.notes ? deploymentData.notes.trim() : null,
        deployment_status: initialStatus
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
      deployment_student_status: initialStudentStatus
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

    // Dispatch notifications to assigned students and community official
    try {
      const notificationService = require('./notificationService');
      for (const stId of deploymentData.selected_students) {
        await notificationService.createNotification({
          user_id: stId,
          title: 'Deployment Assignment',
          message: `You have been officially assigned to CWTS deployment batch: ${newDeployment.deployment_batch_name}`,
          notification_type: 'deployment_assigned',
          related_deployment_id: newDeployment.deployment_id,
          action_url: 'deployment.html',
          action_label: 'View Deployment'
        });
      }

      // Notify community official
      if (newDeployment.request_id) {
        const { data: reqData } = await supabase
          .from('community_requests')
          .select('user_id, activity_title')
          .eq('request_id', newDeployment.request_id)
          .maybeSingle();

        if (reqData && reqData.user_id) {
          await notificationService.createNotification({
            user_id: reqData.user_id,
            title: 'Volunteers Deployed',
            message: `Student volunteers have been officially assigned and deployed to your request: ${reqData.activity_title || newDeployment.deployment_batch_name}.`,
            notification_type: 'deployment_assigned',
            related_deployment_id: newDeployment.deployment_id,
            related_request_id: newDeployment.request_id,
            action_url: 'deployments.html',
            action_label: 'View Deployments'
          });
        }
      }
    } catch (notifErr) {
      console.warn('Deployment notification dispatched with warning:', notifErr.message);
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
    await syncDeploymentStatusesBySchedule();

    let deployment = null;

    // Try RPC first
    try {
      const { data: deploymentDetails, error: detailsError } = await supabase
        .rpc('get_deployment_details', { target_deployment_id: deploymentId });

      if (!detailsError && deploymentDetails && deploymentDetails.length > 0) {
        deployment = deploymentDetails[0];
      }
    } catch (rpcErr) {
      console.warn('RPC get_deployment_details fallback:', rpcErr.message);
    }

    // Direct table fetch fallback
    if (!deployment) {
      const { data: directDep, error: depErr } = await supabase
        .from('deployments')
        .select(`
          *,
          community_requests:request_id(
            community_name,
            activity_title,
            activity_type,
            community_address,
            municipality,
            province,
            preferred_nstp_component,
            students_needed
          )
        `)
        .eq('deployment_id', deploymentId)
        .single();

      if (depErr || !directDep) {
        throw new Error('Deployment not found');
      }

      deployment = {
        deployment_id: directDep.deployment_id,
        request_id: directDep.request_id,
        deployment_batch_name: directDep.deployment_batch_name,
        deployment_status: directDep.deployment_status,
        deployment_start_date: directDep.deployment_start_date,
        deployment_end_date: directDep.deployment_end_date,
        assigned_by: directDep.assigned_by,
        notes: directDep.notes,
        created_at: directDep.created_at,
        updated_at: directDep.updated_at,
        community_name: directDep.community_requests?.community_name || '',
        activity_title: directDep.community_requests?.activity_title || '',
        activity_type: directDep.community_requests?.activity_type || '',
        community_address: directDep.community_requests?.community_address || '',
        barangay: directDep.community_requests?.barangay || '',
        municipality: directDep.community_requests?.municipality || '',
        province: directDep.community_requests?.province || '',
        preferred_nstp_component: directDep.community_requests?.preferred_nstp_component || '',
        students_needed: directDep.community_requests?.students_needed || 0
      };
    }

    // Ensure barangay and extra community request details are populated
    if (deployment && deployment.request_id && (!deployment.barangay || !deployment.community_address)) {
      try {
        const { data: reqData } = await supabase
          .from('community_requests')
          .select('barangay, community_address, municipality, province, activity_type, activity_title')
          .eq('request_id', deployment.request_id)
          .single();
        if (reqData) {
          if (!deployment.barangay && reqData.barangay) deployment.barangay = reqData.barangay;
          if (!deployment.community_address && reqData.community_address) deployment.community_address = reqData.community_address;
          if (!deployment.municipality && reqData.municipality) deployment.municipality = reqData.municipality;
          if (!deployment.province && reqData.province) deployment.province = reqData.province;
          if (!deployment.activity_type && reqData.activity_type) deployment.activity_type = reqData.activity_type;
          if (!deployment.activity_title && reqData.activity_title) deployment.activity_title = reqData.activity_title;
        }
      } catch (reqEnrichErr) {
        console.warn('Could not enrich request details:', reqEnrichErr.message);
      }
    }

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

    // Extract student user IDs
    const studentUserIds = (assignedStudents || []).map(a => a.student?.user_id).filter(Boolean);
    const hoursMap = new Map();
    const latestAttMap = new Map();
    const attendanceStatsMap = new Map();

    if (studentUserIds.length > 0) {
      try {
        const { data: hoursSummary } = await supabase
          .from('rendered_hours_summary')
          .select('*')
          .eq('deployment_id', deploymentId)
          .in('student_user_id', studentUserIds);

        (hoursSummary || []).forEach(h => {
          hoursMap.set(h.student_user_id, h);
        });

        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
        const todayDate = formatter.format(new Date());

        const { data: attendanceRecords } = await supabase
          .from('attendance_records')
          .select('student_user_id, check_in_time, check_out_time, attendance_status, hours_rendered, attendance_date, student_remarks, verified_at, verified_by, created_at, updated_at')
          .eq('deployment_id', deploymentId)
          .in('student_user_id', studentUserIds)
          .order('attendance_date', { ascending: false })
          .order('updated_at', { ascending: false });

        (attendanceRecords || []).forEach(att => {
          const current = attendanceStatsMap.get(att.student_user_id) || { present: 0, totalHours: 0, verifiedHours: 0, verifiedCount: 0, unverifiedCount: 0 };
          if (att.attendance_status === 'present') current.present++;

          let h = Number(att.hours_rendered || 0);
          if (att.student_remarks) {
            const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
            if (match) {
              const val = parseFloat(match[1]);
              if (!isNaN(val)) h = val;
            }
          }
          current.totalHours += h;

          const isAttVerified = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
          if (isAttVerified) {
            current.verifiedHours += h;
            current.verifiedCount++;
          } else {
            current.unverifiedCount++;
          }
          attendanceStatsMap.set(att.student_user_id, current);

          if (att.attendance_date === todayDate) {
            const existing = latestAttMap.get(att.student_user_id);
            if (!existing) {
              latestAttMap.set(att.student_user_id, att);
            } else if (!existing.check_out_time && att.check_out_time) {
              latestAttMap.set(att.student_user_id, att);
            }
          }
        });
      } catch (attErr) {
        console.warn('Could not enrich attendance details for students:', attErr.message);
      }
    }

    // Transform student data
    const students = (assignedStudents || []).map(assignment => {
      const student = assignment.student;
      const studentId = student?.user_id;
      let profile = null;
      if (student && student.student_profiles) {
        if (Array.isArray(student.student_profiles)) {
          profile = student.student_profiles[0];
        } else {
          profile = student.student_profiles;
        }
      }

      const hrs = hoursMap.get(studentId) || {};
      const attStats = attendanceStatsMap.get(studentId) || { present: 0, totalHours: 0, verifiedHours: 0, verifiedCount: 0, unverifiedCount: 0 };
      const todayAtt = latestAttMap.get(studentId) || null;
      const totalRendered = Number(hrs.total_hours_rendered || attStats.totalHours || 0);
      const isSessionLive = Boolean(
        todayAtt && 
        todayAtt.check_in_time && 
        todayAtt.check_in_time !== '---' && 
        (!todayAtt.check_out_time || todayAtt.check_out_time === '---' || String(todayAtt.check_out_time).toUpperCase() === 'N/A' || String(todayAtt.check_out_time).toUpperCase() === 'N\\A')
      );

      const isCredited = Boolean(
        !isSessionLive &&
        totalRendered > 0 &&
        (
          (todayAtt && (todayAtt.verified_at || todayAtt.verified_by || (todayAtt.student_remarks && /\[CREDITED:[0-9.]+\]/.test(todayAtt.student_remarks)))) ||
          (Number(hrs.total_hours_verified || 0) > 0 && Number(hrs.total_hours_verified || 0) >= totalRendered) ||
          (attStats.verifiedCount > 0 && attStats.unverifiedCount === 0)
        )
      );
      const creditStatus = isCredited ? 'credited' : 'pending';

      return {
        deployment_student_id: assignment.deployment_student_id,
        student_user_id: studentId,
        user_id: studentId,
        id: studentId,
        student_name: profile?.full_name || 'Unknown',
        full_name: profile?.full_name || 'Unknown',
        student_number: profile?.student_number || 'N/A',
        course: profile?.course || 'N/A',
        year_level: profile?.year_level || 'N/A',
        section: profile?.section ? (String(profile.section).toLowerCase().startsWith('section') ? profile.section : `Section ${String(profile.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A',
        contact_number: profile?.contact_number || '---',
        phone_number: profile?.contact_number || '---',
        nstp_component: profile?.nstp_component || 'N/A',
        deployment_student_status: assignment.deployment_student_status,
        assigned_at: assignment.assigned_at,
        notes: assignment.notes,
        hours_rendered: totalRendered,
        total_hours_rendered: totalRendered,
        total_hours_verified: Number(hrs.total_hours_verified || attStats.verifiedHours || 0),
        is_credited: isCredited,
        credit_status: creditStatus,
        completion_percentage: hrs.completion_percentage || Math.min(100, Math.round((totalRendered / 90.0) * 100)),
        today_attendance: todayAtt ? {
          attendance_date: todayAtt.attendance_date,
          check_in_time: todayAtt.check_in_time,
          check_out_time: todayAtt.check_out_time,
          attendance_status: todayAtt.attendance_status,
          hours_rendered: todayAtt.hours_rendered,
          verified_at: todayAtt.verified_at,
          verified_by: todayAtt.verified_by,
          student_remarks: todayAtt.student_remarks,
          created_at: todayAtt.created_at,
          updated_at: todayAtt.updated_at
        } : null
      };
    });

    return {
      ...deployment,
      students: students,
      assigned_students: students,
      assigned_students_count: students.length
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

    if (fetchError || !currentDeployment) {
      throw new Error('Deployment not found');
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
    if (newStatus === 'active' || newStatus === 'ongoing') {
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
    } else if (newStatus === 'cancelled') {
      await supabase
        .from('deployment_students')
        .update({ deployment_student_status: 'removed' })
        .eq('deployment_id', deploymentId);
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
    await syncDeploymentStatusesBySchedule();

    // First search for assigned or active deployment
    let { data: deployment, error } = await supabase
      .from('deployment_students')
      .select(`
        deployment_student_id,
        deployment_student_status,
        assigned_at,
        deployment:deployments(
          deployment_id,
          deployment_batch_name,
          deployment_status,
          deployment_start_date,
          deployment_end_date,
          notes,
          community_request:community_requests(
            community_name,
            community_address,
            activity_title,
            activity_description,
            activity_type,
            barangay,
            municipality,
            province,
            preferred_start_date,
            preferred_end_date,
            preferred_schedule,
            special_instructions,
            target_beneficiaries
          )
        )
      `)
      .eq('student_user_id', studentId)
      .in('deployment_student_status', ['assigned', 'active'])
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('Failed to fetch student deployment: ' + error.message);
    }

    // Fallback: If no assigned/active deployment, check for most recent completed deployment
    if (!deployment) {
      const { data: completedDep, error: compErr } = await supabase
        .from('deployment_students')
        .select(`
          deployment_student_id,
          deployment_student_status,
          assigned_at,
          deployment:deployments(
            deployment_id,
            deployment_batch_name,
            deployment_status,
            deployment_start_date,
            deployment_end_date,
            notes,
            community_request:community_requests(
              community_name,
              community_address,
              activity_title,
              activity_description,
              activity_type,
              barangay,
              municipality,
              province,
              preferred_start_date,
              preferred_end_date,
              preferred_schedule,
              special_instructions,
              target_beneficiaries
            )
          )
        `)
        .eq('student_user_id', studentId)
        .eq('deployment_student_status', 'completed')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!compErr && completedDep) {
        deployment = completedDep;
      }
    }

    if (deployment && deployment.deployment) {
      const depDate = deployment.deployment.deployment_end_date || deployment.deployment.deployment_start_date;
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const today = formatter.format(new Date());
      if (depDate && depDate < today) {
        deployment.deployment.deployment_status = 'completed';
        deployment.deployment_student_status = 'completed';
      }
    }

    return deployment;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  syncDeploymentStatusesBySchedule,
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