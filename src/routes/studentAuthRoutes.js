const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { signup, verifyOtp, resendOtp, login, logout } = require('../controllers/studentAuthController');

// Rate limiter for OTP resend — max 5 requests per 15 minutes per IP
const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for login — max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtpLimiter, resendOtp);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);

module.exports = router;
