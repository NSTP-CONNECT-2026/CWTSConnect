const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  login,
  logout,
  requestPasswordResetController,
  verifyPasswordResetOtpController,
  resetPasswordController,
  resendPasswordResetOtpController
} = require('../controllers/authController');

const router = express.Router();

// Rate limiter for OTP requests (5 per 15 mins)
const forgotOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many verification code requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for password reset attempts (10 per 15 mins)
const resetAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /api/auth/login - Shared login for both Students, NSTP Officials, and Community Partners
router.post('/login', login);

// POST /api/auth/logout - Shared logout
router.post('/logout', logout);

// Password Reset Routes
router.post('/forgot-password', forgotOtpLimiter, requestPasswordResetController);
router.post('/verify-reset-otp', resetAttemptLimiter, verifyPasswordResetOtpController);
router.post('/reset-password', resetAttemptLimiter, resetPasswordController);
router.post('/resend-reset-otp', forgotOtpLimiter, resendPasswordResetOtpController);

module.exports = router;