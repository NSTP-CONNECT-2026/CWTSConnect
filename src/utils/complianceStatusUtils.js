/**
 * NSTPConnect - Compliance Status Utilities
 * Handles CMO compliance status computation and validation
 */

const { STATUS_TYPES, CMO_COMPLIANCE_STATUS } = require('./requirementTypes');

/**
 * Computes overall CMO compliance status based on individual requirement statuses
 * @param {Array} requirements - Array of requirement objects with status
 * @returns {string} Overall compliance status
 */
function computeOverallComplianceStatus(requirements) {
  if (!requirements || requirements.length === 0) {
    return CMO_COMPLIANCE_STATUS.INCOMPLETE;
  }

  const totalRequired = requirements.length;
  const submittedCount = requirements.filter(req => req.status !== STATUS_TYPES.NOT_SUBMITTED).length;
  const pendingCount = requirements.filter(req => req.status === STATUS_TYPES.PENDING).length;
  const approvedCount = requirements.filter(req => req.status === STATUS_TYPES.APPROVED).length;
  const rejectedCount = requirements.filter(req => req.status === STATUS_TYPES.REJECTED).length;

  // Business rules for overall status
  if (rejectedCount > 0) {
    return CMO_COMPLIANCE_STATUS.REJECTED;
  } else if (approvedCount === totalRequired) {
    return CMO_COMPLIANCE_STATUS.COMPLIANT;
  } else if (submittedCount === totalRequired) {
    return CMO_COMPLIANCE_STATUS.PENDING_REVIEW;
  } else {
    return CMO_COMPLIANCE_STATUS.INCOMPLETE;
  }
}

/**
 * Gets compliance status display information
 * @param {string} status - Compliance status
 * @returns {object} Display information with label, color, description
 */
function getComplianceStatusDisplay(status) {
  const statusMap = {
    [CMO_COMPLIANCE_STATUS.INCOMPLETE]: {
      label: 'Incomplete',
      color: 'gray',
      description: 'Missing required documents'
    },
    [CMO_COMPLIANCE_STATUS.PENDING_REVIEW]: {
      label: 'Pending Review',
      color: 'yellow',
      description: 'All documents submitted, awaiting review'
    },
    [CMO_COMPLIANCE_STATUS.COMPLIANT]: {
      label: 'Compliant',
      color: 'green',
      description: 'All requirements approved'
    },
    [CMO_COMPLIANCE_STATUS.REJECTED]: {
      label: 'Rejected',
      color: 'red',
      description: 'One or more requirements rejected'
    }
  };

  return statusMap[status] || statusMap[CMO_COMPLIANCE_STATUS.INCOMPLETE];
}

/**
 * Gets requirement status display information
 * @param {string} status - Requirement status
 * @returns {object} Display information with label, color, description
 */
function getRequirementStatusDisplay(status) {
  const statusMap = {
    [STATUS_TYPES.NOT_SUBMITTED]: {
      label: 'Not Submitted',
      color: 'gray',
      description: 'Document not yet uploaded'
    },
    [STATUS_TYPES.PENDING]: {
      label: 'Pending Review',
      color: 'yellow',
      description: 'Document uploaded, awaiting review'
    },
    [STATUS_TYPES.APPROVED]: {
      label: 'Approved',
      color: 'green',
      description: 'Document approved by NSTP Official'
    },
    [STATUS_TYPES.REJECTED]: {
      label: 'Rejected',
      color: 'red',
      description: 'Document rejected, needs resubmission'
    }
  };

  return statusMap[status] || statusMap[STATUS_TYPES.NOT_SUBMITTED];
}

/**
 * Validates if a status transition is allowed
 * @param {string} currentStatus - Current requirement status
 * @param {string} newStatus - New status to transition to
 * @returns {boolean} Whether transition is allowed
 */
function isValidStatusTransition(currentStatus, newStatus) {
  // NSTP Officials can only approve or reject pending requirements
  if (newStatus === STATUS_TYPES.APPROVED || newStatus === STATUS_TYPES.REJECTED) {
    return currentStatus === STATUS_TYPES.PENDING;
  }

  // Students can resubmit rejected requirements (becomes pending)
  if (newStatus === STATUS_TYPES.PENDING) {
    return currentStatus === STATUS_TYPES.REJECTED || currentStatus === STATUS_TYPES.NOT_SUBMITTED;
  }

  return false;
}

/**
 * Checks if a student is eligible for deployment
 * @param {string} profileStatus - Student profile completion status
 * @param {string} cmoComplianceStatus - CMO compliance status
 * @returns {boolean} Whether student is eligible for deployment
 */
function isEligibleForDeployment(profileStatus, cmoComplianceStatus) {
  return profileStatus === 'complete' && cmoComplianceStatus === CMO_COMPLIANCE_STATUS.COMPLIANT;
}

/**
 * Gets summary statistics for compliance dashboard
 * @param {Array} students - Array of student objects with compliance data
 * @returns {object} Summary statistics
 */
function getComplianceSummary(students) {
  if (!students || students.length === 0) {
    return {
      totalStudentsWithSubmissions: 0,
      pendingReview: 0,
      compliantStudents: 0,
      rejectedRequirements: 0,
      incompleteSubmissions: 0
    };
  }

  const totalStudentsWithSubmissions = students.filter(student => 
    student.cmo_compliance_status !== CMO_COMPLIANCE_STATUS.INCOMPLETE
  ).length;

  const pendingReview = students.filter(student => 
    student.cmo_compliance_status === CMO_COMPLIANCE_STATUS.PENDING_REVIEW
  ).length;

  const compliantStudents = students.filter(student => 
    student.cmo_compliance_status === CMO_COMPLIANCE_STATUS.COMPLIANT
  ).length;

  const rejectedRequirements = students.filter(student => 
    student.cmo_compliance_status === CMO_COMPLIANCE_STATUS.REJECTED
  ).length;

  const incompleteSubmissions = students.filter(student => 
    student.cmo_compliance_status === CMO_COMPLIANCE_STATUS.INCOMPLETE
  ).length;

  return {
    totalStudentsWithSubmissions,
    pendingReview,
    compliantStudents,
    rejectedRequirements,
    incompleteSubmissions
  };
}

module.exports = {
  computeOverallComplianceStatus,
  getComplianceStatusDisplay,
  getRequirementStatusDisplay,
  isValidStatusTransition,
  isEligibleForDeployment,
  getComplianceSummary
};