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

    console.log('=== DEBUG: Raw Supabase Response ===');
    console.log('Total students:', students?.length);
    if (students && students.length > 0) {
      console.log('First student raw:', JSON.stringify(students[0], null, 2));
    }

    // Transform data to flatten student profiles
    const transformedStudents = students.map(student => {
      // Supabase returns student_profiles as an array with one object
      // But it could also be null if no profile exists
      let profile = {};
      
      if (student.student_profiles) {
        if (Array.isArray(student.student_profiles)) {
          profile = student.student_profiles[0] || {};
        } else {
          profile = student.student_profiles;
        }
      }
      
      const result = {
        user_id: student.user_id,
        email: student.email,
        account_status: student.account_status,
        profile_status: student.profile_status,
        cmo_compliance_status: student.cmo_compliance_status || 'incomplete',
        created_at: student.created_at,
        ...profile
      };
      
      return result;
    });

    console.log('=== DEBUG: Transformed Data ===');
    console.log('Total transformed:', transformedStudents.length);
    if (transformedStudents.length > 0) {
      console.log('First transformed student:', JSON.stringify(transformedStudents[0], null, 2));
    }

    res.json({
      success: true,
      students: transformedStudents
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

    console.log('=== DEBUG: Extracted profile ===');
    console.log(JSON.stringify(profile, null, 2));

    const transformedStudent = {
      user_id: student.user_id,
      email: student.email,
      account_status: student.account_status,
      profile_status: student.profile_status,
      cmo_compliance_status: student.cmo_compliance_status || 'incomplete',
      created_at: student.created_at,
      cmo_requirements: requirements || [],
      ...profile
    };

    console.log('=== DEBUG: Final transformed student ===');
    console.log(JSON.stringify(transformedStudent, null, 2));

    res.json({
      success: true,
      student: transformedStudent
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
 * GET /api/nstp/community-officials
 * Get all community official accounts
 */
async function getAllCommunityOfficials(req, res) {
  try {
    const supabase = require('../config/supabaseClient');
    
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

    res.json({
      success: true,
      officials: officials
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
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const supabase = require('../config/supabaseClient');
    const { hashPassword } = require('../services/passwordService');

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

    // Create the account
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

    res.status(201).json({
      success: true,
      message: 'Community official account created successfully.',
      official: newUser
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
    const { account_status } = req.body;

    if (!account_status || !['active', 'inactive'].includes(account_status)) {
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
        account_status: account_status,
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
      message: `Account status successfully updated to ${account_status}.`,
      official: updatedUser
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
 * Edit basic account details (email and optionally password)
 */
async function updateCommunityOfficialDetails(req, res) {
  try {
    const { userId } = req.params;
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    const supabase = require('../config/supabaseClient');

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

    const updateFields = {
      email: email,
      updated_at: new Date().toISOString()
    };

    // If password is provided, hash it
    if (password) {
      const { hashPassword } = require('../services/passwordService');
      updateFields.password_hash = await hashPassword(password);
    }

    // Perform update
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('user_id', userId)
      .eq('role', 'community_official')
      .select('user_id, email, account_status, profile_status, created_at')
      .maybeSingle();

    if (error) {
      throw new Error('Failed to update details: ' + error.message);
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Community official not found.'
      });
    }

    res.json({
      success: true,
      message: 'Community official details updated successfully.',
      official: updatedUser
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
  getAllCommunityOfficials,
  addCommunityOfficial,
  updateCommunityOfficialStatus,
  updateCommunityOfficialDetails
};