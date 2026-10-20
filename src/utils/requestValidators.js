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

  const activityTitle = (requestData.activity_title || '').trim();
  const activityDescription = (requestData.activity_description || requestData.description || '').trim();
  const activityType = (requestData.activity_type || requestData.request_type || '').trim();
  const preferredStartDate = requestData.preferred_start_date || requestData.target_start_date || requestData.date;
  const preferredEndDate = requestData.preferred_end_date || requestData.target_end_date || preferredStartDate;

  // 1. Activity Title Validation
  if (!activityTitle || activityTitle.length < 3) {
    errors.push('Activity title must be at least 3 characters long');
  }

  // 2. Activity Type Validation (dynamic coordinator-created services or standard types)
  if (!activityType || activityType.length < 2) {
    errors.push('Please select a valid school-offered service or request type');
  }

  // 3. Date Validation
  if (!preferredStartDate) {
    errors.push('Target activity date is required');
  } else {
    const startDate = new Date(preferredStartDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid target activity date format');
    }
    if (preferredEndDate) {
      const endDate = new Date(preferredEndDate);
      if (!isNaN(endDate.getTime()) && endDate < startDate) {
        errors.push('End date cannot be earlier than start date');
      }
    }
  }

  // 4. Description Validation
  if (!activityDescription || activityDescription.length < 5) {
    errors.push('Activity description must be at least 5 characters long');
  }

  // 5. Optional Community Profile Info (validated only if explicitly provided)
  if (requestData.community_name && requestData.community_name.trim().length < 2) {
    errors.push('Community name must be at least 2 characters long');
  }

  if (requestData.community_address && requestData.community_address.trim().length < 3) {
    errors.push('Community address must be at least 3 characters long');
  }

  // 6. Optional Needed Skills Validation
  const skills = requestData.needed_skills || requestData.skills_required;
  if (skills && Array.isArray(skills)) {
    const invalidSkills = skills.filter(skill => typeof skill !== 'string' || !skill.trim());
    if (invalidSkills.length > 0) {
      errors.push('Invalid skills specified: skills must be non-empty text');
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