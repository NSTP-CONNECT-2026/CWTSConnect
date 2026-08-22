/**
 * NSTPConnect - Deployment Validators
 * Handles validation logic for deployment management
 */

/**
 * Validates deployment creation data
 * @param {object} deploymentData - Deployment data to validate
 * @returns {object} Validation result
 */
function validateDeploymentCreation(deploymentData) {
  const errors = [];

  // Required fields validation
  if (!deploymentData.request_id || deploymentData.request_id.trim() === '') {
    errors.push('Request ID is required');
  }

  if (!deploymentData.deployment_batch_name || deploymentData.deployment_batch_name.trim() === '') {
    errors.push('Deployment batch name is required');
  } else if (deploymentData.deployment_batch_name.trim().length < 5) {
    errors.push('Deployment batch name must be at least 5 characters long');
  } else if (deploymentData.deployment_batch_name.trim().length > 255) {
    errors.push('Deployment batch name must not exceed 255 characters');
  }

  if (!deploymentData.deployment_start_date) {
    errors.push('Deployment start date is required');
  }

  if (!deploymentData.deployment_end_date) {
    errors.push('Deployment end date is required');
  }

  // Date validation
  if (deploymentData.deployment_start_date && deploymentData.deployment_end_date) {
    const startDate = new Date(deploymentData.deployment_start_date);
    const endDate = new Date(deploymentData.deployment_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime())) {
      errors.push('Invalid deployment start date format');
    } else if (startDate < today) {
      errors.push('Deployment start date cannot be in the past');
    }

    if (isNaN(endDate.getTime())) {
      errors.push('Invalid deployment end date format');
    } else if (endDate < startDate) {
      errors.push('Deployment end date must be after start date');
    }
  }

  // Selected students validation
  if (!deploymentData.selected_students || !Array.isArray(deploymentData.selected_students)) {
    errors.push('Selected students must be provided as an array');
  } else if (deploymentData.selected_students.length === 0) {
    errors.push('At least one student must be selected for deployment');
  } else {
    // Check for duplicate student IDs
    const uniqueStudents = new Set(deploymentData.selected_students);
    if (uniqueStudents.size !== deploymentData.selected_students.length) {
      errors.push('Duplicate students detected in selection');
    }

    // Validate student ID format (basic UUID check)
    deploymentData.selected_students.forEach((studentId, index) => {
      if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
        errors.push(`Invalid student ID at position ${index + 1}`);
      }
    });
  }

  // Notes validation (optional)
  if (deploymentData.notes && deploymentData.notes.length > 1000) {
    errors.push('Notes must not exceed 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates deployment status update
 * @param {string} currentStatus - Current deployment status
 * @param {string} newStatus - New deployment status
 * @returns {object} Validation result
 */
function validateDeploymentStatusUpdate(currentStatus, newStatus) {
  const errors = [];
  const validStatuses = ['pending', 'active', 'ongoing', 'completed', 'cancelled'];

  if (!newStatus || !validStatuses.includes(newStatus)) {
    errors.push('Invalid deployment status');
    return { isValid: false, errors };
  }

  // Define allowed status transitions
  const allowedTransitions = {
    'pending': ['active', 'cancelled'],
    'active': ['ongoing', 'cancelled'],
    'ongoing': ['completed', 'cancelled'],
    'completed': [], // Cannot change from completed
    'cancelled': [] // Cannot change from cancelled
  };

  if (!allowedTransitions[currentStatus]) {
    errors.push('Invalid current deployment status');
  } else if (!allowedTransitions[currentStatus].includes(newStatus)) {
    errors.push(`Cannot change deployment status from ${currentStatus} to ${newStatus}`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates student assignment eligibility
 * @param {object} student - Student data
 * @param {object} request - Community request data
 * @returns {object} Validation result
 */
function validateStudentEligibility(student, request) {
  const errors = [];

  // Check student profile completion
  if (student.profile_status !== 'complete') {
    errors.push(`Student ${student.full_name} has incomplete profile`);
  }

  // Check CMO compliance
  if (student.cmo_compliance_status !== 'compliant') {
    errors.push(`Student ${student.full_name} is not CMO compliant`);
  }

  // Check if student is already assigned to active deployment
  // This will be checked in the service layer with database query

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates deployment capacity
 * @param {number} studentsNeeded - Number of students needed for request
 * @param {number} selectedCount - Number of students selected
 * @param {number} alreadyAssigned - Number of students already assigned
 * @returns {object} Validation result
 */
function validateDeploymentCapacity(studentsNeeded, selectedCount, alreadyAssigned = 0) {
  const errors = [];

  if (selectedCount <= 0) {
    errors.push('At least one student must be selected');
  }

  const totalAssigned = selectedCount + alreadyAssigned;
  if (totalAssigned > studentsNeeded) {
    errors.push(`Cannot assign ${totalAssigned} students. Only ${studentsNeeded} students needed (${alreadyAssigned} already assigned)`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates deployment batch name uniqueness format
 * @param {string} batchName - Deployment batch name
 * @returns {object} Validation result
 */
function validateBatchNameFormat(batchName) {
  const errors = [];

  if (!batchName || typeof batchName !== 'string') {
    errors.push('Batch name must be a string');
    return { isValid: false, errors };
  }

  const trimmedName = batchName.trim();

  // Check length
  if (trimmedName.length < 5) {
    errors.push('Batch name must be at least 5 characters long');
  }

  if (trimmedName.length > 255) {
    errors.push('Batch name must not exceed 255 characters');
  }

  // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validPattern.test(trimmedName)) {
    errors.push('Batch name can only contain letters, numbers, spaces, hyphens, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates deployment date range
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {object} Validation result
 */
function validateDeploymentDates(startDate, endDate) {
  const errors = [];

  if (!startDate || !endDate) {
    errors.push('Both start and end dates are required');
    return { isValid: false, errors };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime())) {
    errors.push('Invalid start date format');
  }

  if (isNaN(end.getTime())) {
    errors.push('Invalid end date format');
  }

  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    if (start < today) {
      errors.push('Start date cannot be in the past');
    }

    if (end < start) {
      errors.push('End date must be after start date');
    }

    // Check if deployment period is reasonable (not too long)
    const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      errors.push('Deployment period cannot exceed 365 days');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateDeploymentCreation,
  validateDeploymentStatusUpdate,
  validateStudentEligibility,
  validateDeploymentCapacity,
  validateBatchNameFormat,
  validateDeploymentDates
};