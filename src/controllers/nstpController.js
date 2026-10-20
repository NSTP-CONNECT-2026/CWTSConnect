/**
 * GET /api/nstp/me
 * Get NSTP Official profile information
 */
async function getNstpOfficialProfile(req, res) {
  try {
    // User data is available from session (set by authMiddleware)
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (user.role !== 'nstp_official') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. NSTP Official role required.'
      });
    }

    // Return user data (excluding sensitive information)
    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        profile_status: user.profile_status
      }
    });

  } catch (error) {
    console.error('Get NSTP Official profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile information.'
    });
  }
}

/**
 * GET /api/nstp/students
 * Get all students with their profiles and compliance status
 */
async function getAllStudents(req, res) {
  try {
    const supabase = require('../config/supabaseClient');
    
    // Get all students with their profiles
    const { data: students, error } = await supabase
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
          birthdate,
          sex,
          complete_address,
          barangay,
          municipality,
          province,
          skills,
          location,
          emergency_contact_name,
          emergency_contact_number,
          emergency_contact_relationship
        )
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error('Failed to fetch students: ' + error.message);
    }

    // Fetch deployment students to accurately check who is currently deployed in an active batch
    let deployedSet = new Set();
    try {
      const { data: depStudents } = await supabase
        .from('deployment_students')
        .select(`
          student_user_id,
          deployment_student_status,
          deployments (
            deployment_status
          )
        `);

      if (depStudents && Array.isArray(depStudents)) {
        depStudents.forEach(d => {
          const studentStatus = (d.deployment_student_status || '').toLowerCase();
          const dep = Array.isArray(d.deployments) ? d.deployments[0] : d.deployments;
          const depStatus = (dep?.deployment_status || '').toLowerCase();

          // A student is only currently deployed if both the student assignment and parent deployment are active/ongoing
          const isStudentActive = ['assigned', 'active', 'in_progress'].includes(studentStatus);
          const isDeploymentActive = ['active', 'ongoing', 'in_progress'].includes(depStatus);

          if (isStudentActive && isDeploymentActive) {
            deployedSet.add(d.student_user_id);
          }
        });
      }
    } catch (depErr) {
      console.warn('Error fetching deployment students for deployment status check:', depErr.message);
    }

    // Transform data to flatten student profiles and normalize fields
    const transformedStudents = (students || []).map(student => {
      let profile = {};
      
      if (student.student_profiles) {
        if (Array.isArray(student.student_profiles)) {
          profile = student.student_profiles[0] || {};
        } else {
          profile = student.student_profiles;
        }
      }

      let latitude = profile.latitude || null;
      let longitude = profile.longitude || null;
      if (!latitude && profile.location && typeof profile.location === 'string' && profile.location.includes(',')) {
        const parts = profile.location.split(',');
        if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
          latitude = parseFloat(parts[0].trim());
          longitude = parseFloat(parts[1].trim());
        }
      }

      const isProfileComplete = student.profile_status === 'complete' || Boolean(profile.full_name && profile.student_number);
      const isDeployed = deployedSet.has(student.user_id);
      const isActive = student.account_status === 'active';
      
      const normalizedProfile = {
        ...profile,
        latitude,
        longitude
      };

      const result = {
        user_id: student.user_id,
        email: student.email,
        account_status: student.account_status,
        is_active: isActive,
        profile_status: student.profile_status,
        profile_completed: isProfileComplete,
        cmo_compliance_status: student.cmo_compliance_status || 'incomplete',
        created_at: student.created_at,
        is_deployed: isDeployed,
        full_name: profile.full_name || '',
        student_number: profile.student_number || '',
        course: profile.course || '',
        year_level: profile.year_level || '',
        section: profile.section || '',
        nstp_component: profile.nstp_component || 'CWTS',
        contact_number: profile.contact_number || '',
        complete_address: profile.complete_address || '',
        barangay: profile.barangay || '',
        municipality: profile.municipality || '',
        province: profile.province || '',
        skills: profile.skills || '',
        location: profile.location || '',
        latitude: latitude,
        longitude: longitude,
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_number: profile.emergency_contact_number || '',
        emergency_contact_relationship: profile.emergency_contact_relationship || '',
        student_profiles: normalizedProfile
      };
      
      return result;
    });

    res.json({
      success: true,
      students: transformedStudents,
      data: transformedStudents
    });

  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students.'
    });
  }
}

/**
 * GET /api/nstp/students/:userId
 * Get single student details
 */
async function getStudentById(req, res) {
  try {
    const { userId } = req.params;
    const supabase = require('../config/supabaseClient');
    
    console.log('=== DEBUG: getStudentById called for userId:', userId);
    
    // Get student with profile
    const { data: student, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        account_status,
        profile_status,
        cmo_compliance_status,
        created_at,
        student_profiles (*)
      `)
      .eq('user_id', userId)
      .eq('role', 'student')
      .single();

    if (error) {
      console.error('Error fetching student:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Student not found.'
        });
      }
      throw new Error('Failed to fetch student: ' + error.message);
    }

    console.log('=== DEBUG: Raw student data from Supabase ===');
    console.log(JSON.stringify(student, null, 2));

    // Get CMO requirements separately
    console.log('=== DEBUG: Fetching requirements for user_id:', userId);
    const { data: requirements, error: reqError } = await supabase
      .from('student_cmo_requirements')
      .select('*')
      .eq('user_id', userId);

    if (reqError) {
      console.error('Error fetching requirements:', reqError);
    }

    console.log('=== DEBUG: Requirements data ===');
    console.log('Count:', requirements?.length || 0);
    console.log('Data:', JSON.stringify(requirements, null, 2));

    // Transform data - handle both array and object formats
    let profile = {};
    
    if (student.student_profiles) {
      if (Array.isArray(student.student_profiles)) {
        profile = student.student_profiles[0] || {};
      } else {
        profile = student.student_profiles;
      }
    }

    if (profile.location && typeof profile.location === 'string' && profile.location.includes(',')) {
      const parts = profile.location.split(',');
      if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
        profile.latitude = parseFloat(parts[0].trim());
        profile.longitude = parseFloat(parts[1].trim());
      }
    }

    console.log('=== DEBUG: Extracted profile ===');
    console.log(JSON.stringify(profile, null, 2));

    // Fetch student's deployments and attendance breakdown
    let attendanceBreakdown = [];
    let totalAttendanceCount = 0;
    let totalDeploymentsCount = 0;

    try {
      const { data: assignments } = await supabase
        .from('deployment_students')
        .select(`
          deployment_student_id,
          deployment_id,
          deployment_student_status,
          assigned_at,
          deployments (
            deployment_id,
            deployment_batch_name,
            deployment_start_date,
            deployment_end_date,
            community_requests (
              activity_title,
              activity_type,
              community_name
            )
          )
        `)
        .eq('student_user_id', userId)
        .neq('deployment_student_status', 'removed');

      const { data: attRecords } = await supabase
        .from('attendance_records')
        .select(`
          attendance_id,
          deployment_id,
          attendance_date,
          check_in_time,
          check_out_time,
          attendance_status,
          hours_rendered,
          verified_at,
          verified_by,
          student_remarks,
          deployments (
            deployment_id,
            deployment_batch_name,
            deployment_start_date,
            community_requests (
              activity_title
            )
          )
        `)
        .eq('student_user_id', userId)
        .order('attendance_date', { ascending: false });

      function extractCreditedHours(att) {
        if (!att) return { isCredited: false, creditedHours: 0 };
        let customHours = null;
        if (att.student_remarks) {
          const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
          if (match) {
            const parsedVal = parseFloat(match[1]);
            if (!isNaN(parsedVal)) customHours = parsedVal;
          }
        }
        const isCredited = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
        const creditedHours = isCredited ? ((customHours !== null) ? customHours : Number(att.hours_rendered || 0)) : 0;
        return { isCredited, creditedHours };
      }

      const attByDep = new Map();
      (attRecords || []).forEach(att => {
        if (!attByDep.has(att.deployment_id)) attByDep.set(att.deployment_id, []);
        attByDep.get(att.deployment_id).push(att);
      });

      const processedAttIds = new Set();

      (assignments || []).forEach(assign => {
        const dep = assign.deployments || {};
        const commReq = dep.community_requests || {};
        const activityTitle = commReq.activity_title || dep.deployment_batch_name || 'NSTP Community Service';
        const batchName = dep.deployment_batch_name || '';
        const depDate = dep.deployment_start_date || (assign.assigned_at ? assign.assigned_at.split('T')[0] : null);

        const matchedAtts = attByDep.get(assign.deployment_id);

        if (matchedAtts && matchedAtts.length > 0) {
          matchedAtts.forEach(att => {
            processedAttIds.add(att.attendance_id);
            const { isCredited, creditedHours } = extractCreditedHours(att);
            const isPresent = (att.attendance_status === 'present' || att.attendance_status === 'late' || Number(att.hours_rendered || 0) > 0);
            attendanceBreakdown.push({
              attendance_id: att.attendance_id,
              deployment_id: assign.deployment_id,
              date: att.attendance_date || depDate,
              activity_title: activityTitle,
              batch_name: batchName,
              status: isPresent ? 'Present' : (att.attendance_status === 'absent' ? 'Absent' : (att.attendance_status || 'Absent')),
              is_present: isPresent,
              check_in_time: att.check_in_time,
              check_out_time: att.check_out_time,
              hours_rendered: creditedHours,
              credited_hours: creditedHours,
              is_credited: isCredited
            });
          });
        } else {
          attendanceBreakdown.push({
            attendance_id: null,
            deployment_id: assign.deployment_id,
            date: depDate,
            activity_title: activityTitle,
            batch_name: batchName,
            status: 'Absent',
            is_present: false,
            check_in_time: null,
            check_out_time: null,
            hours_rendered: 0,
            credited_hours: 0,
            is_credited: false
          });
        }
      });

      (attRecords || []).forEach(att => {
        if (!processedAttIds.has(att.attendance_id)) {
          const dep = att.deployments || {};
          const commReq = dep.community_requests || {};
          const activityTitle = commReq.activity_title || dep.deployment_batch_name || 'NSTP Community Service';
          const { isCredited, creditedHours } = extractCreditedHours(att);
          const isPresent = (att.attendance_status === 'present' || att.attendance_status === 'late' || Number(att.hours_rendered || 0) > 0);
          attendanceBreakdown.push({
            attendance_id: att.attendance_id,
            deployment_id: att.deployment_id,
            date: att.attendance_date || dep.deployment_start_date,
            activity_title: activityTitle,
            batch_name: dep.deployment_batch_name || '',
            status: isPresent ? 'Present' : (att.attendance_status === 'absent' ? 'Absent' : (att.attendance_status || 'Absent')),
            is_present: isPresent,
            check_in_time: att.check_in_time,
            check_out_time: att.check_out_time,
            hours_rendered: creditedHours,
            credited_hours: creditedHours,
            is_credited: isCredited
          });
        }
      });

      attendanceBreakdown.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      totalAttendanceCount = attendanceBreakdown.filter(r => r.is_present).length;
      totalDeploymentsCount = (assignments || []).length;
      var totalHoursCount = attendanceBreakdown.reduce((sum, r) => sum + Number(r.credited_hours != null ? r.credited_hours : (r.hours_rendered || 0)), 0);
    } catch (breakdownErr) {
      console.error('Error computing attendance breakdown in getStudentById:', breakdownErr);
    }

    const transformedStudent = {
      user_id: student.user_id,
      email: student.email,
      account_status: student.account_status,
      profile_status: student.profile_status,
      cmo_compliance_status: student.cmo_compliance_status || 'incomplete',
      created_at: student.created_at,
      cmo_requirements: requirements || [],
      attendance_breakdown: attendanceBreakdown,
      total_attendance_count: totalAttendanceCount,
      total_deployments_count: totalDeploymentsCount,
      total_hours_rendered: totalHoursCount || 0,
      ...profile
    };

    console.log('=== DEBUG: Final transformed student ===');
    console.log(JSON.stringify(transformedStudent, null, 2));

    res.json({
      success: true,
      student: transformedStudent,
      data: transformedStudent
    });

  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student details.'
    });
  }
}

/**
 * PUT /api/nstp/students/:userId/status
 * Activate or deactivate a student account
 */
async function updateStudentStatus(req, res) {
  try {
    const { userId } = req.params;
    let targetStatus = req.body.account_status;
    if (!targetStatus && req.body.is_active !== undefined) {
      targetStatus = req.body.is_active ? 'active' : 'inactive';
    }

    if (!targetStatus || !['active', 'inactive'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive".'
      });
    }

    const supabase = require('../config/supabaseClient');

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        account_status: targetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('role', 'student')
      .select('user_id, email, account_status')
      .maybeSingle();

    if (error) {
      throw new Error('Failed to update student status: ' + error.message);
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.'
      });
    }

    res.json({
      success: true,
      message: `Student account status successfully updated to ${targetStatus}.`,
      student: updatedUser,
      data: updatedUser
    });

  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student account status.'
    });
  }
}

/**
 * GET /api/nstp/community-officials
 * Get all community official accounts with complete profiles
 */
async function getAllCommunityOfficials(req, res) {
  try {
    const supabase = require('../config/supabaseClient');
    const { getOfficialProfile } = require('../services/communityOfficialStore');
    
    // Get all users with role 'community_official'
    const { data: officials, error } = await supabase
      .from('users')
      .select('user_id, email, account_status, profile_status, created_at')
      .eq('role', 'community_official')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error('Failed to fetch community officials: ' + error.message);
    }

    // Also fetch latest community requests to extract community info if available
    let requestsByUser = new Map();
    try {
      const { data: commRequests } = await supabase
        .from('community_requests')
        .select('user_id, community_name, barangay, municipality, province, created_at')
        .order('created_at', { ascending: false });

      if (commRequests && Array.isArray(commRequests)) {
        commRequests.forEach(r => {
          if (r.user_id && !requestsByUser.has(r.user_id)) {
            requestsByUser.set(r.user_id, r);
          }
        });
      }
    } catch (reqErr) {
      console.warn('Error fetching community requests for officials:', reqErr.message);
    }

    // Enrich each official with persistent metadata
    const enrichedOfficials = (officials || []).map(o => {
      const meta = getOfficialProfile(o.user_id, o.email) || {};
      const reqInfo = requestsByUser.get(o.user_id) || {};
      const isActive = o.account_status === 'active';

      return {
        user_id: o.user_id,
        email: o.email,
        account_status: o.account_status,
        is_active: isActive,
        profile_status: o.profile_status,
        created_at: o.created_at,
        full_name: meta.full_name || meta.community_name || 'Community Leader',
        position: meta.position || 'Community Representative',
        contact_number: meta.contact_number || 'N/A',
        community_name: meta.community_name || reqInfo.community_name || 'Community Partner',
        barangay: meta.barangay || reqInfo.barangay || '---',
        municipality: meta.municipality || reqInfo.municipality || '---',
        province: meta.province || reqInfo.province || 'Laguna',
        latitude: meta.latitude || null,
        longitude: meta.longitude || null,
        location: meta.location || (meta.latitude && meta.longitude ? `${meta.latitude},${meta.longitude}` : '')
      };
    });

    res.json({
      success: true,
      officials: enrichedOfficials,
      data: enrichedOfficials
    });

  } catch (error) {
    console.error('Get all community officials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve community officials.'
    });
  }
}

/**
 * POST /api/nstp/community-officials
 * Add a new community official account
 */
async function addCommunityOfficial(req, res) {
  try {
    const {
      full_name,
      email,
      password,
      contact_number,
      position,
      community_name,
      barangay,
      municipality,
      province,
      latitude,
      longitude,
      location
    } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const supabase = require('../config/supabaseClient');
    const { hashPassword } = require('../services/passwordService');
    const { saveOfficialProfile } = require('../services/communityOfficialStore');

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      throw new Error('Error checking existing email: ' + checkError.message);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create the account in users table
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: hashedPassword,
        role: 'community_official',
        account_status: 'active',
        profile_status: 'complete',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('user_id, email, account_status, profile_status, created_at')
      .single();

    if (createError) {
      throw new Error('Failed to create account: ' + createError.message);
    }

    // Resolve lat/lng and location
    const latNum = latitude !== undefined && latitude !== null && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    const lngNum = longitude !== undefined && longitude !== null && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;
    const locStr = location || (latNum && lngNum ? `${latNum},${lngNum}` : '');

    const resolvedFullName = full_name || community_name || (barangay ? `Barangay ${barangay}` : 'Community Partner');
    const resolvedPosition = position || 'Community Official';

    // Persist official profile metadata with exact map coordinates
    const profileData = {
      full_name: resolvedFullName,
      email: email,
      contact_number: contact_number || '',
      position: resolvedPosition,
      community_name: community_name || 'Community Partner',
      barangay: barangay || '',
      municipality: municipality || '',
      province: province || 'Laguna',
      latitude: latNum,
      longitude: lngNum,
      location: locStr,
      coordinates: (latNum && lngNum) ? { lat: latNum, lng: lngNum } : null
    };

    saveOfficialProfile(newUser.user_id, profileData);

    const enrichedOfficial = {
      ...newUser,
      is_active: true,
      ...profileData
    };

    res.status(201).json({
      success: true,
      message: 'Community official account created successfully.',
      official: enrichedOfficial,
      data: enrichedOfficial
    });

  } catch (error) {
    console.error('Add community official error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create community official account.'
    });
  }
}

/**
 * PUT /api/nstp/community-officials/:userId/status
 * Activate or deactivate a community official account
 */
async function updateCommunityOfficialStatus(req, res) {
  try {
    const { userId } = req.params;
    let targetStatus = req.body.account_status;
    if (!targetStatus && req.body.is_active !== undefined) {
      targetStatus = req.body.is_active ? 'active' : 'inactive';
    }

    if (!targetStatus || !['active', 'inactive'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive".'
      });
    }

    const supabase = require('../config/supabaseClient');

    // Update status
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        account_status: targetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('role', 'community_official')
      .select('user_id, email, account_status')
      .maybeSingle();

    if (error) {
      throw new Error('Failed to update status: ' + error.message);
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Community official not found.'
      });
    }

    res.json({
      success: true,
      message: `Account status successfully updated to ${targetStatus}.`,
      official: updatedUser,
      data: updatedUser
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account status.'
    });
  }
}

/**
 * PUT /api/nstp/community-officials/:userId/details
 * Edit basic account details and profile metadata
 */
async function updateCommunityOfficialDetails(req, res) {
  try {
    const { userId } = req.params;
    const {
      email,
      password,
      full_name,
      contact_number,
      position,
      community_name,
      barangay,
      municipality,
      province
    } = req.body;

    const supabase = require('../config/supabaseClient');
    const { saveOfficialProfile, getOfficialProfile } = require('../services/communityOfficialStore');

    let updateFields = {
      updated_at: new Date().toISOString()
    };

    if (email) {
      // Check if new email conflicts with another user
      const { data: conflictingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        throw new Error('Error checking email conflict: ' + checkError.message);
      }

      if (conflictingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists.'
        });
      }

      updateFields.email = email;
    }

    // If password is provided, hash it
    if (password) {
      const { hashPassword } = require('../services/passwordService');
      updateFields.password_hash = await hashPassword(password);
    }

    // Perform update in users table if email or password changed
    let updatedUser = null;
    if (Object.keys(updateFields).length > 1) {
      const { data, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('user_id', userId)
        .eq('role', 'community_official')
        .select('user_id, email, account_status, profile_status, created_at')
        .maybeSingle();

      if (error) {
        throw new Error('Failed to update details: ' + error.message);
      }
      updatedUser = data;
    }

    // Update profile metadata in store
    const existingMeta = getOfficialProfile(userId, email) || {};
    const updatedMeta = {
      full_name: full_name !== undefined ? full_name : existingMeta.full_name,
      email: email || existingMeta.email,
      contact_number: contact_number !== undefined ? contact_number : existingMeta.contact_number,
      position: position !== undefined ? position : existingMeta.position,
      community_name: community_name !== undefined ? community_name : existingMeta.community_name,
      barangay: barangay !== undefined ? barangay : existingMeta.barangay,
      municipality: municipality !== undefined ? municipality : existingMeta.municipality,
      province: province !== undefined ? province : existingMeta.province,
      latitude: req.body.latitude !== undefined && req.body.latitude !== null ? parseFloat(req.body.latitude) : existingMeta.latitude,
      longitude: req.body.longitude !== undefined && req.body.longitude !== null ? parseFloat(req.body.longitude) : existingMeta.longitude,
      location: req.body.location || (req.body.latitude && req.body.longitude ? `${req.body.latitude},${req.body.longitude}` : existingMeta.location)
    };

    saveOfficialProfile(userId, updatedMeta);

    res.json({
      success: true,
      message: 'Community official details updated successfully.',
      official: {
        ...(updatedUser || { user_id: userId }),
        ...updatedMeta
      },
      data: {
        ...(updatedUser || { user_id: userId }),
        ...updatedMeta
      }
    });

  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account details.'
    });
  }
}

module.exports = {
  getNstpOfficialProfile,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
  getAllCommunityOfficials,
  addCommunityOfficial,
  updateCommunityOfficialStatus,
  updateCommunityOfficialDetails
};