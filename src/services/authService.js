const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');

/**
 * Login user (Student, NSTP Official, or Community Official)
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Login result
 */
async function loginUser(email, password) {
  try {
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, password_hash, role, account_status, profile_status')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    // Check if account is active
    if (user.account_status !== 'active') {
      return {
        success: false,
        message: 'Your account is not active.'
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    // Check if role is supported
    if (!['student', 'nstp_official', 'community_official'].includes(user.role)) {
      return {
        success: false,
        message: 'Unauthorized account role.'
      };
    }

    // Return user data (excluding password_hash)
    const { password_hash, ...userData } = user;
    
    return {
      success: true,
      user: userData
    };

  } catch (error) {
    console.error('Login service error:', error);
    return {
      success: false,
      message: 'An error occurred during login.'
    };
  }
}

module.exports = {
  loginUser
};