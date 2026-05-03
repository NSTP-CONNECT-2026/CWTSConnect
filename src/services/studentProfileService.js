const supabase = require('../config/supabaseClient');

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

  return data;
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

  // Create profile
  const { data, error } = await supabase
    .from('student_profiles')
    .insert({
      user_id: userId,
      full_name: profileData.full_name,
      student_number: profileData.student_number,
      course: profileData.course,
      year_level: profileData.year_level,
      section: profileData.section,
      nstp_component: profileData.nstp_component,
      contact_number: profileData.contact_number,
      birthdate: profileData.birthdate || null,
      sex: profileData.sex || null,
      complete_address: profileData.complete_address,
      barangay: profileData.barangay,
      municipality: profileData.municipality,
      province: profileData.province,
      skills: profileData.skills,
      emergency_contact_name: profileData.emergency_contact_name || null,
      emergency_contact_number: profileData.emergency_contact_number || null,
      emergency_contact_relationship: profileData.emergency_contact_relationship || null
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create profile: ' + error.message);
  }

  // Update user profile_status based on required fields
  const isComplete = checkProfileCompleteness(profileData);
  await updateUserProfileStatus(userId, isComplete ? 'complete' : 'incomplete');

  return data;
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

  // Update profile
  const { data, error } = await supabase
    .from('student_profiles')
    .update({
      full_name: profileData.full_name,
      student_number: profileData.student_number,
      course: profileData.course,
      year_level: profileData.year_level,
      section: profileData.section,
      nstp_component: profileData.nstp_component,
      contact_number: profileData.contact_number,
      birthdate: profileData.birthdate || null,
      sex: profileData.sex || null,
      complete_address: profileData.complete_address,
      barangay: profileData.barangay,
      municipality: profileData.municipality,
      province: profileData.province,
      skills: profileData.skills,
      emergency_contact_name: profileData.emergency_contact_name || null,
      emergency_contact_number: profileData.emergency_contact_number || null,
      emergency_contact_relationship: profileData.emergency_contact_relationship || null
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update profile: ' + error.message);
  }

  // Update user profile_status based on required fields
  const isComplete = checkProfileCompleteness(profileData);
  await updateUserProfileStatus(userId, isComplete ? 'complete' : 'incomplete');

  return data;
}

/**
 * Checks if profile has all required fields
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

  return requiredFields.every(field => 
    profileData[field] && 
    profileData[field].toString().trim() !== ''
  );
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

  return data;
}

module.exports = {
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
  getUserWithProfile,
  checkProfileCompleteness
};