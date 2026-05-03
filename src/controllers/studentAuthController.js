const { validateStudentEmail, validatePassword, validateOtp } = require('../utils/validators');
const {
  registerStudent,
  verifyStudentOtp,
  resendStudentOtp,
  loginStudent
} = require('../services/studentAuthService');

/**
 * POST /api/student/signup
 * Validates input, creates a pending account, sends OTP email.
 */
async function signup(req, res) {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validate email
    const emailCheck = validateStudentEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, message: passwordCheck.message });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    await registerStudent(email, password);

    return res.status(200).json({
      success: true,
      message: 'Account created. A verification code has been sent to your institutional email.'
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/student/verify-otp
 * Verifies the OTP and activates the account.
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    // Validate email format
    const emailCheck = validateStudentEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    // Validate OTP format
    const otpCheck = validateOtp(otp);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, message: otpCheck.message });
    }

    await verifyStudentOtp(email, otp);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/student/resend-otp
 * Generates and sends a new OTP for unverified accounts.
 */
async function resendOtp(req, res) {
  try {
    const { email } = req.body;

    const emailCheck = validateStudentEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    await resendStudentOtp(email);

    return res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your institutional email.'
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/student/login
 * Validates credentials and creates a session.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please enter your institutional email.' });
    }

    if (!password || password.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please enter your password.' });
    }

    const emailCheck = validateStudentEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    const user = await loginStudent(email, password);

    // Save the user to the session
    req.session.user = user;
    
    // Force session save
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        user: {
          email: user.email,
          role: user.role,
          profile_status: user.profile_status
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/student/logout
 * Destroys the session and redirects to login.
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
}

module.exports = { signup, verifyOtp, resendOtp, login, logout };
