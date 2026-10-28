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

/**
 * Initiates a password reset by generating and sending an OTP
 * @param {string} email - Registered user email
 * @returns {Promise<object>} Result
 */
async function requestPasswordReset(email) {
  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return { success: false, message: 'Email address is required.' };
    }

    // Check if account exists
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, account_status')
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      return {
        success: false,
        message: 'No registered account found with that email address.'
      };
    }

    if (user.account_status === 'suspended' || user.account_status === 'disabled') {
      return {
        success: false,
        message: 'Your account is currently suspended or disabled. Please contact the administrator.'
      };
    }

    // Generate & save OTP
    const { generateOtpCode, saveOtp } = require('./otpService');
    const { sendPasswordResetOtpEmail } = require('./emailService');

    const otpCode = generateOtpCode();
    await saveOtp(normalizedEmail, otpCode);
    await sendPasswordResetOtpEmail(normalizedEmail, otpCode);

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.'
    };
  } catch (error) {
    console.error('Request password reset error:', error);
    return {
      success: false,
      message: 'Unable to process password reset request. Please try again later.'
    };
  }
}

/**
 * Validates a password reset OTP
 * @param {string} email - User email
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<object>} Result
 */
async function verifyPasswordResetOtp(email, otp) {
  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').trim();

    if (!normalizedEmail || !cleanOtp) {
      return { success: false, message: 'Email and verification code are required.' };
    }

    const { findValidOtp } = require('./otpService');
    const otpRecord = await findValidOtp(normalizedEmail, cleanOtp);

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid verification code. Please check the code and try again.'
      };
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      return {
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      };
    }

    return {
      success: true,
      message: 'Verification code verified successfully.'
    };
  } catch (error) {
    console.error('Verify password reset OTP error:', error);
    return {
      success: false,
      message: 'Error verifying verification code. Please try again.'
    };
  }
}

/**
 * Resets the user's password using the verified OTP
 * @param {string} email - User email
 * @param {string} otp - 6-digit OTP code
 * @param {string} newPassword - New password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Promise<object>} Result
 */
async function resetPasswordWithOtp(email, otp, newPassword, confirmPassword) {
  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').trim();

    if (!normalizedEmail || !cleanOtp) {
      return { success: false, message: 'Email and verification code are required.' };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, message: 'New password must be at least 8 characters long.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const { findValidOtp, markOtpAsUsed } = require('./otpService');
    const otpRecord = await findValidOtp(normalizedEmail, cleanOtp);

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid verification code. Please check the code and try again.'
      };
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      return {
        success: false,
        message: 'This verification code has expired. Please request a new code.'
      };
    }

    // Mark OTP as used
    await markOtpAsUsed(otpRecord.otp_id);

    // Hash new password using 12 salt rounds
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail);

    if (updateError) {
      throw new Error('Failed to update password: ' + updateError.message);
    }

    return {
      success: true,
      message: 'Your password has been reset successfully. You can now log in.'
    };
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      success: false,
      message: 'Unable to reset password. Please try again later.'
    };
  }
}

module.exports = {
  loginUser,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPasswordWithOtp
};