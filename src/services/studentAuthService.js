const supabase = require('../config/supabaseClient');
const { hashPassword, comparePassword } = require('./passwordService');
const { generateOtpCode, saveOtp, findValidOtp, markOtpAsUsed } = require('./otpService');
const { sendOtpEmail } = require('./emailService');

/**
 * Finds a user by email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Creates a new pending student account, or re-sends OTP if already pending.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<void>}
 */
async function registerStudent(email, password) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    if (existingUser.account_status === 'active') {
      throw new Error('This email is already registered.');
    }
    // Account exists but is still pending — allow resend by continuing to OTP step
    // No need to create a new account
  } else {
    // Hash password before saving
    const passwordHash = await hashPassword(password);

    const { error } = await supabase.from('users').insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'student',
      account_status: 'pending_verification',
      profile_status: 'incomplete'
    });

    if (error) {
      throw new Error('Failed to create account: ' + error.message);
    }
  }

  // Generate and save OTP
  const otpCode = generateOtpCode();
  await saveOtp(normalizedEmail, otpCode);

  // Send OTP via Brevo
  await sendOtpEmail(normalizedEmail, otpCode);
}

/**
 * Verifies the OTP and activates the student account.
 * @param {string} email
 * @param {string} otpCode
 * @returns {Promise<void>}
 */
async function verifyStudentOtp(email, otpCode) {
  const normalizedEmail = email.toLowerCase();

  // Check if user exists
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('No account found for this email address.');
  }

  if (user.account_status === 'active') {
    throw new Error('This account is already verified. Please log in.');
  }

  // Find the OTP record
  const otpRecord = await findValidOtp(normalizedEmail, otpCode);

  if (!otpRecord) {
    throw new Error('Invalid OTP. Please check the code and try again.');
  }

  // Check if OTP is expired
  if (new Date() > new Date(otpRecord.expires_at)) {
    throw new Error('This OTP has expired. Please request a new one.');
  }

  // Mark OTP as used
  await markOtpAsUsed(otpRecord.otp_id);

  // Activate the account and set profile_status to incomplete
  const { error } = await supabase
    .from('users')
    .update({
      account_status: 'active',
      role: 'student',
      profile_status: 'incomplete'
    })
    .eq('email', normalizedEmail);

  if (error) {
    throw new Error('Failed to activate account: ' + error.message);
  }
}

/**
 * Resends OTP if the account is still pending verification.
 * @param {string} email
 * @returns {Promise<void>}
 */
async function resendStudentOtp(email) {
  const normalizedEmail = email.toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('No account found for this email address.');
  }

  if (user.account_status === 'active') {
    throw new Error('This account is already verified. Please log in.');
  }

  const otpCode = generateOtpCode();
  await saveOtp(normalizedEmail, otpCode);
  await sendOtpEmail(normalizedEmail, otpCode);
}

/**
 * Validates student login credentials.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} Safe user object (no password_hash)
 */
async function loginStudent(email, password) {
  const normalizedEmail = email.toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  // Only students can log in here
  if (user.role !== 'student') {
    throw new Error('Only student accounts can access this page.');
  }

  // Check account status
  if (user.account_status === 'pending_verification') {
    throw new Error('Your account is not yet verified. Please verify your email first.');
  }

  if (user.account_status === 'inactive' || user.account_status === 'blocked') {
    throw new Error('Your account has been deactivated. Please contact the administrator.');
  }

  if (user.account_status !== 'active') {
    throw new Error('Invalid email or password.');
  }

  // Compare password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password.');
  }

  // Return safe user data (never return password_hash)
  return {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    profile_status: user.profile_status
  };
}

module.exports = {
  registerStudent,
  verifyStudentOtp,
  resendStudentOtp,
  loginStudent,
  findUserByEmail
};
