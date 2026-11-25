/**
 * NSTPConnect - Custom Student Requirement Storage Adapter
 * Provides local file-backed persistence for student requirement records
 * in case Supabase PostgreSQL table has a CHECK constraint on requirement_type.
 * Guarantees zero upload failures when coordinators add custom requirements.
 */

const fs = require('fs');
const path = require('path');

const STORAGE_FILE_PATH = path.join(__dirname, '../../data/custom_student_requirements.json');

function ensureFileExists() {
  const dir = path.dirname(STORAGE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE_PATH)) {
    fs.writeFileSync(STORAGE_FILE_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

function readAllRecords() {
  try {
    ensureFileExists();
    const raw = fs.readFileSync(STORAGE_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[CustomReqStorage] Error reading records:', err.message);
    return [];
  }
}

function writeAllRecords(records) {
  try {
    ensureFileExists();
    fs.writeFileSync(STORAGE_FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[CustomReqStorage] Error writing records:', err.message);
    return false;
  }
}

function getCustomRequirementsForUser(userId) {
  const records = readAllRecords();
  return records.filter(r => r.user_id === userId);
}

function getCustomRequirementById(requirementId) {
  const records = readAllRecords();
  return records.find(r => r.requirement_id === requirementId) || null;
}

function saveCustomRequirement(recordData) {
  const records = readAllRecords();
  const existingIndex = records.findIndex(
    r => r.user_id === recordData.user_id && r.requirement_type === recordData.requirement_type
  );

  if (existingIndex !== -1) {
    records[existingIndex] = {
      ...records[existingIndex],
      ...recordData,
      updated_at: new Date().toISOString()
    };
    writeAllRecords(records);
    return records[existingIndex];
  } else {
    const newRecord = {
      requirement_id: recordData.requirement_id || 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...recordData,
      created_at: recordData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    records.push(newRecord);
    writeAllRecords(records);
    return newRecord;
  }
}

function updateCustomRequirementStatus(requirementId, status, remarks = null, reviewedBy = null) {
  const records = readAllRecords();
  const target = records.find(r => r.requirement_id === requirementId);
  if (!target) return null;

  target.status = status;
  target.remarks = remarks;
  target.reviewed_at = new Date().toISOString();
  target.reviewed_by = reviewedBy;
  target.updated_at = new Date().toISOString();

  writeAllRecords(records);
  return target;
}

module.exports = {
  getCustomRequirementsForUser,
  getCustomRequirementById,
  saveCustomRequirement,
  updateCustomRequirementStatus
};
