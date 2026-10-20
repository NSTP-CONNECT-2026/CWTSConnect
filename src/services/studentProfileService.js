const supabase = require('../config/supabaseClient');
const skillService = require('./skillService');

/**
 * Validates that all skills submitted by a student belong to the coordinator's active skills catalog.
 * Rejects unauthorized skills and normalizes casing to match the coordinator's canonical names.
 * @param {string} skillsInput
 * @returns {Promise<string>}
 */
async function validateAndCanonicalizeSkills(skillsInput) {
  if (!skillsInput || typeof skillsInput !== 'string' || !skillsInput.trim()) {
    throw new Error('Skills are required. Please select at least one skill from the coordinator list.');
  }

  const rawList = skillsInput
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (rawList.length === 0) {
    throw new Error('Please select at least one skill from the coordinator list.');
  }

  // Fetch coordinator's active skills
  const officialSkills = await skillService.getAllSkills({ activeOnly: true });
  const officialMap = new Map();
  officialSkills.forEach(s => {
    if (s && s.name) {
      officialMap.set(s.name.trim().toLowerCase(), s.name.trim());
    }
  });

  const canonicalSkills = [];
  const unauthorizedSkills = [];

  for (const rawSkill of rawList) {
    const key = rawSkill.toLowerCase();
    if (officialMap.has(key)) {
      canonicalSkills.push(officialMap.get(key));
    } else {
      unauthorizedSkills.push(rawSkill);
    }
  }

  if (unauthorizedSkills.length > 0) {
    throw new Error(`The skill(s) "${unauthorizedSkills.join(', ')}" are not part of the coordinator's official skills list. Please select only coordinator-approved skills.`);
  }

  return Array.from(new Set(canonicalSkills)).join(', ');
}

let cachedHasLatLong = null;
async function checkLatLongColumns() {
  if (cachedHasLatLong !== null) return cachedHasLatLong;
  try {
    const { error } = await supabase.from('student_profiles').select('latitude, longitude').limit(1);
    cachedHasLatLong = !error;
  } catch {
    cachedHasLatLong = false;
  }
  return cachedHasLatLong;
}

function extractCoordinates(profileData) {
  if (!profileData) return null;

  let lat = null;
  let lng = null;

  if (profileData.latitude !== undefined && profileData.latitude !== null && profileData.latitude !== '') {
    const parsed = parseFloat(profileData.latitude);
    if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
      lat = parsed;
    }
  }

  if (profileData.longitude !== undefined && profileData.longitude !== null && profileData.longitude !== '') {
    const parsed = parseFloat(profileData.longitude);
    if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
      lng = parsed;
    }
  }

  // Fallback to location string e.g. "14.393928,121.470037"
  if ((lat === null || lng === null) && profileData.location && typeof profileData.location === 'string' && profileData.location.includes(',')) {
    const parts = profileData.location.split(',');
    if (parts.length === 2) {
      const parsedLat = parseFloat(parts[0].trim());
      const parsedLng = parseFloat(parts[1].trim());
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        lat = parsedLat;
        lng = parsedLng;
      }
    }
  }

  if (lat !== null && lng !== null) {
    return {
      latitude: lat,
      longitude: lng,
      locationStr: `${lat},${lng}`
    };
  }

  return null;
}

function attachCoordinatesToProfile(profile) {
  if (!profile) return profile;

  if (profile.location && typeof profile.location === 'string' && profile.location.includes(',')) {
    const parts = profile.location.split(',');
    if (parts.length === 2 && !isNaN(parts[0].trim()) && !isNaN(parts[1].trim())) {
      profile.latitude = parseFloat(parts[0].trim());
      profile.longitude = parseFloat(parts[1].trim());
    }
  } else if (profile.latitude !== undefined && profile.longitude !== undefined && profile.latitude !== null && profile.longitude !== null) {
    const parsedLat = parseFloat(profile.latitude);
    const parsedLng = parseFloat(profile.longitude);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      profile.latitude = parsedLat;
      profile.longitude = parsedLng;
      profile.location = `${parsedLat},${parsedLng}`;
    }
  }

  return profile;
}

/**
 * Gets a student profile by user_id
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
async function getStudentProfile(userId) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error('Failed to fetch profile: ' + error.message);
  }

  return attachCoordinatesToProfile(data);
}

/**
 * Creates a new student profile
 * @param {string} userId 
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
async function createStudentProfile(userId, profileData) {
  // Check if profile already exists
  const existingProfile = await getStudentProfile(userId);
  if (existingProfile) {
    throw new Error('Profile already exists. Use update instead.');
  }

  // Check for duplicate student number
  if (profileData.student_number) {
    const { data: duplicateCheck } = await supabase
      .from('student_profiles')
      .select('profile_id')
      .eq('student_number', profileData.student_number)
      .single();

    if (duplicateCheck) {
      throw new Error('Student number already exists.');
    }
  }

  // Validate and canonicalize skills strictly against coordinator's list
  const canonicalSkills = await validateAndCanonicalizeSkills(profileData.skills);

  const insertPayload = {
    user_id: userId,
    full_name: profileData.full_name,
    student_number: profileData.student_number,
    course: profileData.course,
    year_level: profileData.year_level,
    section: profileData.section,
    nstp_component: profileData.nstp_component || 'CWTS',
    contact_number: profileData.contact_number,
    birthdate: profileData.birthdate || null,
    sex: profileData.sex || null,
    complete_address: profileData.complete_address,
    address: profileData.complete_address || null,
    barangay: profileData.barangay,
    municipality: profileData.municipality,
    province: profileData.province,
    skills: canonicalSkills,
    emergency_contact_name: profileData.emergency_contact_name || null,
    emergency_contact_number: profileData.emergency_contact_number || null,
    emergency_contact_relationship: profileData.emergency_contact_relationship || null
  };

  // Extract and store coordinates in location column (which always exists in student_profiles)
  const coords = extractCoordinates(profileData);
  if (coords) {
    insertPayload.location = coords.locationStr;
  }

  // If dedicated latitude/longitude columns exist in database, store there as well
  const hasLatLong = await checkLatLongColumns();
  if (hasLatLong && coords) {
    insertPayload.latitude = coords.latitude;
    insertPayload.longitude = coords.longitude;
  }

  // Create profile
  const { data, error } = await supabase
    .from('student_profiles')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create profile: ' + error.message);
  }

  // Update user profile_status based on required fields and coordinates
  const isComplete = checkProfileCompleteness(profileData);
  await updateUserProfileStatus(userId, isComplete ? 'complete' : 'incomplete');

  return attachCoordinatesToProfile(data);
}

/**
 * Updates an existing student profile
 * @param {string} userId 
 * @param {object} profileData 
 * @returns {Promise<object>}
 */
async function updateStudentProfile(userId, profileData) {
  // Check if profile exists
  const existingProfile = await getStudentProfile(userId);
  if (!existingProfile) {
    throw new Error('Profile not found. Create profile first.');
  }

  // Check for duplicate student number (excluding current profile)
  if (profileData.student_number && profileData.student_number !== existingProfile.student_number) {
    const { data: duplicateCheck } = await supabase
      .from('student_profiles')
      .select('profile_id')
      .eq('student_number', profileData.student_number)
      .neq('user_id', userId)
      .single();

    if (duplicateCheck) {
      throw new Error('Student number already exists.');
    }
  }

  // Validate and canonicalize skills strictly against coordinator's list
  const canonicalSkills = await validateAndCanonicalizeSkills(profileData.skills);

  const updatePayload = {
    full_name: profileData.full_name,
    student_number: profileData.student_number,
    course: profileData.course,
    year_level: profileData.year_level,
    section: profileData.section,
    nstp_component: profileData.nstp_component || 'CWTS',
    contact_number: profileData.contact_number,
    birthdate: profileData.birthdate || null,
    sex: profileData.sex || null,
    complete_address: profileData.complete_address,
    address: profileData.complete_address || null,
    barangay: profileData.barangay,
    municipality: profileData.municipality,
    province: profileData.province,
    skills: canonicalSkills,
    emergency_contact_name: profileData.emergency_contact_name || null,
    emergency_contact_number: profileData.emergency_contact_number || null,
    emergency_contact_relationship: profileData.emergency_contact_relationship || null
  };

  // Extract and store coordinates in location column
  const updateCoords = extractCoordinates(profileData);
  if (updateCoords) {
    updatePayload.location = updateCoords.locationStr;
  }

  // If dedicated latitude/longitude columns exist in database, store there as well
  const hasUpdateLatLong = await checkLatLongColumns();
  if (hasUpdateLatLong && updateCoords) {
    updatePayload.latitude = updateCoords.latitude;
    updatePayload.longitude = updateCoords.longitude;
  }

  // Update profile
  const { data, error } = await supabase
    .from('student_profiles')
    .update(updatePayload)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update profile: ' + error.message);
  }

  // Update user profile_status based on required fields and coordinates
  const isComplete = checkProfileCompleteness(profileData);
  await updateUserProfileStatus(userId, isComplete ? 'complete' : 'incomplete');

  return attachCoordinatesToProfile(data);
}

/**
 * Checks if profile has all required fields including coordinates
 * @param {object} profileData 
 * @returns {boolean}
 */
function checkProfileCompleteness(profileData) {
  const requiredFields = [
    'full_name',
    'student_number',
    'course',
    'year_level',
    'section',
    'nstp_component',
    'contact_number',
    'complete_address',
    'barangay',
    'municipality',
    'province',
    'skills'
  ];

  const hasAllFields = requiredFields.every(field => 
    profileData[field] && 
    profileData[field].toString().trim() !== ''
  );

  const coords = extractCoordinates(profileData);
  const hasCoordinates = coords !== null;

  return hasAllFields && hasCoordinates;
}

/**
 * Updates user profile_status in users table
 * @param {string} userId 
 * @param {string} status 
 */
async function updateUserProfileStatus(userId, status) {
  const { error } = await supabase
    .from('users')
    .update({ profile_status: status })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update user profile_status:', error.message);
  }
}

/**
 * Gets user with profile data
 * @param {string} userId 
 * @returns {Promise<object>}
 */
async function getUserWithProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id,
      email,
      role,
      account_status,
      profile_status,
      created_at,
      student_profiles (*)
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error('Failed to fetch user with profile: ' + error.message);
  }

  if (data && data.student_profiles) {
    if (Array.isArray(data.student_profiles)) {
      data.student_profiles.forEach(attachCoordinatesToProfile);
    } else {
      attachCoordinatesToProfile(data.student_profiles);
    }
  }

  return data;
}

module.exports = {
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
  getUserWithProfile,
  checkProfileCompleteness
};