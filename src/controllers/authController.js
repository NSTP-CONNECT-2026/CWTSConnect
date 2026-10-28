const { loginUser } = require('../services/authService');

/**
 * POST /api/auth/login
 * Shared login for both Students and NSTP Officials
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your email address.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your password.'
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Attempt login
    const result = await loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Create session
    req.session.user = {
      user_id: result.user.user_id,
      email: result.user.email,
      role: result.user.role,
      account_status: result.user.account_status,
      profile_status: result.user.profile_status
    };

    // Determine redirect path based on role
    let redirectPath;
    if (result.user.role === 'student') {
      redirectPath = '/student/dashboard.html';
    } else if (result.user.role === 'nstp_official') {
      redirectPath = '/nstp/dashboard.html';
    } else if (result.user.role === 'community_official') {
      redirectPath = '/community/dashboard.html';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized account role.'
      });
    }

    res.json({
      success: true,
      message: 'Login successful.',
      role: result.user.role,
      redirect: redirectPath
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
}

/**
 * POST /api/auth/logout
 * Shared logout for both Students and NSTP Officials
 */
async function logout(req, res) {
  try {
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to logout properly.'
        });
      }

      // Clear session cookie
      res.clearCookie('connect.sid');
      
      res.json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout.'
    });
  }
}

/**
 * POST /api/auth/forgot-password
 * Send OTP verification code to registered email for password recovery
 */
async function requestPasswordResetController(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your registered email address.'
      });
    }

    const { requestPasswordReset } = require('../services/authService');
    const result = await requestPasswordReset(email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Forgot password controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request.'
    });
  }
}

/**
 * POST /api/auth/verify-reset-otp
 * Verify OTP code entered by user
 */
async function verifyPasswordResetOtpController(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required.'
      });
    }

    const { verifyPasswordResetOtp } = require('../services/authService');
    const result = await verifyPasswordResetOtp(email, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Verify reset OTP controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying reset code.'
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset user password with verified OTP
 */
async function resetPasswordController(req, res) {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required.'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const { resetPasswordWithOtp } = require('../services/authService');
    const result = await resetPasswordWithOtp(email, otp, newPassword, confirmPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Reset password controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password.'
    });
  }
}

/**
 * POST /api/auth/resend-reset-otp
 * Resend a new OTP verification code
 */
async function resendPasswordResetOtpController(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your registered email address.'
      });
    }

    const { requestPasswordReset } = require('../services/authService');
    const result = await requestPasswordReset(email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('Resend reset OTP controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resending verification code.'
    });
  }
}

module.exports = {
  login,
  logout,
  requestPasswordResetController,
  verifyPasswordResetOtpController,
  resetPasswordController,
  resendPasswordResetOtpController
};