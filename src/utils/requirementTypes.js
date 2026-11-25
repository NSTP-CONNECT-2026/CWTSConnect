/**
 * CMO Requirement Types Configuration
 * Dynamically driven by Coordinator settings in requirementConfigService
 */

const { getActiveRequirements } = require('../services/requirementConfigService');

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
  [REQUIREMENT_TYPES.NOTARIZED_PARENT_WAIVER]: 'Upload a clear photo or scanned copy of the signed and notarized parent\'s waiver form.',
  [REQUIREMENT_TYPES.VALIDATED_STUDENT_ID]: 'Upload a clear photo or scanned copy of your validated LSPU Student ID.',
  [REQUIREMENT_TYPES.VALID_PARENT_ID]: 'Upload a clear photo of your parent or legal guardian\'s government-issued ID.',
  [REQUIREMENT_TYPES.MEDICAL_CERTIFICATE]: 'Upload a clear photo or scanned copy of your fit-to-train medical certificate.'
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
 * Validates if requirement type is valid according to active coordinator-configured requirements
 * @param {string} type - Requirement type to validate
 * @returns {boolean} Is valid
 */
function isValidRequirementType(type) {
  if (!type) return false;
  const activeReqs = getActiveRequirements();
  if (activeReqs.some(r => r.code === type || r.id === type)) return true;
  return Object.values(REQUIREMENT_TYPES).includes(type);
}

/**
 * Gets all active requirement types as array of strings
 * @returns {Array<string>} Array of requirement types
 */
function getAllRequirementTypes() {
  const activeReqs = getActiveRequirements();
  if (Array.isArray(activeReqs) && activeReqs.length > 0) {
    return activeReqs.map(r => r.code);
  }
  return Object.values(REQUIREMENT_TYPES);
}

/**
 * Gets requirement info for frontend rendering
 * @returns {Array} Array of requirement info objects
 */
function getRequirementInfo() {
  const activeReqs = getActiveRequirements();
  if (Array.isArray(activeReqs) && activeReqs.length > 0) {
    return activeReqs.map(r => ({
      type: r.code,
      id: r.code,
      displayName: r.name,
      description: r.description,
      isRequired: r.is_required !== false,
      order: r.order || 0
    }));
  }

  return getAllRequirementTypes().map(type => ({
    type,
    id: type,
    displayName: REQUIREMENT_DISPLAY_NAMES[type] || type,
    description: REQUIREMENT_DESCRIPTIONS[type] || 'Upload a clear photo or scanned copy.'
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
