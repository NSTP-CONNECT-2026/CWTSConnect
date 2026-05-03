/**
 * CMO Requirement Types Configuration
 */

const REQUIREMENT_TYPES = {
  NOTARIZED_PARENT_WAIVER: 'notarized_parent_waiver',
  VALIDATED_STUDENT_ID: 'validated_student_id',
  VALID_PARENT_ID: 'valid_parent_id',
  MEDICAL_CERTIFICATE: 'medical_certificate'
};

const REQUIREMENT_DISPLAY_NAMES = {
  [REQUIREMENT_TYPES.NOTARIZED_PARENT_WAIVER]: 'Notarized Parent\'s Waiver',
  [REQUIREMENT_TYPES.VALIDATED_STUDENT_ID]: 'Validated Student ID',
  [REQUIREMENT_TYPES.VALID_PARENT_ID]: 'Valid Parent ID',
  [REQUIREMENT_TYPES.MEDICAL_CERTIFICATE]: 'Medical Certificate'
};

const REQUIREMENT_DESCRIPTIONS = {
  [REQUIREMENT_TYPES.NOTARIZED_PARENT_WAIVER]: 'Upload a scanned copy or clear photo of the notarized parent\'s waiver.',
  [REQUIREMENT_TYPES.VALIDATED_STUDENT_ID]: 'Upload a scanned copy or clear photo of your validated student ID.',
  [REQUIREMENT_TYPES.VALID_PARENT_ID]: 'Upload a scanned copy or clear photo of your parent or guardian\'s valid ID.',
  [REQUIREMENT_TYPES.MEDICAL_CERTIFICATE]: 'Upload a scanned copy or clear photo of your medical certificate.'
};

const STATUS_TYPES = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const STATUS_DISPLAY_NAMES = {
  [STATUS_TYPES.NOT_SUBMITTED]: 'Not Submitted',
  [STATUS_TYPES.PENDING]: 'Pending Review',
  [STATUS_TYPES.APPROVED]: 'Approved',
  [STATUS_TYPES.REJECTED]: 'Rejected'
};

const CMO_COMPLIANCE_STATUS = {
  INCOMPLETE: 'incomplete',
  PENDING_REVIEW: 'pending_review',
  COMPLIANT: 'compliant',
  REJECTED: 'rejected'
};

const CMO_COMPLIANCE_DISPLAY_NAMES = {
  [CMO_COMPLIANCE_STATUS.INCOMPLETE]: 'Incomplete',
  [CMO_COMPLIANCE_STATUS.PENDING_REVIEW]: 'Pending Review',
  [CMO_COMPLIANCE_STATUS.COMPLIANT]: 'Compliant',
  [CMO_COMPLIANCE_STATUS.REJECTED]: 'Rejected'
};

/**
 * Validates if requirement type is valid
 * @param {string} type - Requirement type to validate
 * @returns {boolean} Is valid
 */
function isValidRequirementType(type) {
  return Object.values(REQUIREMENT_TYPES).includes(type);
}

/**
 * Gets all requirement types as array
 * @returns {Array} Array of requirement types
 */
function getAllRequirementTypes() {
  return Object.values(REQUIREMENT_TYPES);
}

/**
 * Gets requirement info for frontend
 * @returns {Array} Array of requirement info objects
 */
function getRequirementInfo() {
  return getAllRequirementTypes().map(type => ({
    type,
    displayName: REQUIREMENT_DISPLAY_NAMES[type],
    description: REQUIREMENT_DESCRIPTIONS[type]
  }));
}

module.exports = {
  REQUIREMENT_TYPES,
  REQUIREMENT_DISPLAY_NAMES,
  REQUIREMENT_DESCRIPTIONS,
  STATUS_TYPES,
  STATUS_DISPLAY_NAMES,
  CMO_COMPLIANCE_STATUS,
  CMO_COMPLIANCE_DISPLAY_NAMES,
  isValidRequirementType,
  getAllRequirementTypes,
  getRequirementInfo
};