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
  if (!deploymentData.request_id || String(deploymentData.request_id).trim() === '') {
    errors.push('Request ID is required');
  }

  if (!deploymentData.deployment_batch_name || String(deploymentData.deployment_batch_name).trim() === '') {
    errors.push('Deployment batch name is required');
  } else if (String(deploymentData.deployment_batch_name).trim().length < 3) {
    errors.push('Deployment batch name must be at least 3 characters long');
  } else if (String(deploymentData.deployment_batch_name).trim().length > 255) {
    errors.push('Deployment batch name must not exceed 255 characters');
  }

  if (!deploymentData.deployment_start_date) {
    errors.push('Deployment start date is required');
  }

  if (!deploymentData.deployment_end_date) {
    errors.push('Deployment end date is required');
  }

  // Date validation using ISO string comparisons
  if (deploymentData.deployment_start_date && deploymentData.deployment_end_date) {
    const startStr = String(deploymentData.deployment_start_date).split('T')[0];
    const endStr = String(deploymentData.deployment_end_date).split('T')[0];

    if (isNaN(new Date(startStr).getTime())) {
      errors.push('Invalid deployment start date format');
    }

    if (isNaN(new Date(endStr).getTime())) {
      errors.push('Invalid deployment end date format');
    }

    if (endStr < startStr) {
      errors.push('Deployment end date must be on or after start date');
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

    // Validate student ID format
    deploymentData.selected_students.forEach((studentId, index) => {
      if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
        errors.push(`Invalid student ID at position ${index + 1}`);
      }
    });
  }

  // Notes validation (optional)
  if (deploymentData.notes && deploymentData.notes.length > 2000) {
    errors.push('Notes must not exceed 2000 characters');
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

  // Automatic Lifecycle: Deployment activation and completion are automated based on the deployment schedule.
  // Coordinators can only cancel a deployment before it becomes active (pending).
  if (newStatus === 'active' || newStatus === 'ongoing' || newStatus === 'completed') {
    errors.push('Deployment activation and completion are automated based on schedule and cannot be triggered manually.');
  } else if (newStatus === 'cancelled') {
    if (currentStatus !== 'pending') {
      errors.push('Only pending deployments that have not yet become active can be cancelled.');
    }
  } else {
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
    errors.push(`Student ${student.full_name || 'Volunteer'} has incomplete profile`);
  }

  // Check CMO compliance
  if (student.cmo_compliance_status !== 'compliant') {
    errors.push(`Student ${student.full_name || 'Volunteer'} is not yet CMO compliant`);
  }

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

  const needed = Number(studentsNeeded) || 0;
  if (needed > 0) {
    const totalAssigned = selectedCount + alreadyAssigned;
    if (totalAssigned > needed) {
      errors.push(`Cannot assign ${totalAssigned} students. Only ${needed} students needed (${alreadyAssigned} already assigned)`);
    }
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
  if (trimmedName.length < 3) {
    errors.push('Batch name must be at least 3 characters long');
  }

  if (trimmedName.length > 255) {
    errors.push('Batch name must not exceed 255 characters');
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

  const startStr = String(startDate).split('T')[0];
  const endStr = String(endDate).split('T')[0];

  if (isNaN(new Date(startStr).getTime())) {
    errors.push('Invalid start date format');
  }

  if (isNaN(new Date(endStr).getTime())) {
    errors.push('Invalid end date format');
  }

  if (endStr < startStr) {
    errors.push('End date must be on or after start date');
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