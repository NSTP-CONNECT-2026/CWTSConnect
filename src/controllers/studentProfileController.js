const {
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
  getUserWithProfile
} = require('../services/studentProfileService');
const { validateProfileData } = require('../utils/validators');

/**
 * GET /api/student/profile
 * Gets the logged-in student's profile
 */
async function getProfile(req, res) {
  try {
    const userId = req.session.user.user_id;
    
    // Get user with profile data
    const userData = await getUserWithProfile(userId);
    
    // Return safe user data (no password_hash)
    const response = {
      user: {
        user_id: userData.user_id,
        email: userData.email,
        role: userData.role,
        account_status: userData.account_status,
        profile_status: userData.profile_status,
        created_at: userData.created_at
      },
      profile: userData.student_profiles || null
    };

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile.'
    });
  }
}

/**
 * POST /api/student/profile
 * Creates a new student profile
 */
async function createProfile(req, res) {
  try {
    const userId = req.session.user.user_id;
    const profileData = req.body;

    // Validate profile data
    const validation = validateProfileData(profileData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Create profile
    const newProfile = await createStudentProfile(userId, profileData);

    return res.status(201).json({
      success: true,
      message: 'Profile created successfully.',
      data: newProfile
    });
  } catch (error) {
    console.error('Create profile error:', error.message);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create profile.'
    });
  }
}

/**
 * PUT /api/student/profile
 * Updates the logged-in student's profile
 */
async function updateProfile(req, res) {
  try {
    const userId = req.session.user.user_id;
    const profileData = req.body;

    // Validate profile data
    const validation = validateProfileData(profileData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Update profile
    const updatedProfile = await updateStudentProfile(userId, profileData);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    
    if (error.message.includes('not found') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.'
    });
  }
}

module.exports = {
  getProfile,
  createProfile,
  updateProfile
};