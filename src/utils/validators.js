require('dotenv').config();

const ALLOWED_DOMAIN = process.env.ALLOWED_STUDENT_EMAIL_DOMAIN || 'lspu.edu.ph';

// List of common personal email domains to explicitly reject
const BLOCKED_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'aol.com', 'protonmail.com'
];

/**
 * Validates that an email address is a properly formatted institutional email.
 * Returns an object: { valid: boolean, message: string }
 */
function validateStudentEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required.' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  const domain = trimmed.split('@')[1];

  // Block personal email domains
  if (BLOCKED_DOMAINS.includes(domain)) {
    return {
      valid: false,
      message: `Personal email addresses are not allowed. Please use your @${ALLOWED_DOMAIN} institutional email.`
    };
  }

  // Enforce institutional domain
  if (domain !== ALLOWED_DOMAIN) {
    return {
      valid: false,
      message: `Only @${ALLOWED_DOMAIN} email addresses are accepted.`
    };
  }

  return { valid: true, message: '' };
}

/**
 * Validates password strength.
 * Returns an object: { valid: boolean, message: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validates a 6-digit numeric OTP.
 * Returns an object: { valid: boolean, message: string }
 */
function validateOtp(otp) {
  if (!otp || typeof otp !== 'string') {
    return { valid: false, message: 'OTP is required.' };
  }

  if (!/^\d{6}$/.test(otp.trim())) {
    return { valid: false, message: 'OTP must be a 6-digit number.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validates student profile data.
 * @param {object} profileData
 * @returns {object} { valid: boolean, message: string }
 */
function validateProfileData(profileData) {
  // Required fields validation
  const requiredFields = {
    full_name: 'Full Name',
    student_number: 'Student Number',
    course: 'Course',
    year_level: 'Year Level',
    section: 'Section',
    nstp_component: 'NSTP Component',
    contact_number: 'Contact Number',
    complete_address: 'Complete Address',
    barangay: 'Barangay',
    municipality: 'Municipality',
    province: 'Province',
    skills: 'Skills'
  };

  // Check required fields
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!profileData[field] || profileData[field].toString().trim() === '') {
      return { valid: false, message: `${label} is required.` };
    }
  }

  // Validate full name
  if (profileData.full_name.length < 2) {
    return { valid: false, message: 'Full Name must be at least 2 characters long.' };
  }

  if (profileData.full_name.length > 255) {
    return { valid: false, message: 'Full Name must not exceed 255 characters.' };
  }

  // Validate student number
  if (profileData.student_number.length < 5) {
    return { valid: false, message: 'Student Number must be at least 5 characters long.' };
  }

  if (profileData.student_number.length > 100) {
    return { valid: false, message: 'Student Number must not exceed 100 characters.' };
  }

  // Validate NSTP Component
  const validNstpComponents = ['CWTS', 'LTS'];
  if (!validNstpComponents.includes(profileData.nstp_component.toUpperCase())) {
    return { valid: false, message: 'NSTP Component must be either CWTS or LTS.' };
  }

  // Validate contact number (allow spaces, hyphens, parentheses)
  const contactRegex = /^(\+63|0)[0-9]{10}$/;
  const cleanContact = profileData.contact_number ? profileData.contact_number.toString().replace(/[\s\-()]/g, '') : '';
  if (!contactRegex.test(cleanContact)) {
    return { valid: false, message: 'Please enter a valid Philippine contact number (e.g. 09XXXXXXXXX).' };
  }

  // Validate year level
  const validYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  if (!validYearLevels.includes(profileData.year_level)) {
    return { valid: false, message: 'Please select a valid year level.' };
  }

  // Validate sex if provided
  if (profileData.sex && !['Male', 'Female'].includes(profileData.sex)) {
    return { valid: false, message: 'Sex must be either Male or Female.' };
  }

  // Validate birthdate if provided
  if (profileData.birthdate && profileData.birthdate.toString().trim() !== '') {
    const birthDate = new Date(profileData.birthdate);
    if (isNaN(birthDate.getTime())) {
      return { valid: false, message: 'Please enter a valid birthdate.' };
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 15 || age > 100) {
      return { valid: false, message: 'Please enter a valid birthdate (must be at least 15 years old).' };
    }
  }

  // Validate emergency contact number if provided
  if (profileData.emergency_contact_number && profileData.emergency_contact_number.toString().trim() !== '') {
    const cleanEmergency = profileData.emergency_contact_number.toString().replace(/[\s\-()]/g, '');
    if (!contactRegex.test(cleanEmergency)) {
      return { valid: false, message: 'Please enter a valid emergency contact number (e.g. 09XXXXXXXXX).' };
    }
  }

  // Require coordinates (latitude & longitude or location string)
  const hasLat = profileData.latitude !== undefined && profileData.latitude !== null && profileData.latitude.toString().trim() !== '';
  const hasLng = profileData.longitude !== undefined && profileData.longitude !== null && profileData.longitude.toString().trim() !== '';
  const hasLocation = profileData.location && typeof profileData.location === 'string' && profileData.location.includes(',');

  if ((!hasLat || !hasLng) && !hasLocation) {
    return { valid: false, message: 'Student location coordinates (latitude and longitude) are required. Please pin your location on the map.' };
  }

  // Validate coordinates (latitude and longitude or location string)
  if (hasLat) {
    const lat = parseFloat(profileData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return { valid: false, message: 'Please provide a valid latitude coordinate (-90 to 90).' };
    }
  }

  if (hasLng) {
    const lng = parseFloat(profileData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return { valid: false, message: 'Please provide a valid longitude coordinate (-180 to 180).' };
    }
  }

  if (hasLocation) {
    const parts = profileData.location.split(',');
    if (parts.length !== 2 || isNaN(parts[0].trim()) || isNaN(parts[1].trim())) {
      return { valid: false, message: 'Location coordinates must be formatted as "latitude,longitude".' };
    }
    const parsedLat = parseFloat(parts[0].trim());
    const parsedLng = parseFloat(parts[1].trim());
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      return { valid: false, message: 'Location coordinates must be valid geographic coordinates.' };
    }
  }

  return { valid: true, message: 'Valid profile data.' };
}

module.exports = { validateStudentEmail, validatePassword, validateOtp, validateProfileData };
