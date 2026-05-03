const supabase = require('../config/supabaseClient');

const OTP_EXPIRY_MINUTES = 10;

/**
 * Generates a random 6-digit OTP code.
 * @returns {string}
 */
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Saves a new OTP record in the otp_verifications table.
 * @param {string} email
 * @param {string} otpCode
 * @returns {Promise<void>}
 */
async function saveOtp(email, otpCode) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase.from('otp_verifications').insert({
    email: email.toLowerCase(),
    otp_code: otpCode,
    expires_at: expiresAt,
    is_used: false
  });

  if (error) {
    throw new Error('Failed to save OTP: ' + error.message);
  }
}

/**
 * Finds the latest unused and unexpired OTP for a given email.
 * @param {string} email
 * @param {string} otpCode
 * @returns {Promise<object|null>} OTP record or null
 */
async function findValidOtp(email, otpCode) {
  const { data, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('otp_code', otpCode)
    .eq('is_used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Marks an OTP as used after successful verification.
 * @param {string} otpId
 * @returns {Promise<void>}
 */
async function markOtpAsUsed(otpId) {
  const { error } = await supabase
    .from('otp_verifications')
    .update({ is_used: true })
    .eq('otp_id', otpId);

  if (error) {
    throw new Error('Failed to mark OTP as used: ' + error.message);
  }
}

module.exports = { generateOtpCode, saveOtp, findValidOtp, markOtpAsUsed };
