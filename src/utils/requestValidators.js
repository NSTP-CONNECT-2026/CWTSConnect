/**
 * NSTPConnect - Community Request Validators
 * Validates community request form data
 */

/**
 * Valid activity types
 */
const ACTIVITY_TYPES = [
  'Clean-up Drive',
  'Tree Planting',
  'Literacy Program',
  'Computer Literacy Training',
  'Feeding Program',
  'Disaster Preparedness',
  'Community Survey',
  'Health Awareness Program',
  'Others'
];

/**
 * Valid NSTP components
 */
const NSTP_COMPONENTS = ['CWTS', 'LTS', 'Both'];

/**
 * Valid urgency levels
 */
const URGENCY_LEVELS = ['Low', 'Medium', 'High'];

/**
 * Valid request statuses
 */
const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

/**
 * Available skills options
 */
const AVAILABLE_SKILLS = [
  'Teaching',
  'Computer Literacy',
  'Public Speaking',
  'Leadership',
  'First Aid',
  'Documentation',
  'Event Management',
  'Photography',
  'Video Editing',
  'Social Media Management',
  'Data Entry',
  'Survey Conducting',
  'Community Organizing',
  'Environmental Awareness',
  'Health Education'
];

/**
 * Target beneficiaries options
 */
const TARGET_BENEFICIARIES = [
  'Children',
  'Senior Citizens',
  'Residents',
  'Students',
  'Families',
  'Youth',
  'Women',
  'Persons with Disabilities',
  'Out-of-School Youth',
  'Indigenous People'
];

/**
 * Validates community request data
 * @param {object} requestData - Request data to validate
 * @returns {object} Validation result
 */
function validateCommunityRequest(requestData) {
  const errors = [];

  // Community Information validation
  if (!requestData.community_name || requestData.community_name.trim().length < 2) {
    errors.push('Community name must be at least 2 characters long');
  }

  if (!requestData.community_address || requestData.community_address.trim().length < 5) {
    errors.push('Community address must be at least 5 characters long');
  }

  if (!requestData.barangay || requestData.barangay.trim().length < 2) {
    errors.push('Barangay is required');
  }

  if (!requestData.municipality || requestData.municipality.trim().length < 2) {
    errors.push('Municipality is required');
  }

  if (!requestData.province || requestData.province.trim().length < 2) {
    errors.push('Province is required');
  }

  // Activity Information validation
  if (!requestData.activity_title || requestData.activity_title.trim().length < 5) {
    errors.push('Activity title must be at least 5 characters long');
  }

  if (!requestData.activity_description || requestData.activity_description.trim().length < 10) {
    errors.push('Activity description must be at least 10 characters long');
  }

  if (!requestData.activity_type || !ACTIVITY_TYPES.includes(requestData.activity_type)) {
    errors.push('Invalid activity type');
  }

  if (!requestData.preferred_nstp_component || !NSTP_COMPONENTS.includes(requestData.preferred_nstp_component)) {
    errors.push('Invalid NSTP component');
  }

  if (!requestData.students_needed || requestData.students_needed < 1 || requestData.students_needed > 100) {
    errors.push('Number of students needed must be between 1 and 100');
  }

  // Date validation
  if (!requestData.preferred_start_date) {
    errors.push('Preferred start date is required');
  }

  if (!requestData.preferred_end_date) {
    errors.push('Preferred end date is required');
  }

  if (requestData.preferred_start_date && requestData.preferred_end_date) {
    const startDate = new Date(requestData.preferred_start_date);
    const endDate = new Date(requestData.preferred_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      errors.push('Start date cannot be in the past');
    }

    if (endDate < startDate) {
      errors.push('End date cannot be earlier than start date');
    }
  }

  if (!requestData.preferred_schedule || requestData.preferred_schedule.trim().length < 3) {
    errors.push('Preferred schedule is required');
  }

  if (!requestData.urgency_level || !URGENCY_LEVELS.includes(requestData.urgency_level)) {
    errors.push('Invalid urgency level');
  }

  // Deployment Requirements validation
  if (!requestData.target_beneficiaries || requestData.target_beneficiaries.trim().length < 2) {
    errors.push('Target beneficiaries is required');
  }

  // Needed skills validation (optional but if provided, must be valid)
  if (requestData.needed_skills && Array.isArray(requestData.needed_skills)) {
    const invalidSkills = requestData.needed_skills.filter(skill => 
      !AVAILABLE_SKILLS.includes(skill)
    );
    if (invalidSkills.length > 0) {
      errors.push(`Invalid skills: ${invalidSkills.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates request status transition
 * @param {string} currentStatus - Current request status
 * @param {string} newStatus - New status to transition to
 * @param {string} userRole - Role of user making the change
 * @returns {object} Validation result
 */
function validateStatusTransition(currentStatus, newStatus, userRole) {
  const errors = [];

  // Community Officials can only cancel pending requests
  if (userRole === 'community_official') {
    if (newStatus === 'cancelled' && currentStatus !== 'pending') {
      errors.push('Only pending requests can be cancelled');
    }
    if (newStatus !== 'cancelled') {
      errors.push('Community Officials can only cancel requests');
    }
  }

  // NSTP Officials can approve/reject pending requests
  if (userRole === 'nstp_official') {
    if ((newStatus === 'approved' || newStatus === 'rejected') && currentStatus !== 'pending') {
      errors.push('Only pending requests can be approved or rejected');
    }
    if (newStatus === 'completed' && currentStatus !== 'approved') {
      errors.push('Only approved requests can be marked as completed');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates if a request can be edited
 * @param {string} status - Current request status
 * @returns {boolean} Whether request can be edited
 */
function canEditRequest(status) {
  return status === 'pending' || status === 'rejected';
}

/**
 * Validates if a request can be cancelled
 * @param {string} status - Current request status
 * @returns {boolean} Whether request can be cancelled
 */
function canCancelRequest(status) {
  return status === 'pending';
}

module.exports = {
  ACTIVITY_TYPES,
  NSTP_COMPONENTS,
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  AVAILABLE_SKILLS,
  TARGET_BENEFICIARIES,
  validateCommunityRequest,
  validateStatusTransition,
  canEditRequest,
  canCancelRequest
};