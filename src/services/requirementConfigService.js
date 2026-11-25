/**
 * NSTPConnect - Requirement Configuration Service
 * Allows NSTP Coordinators to dynamically define, add, edit, and remove required documents.
 * Persists in data/cmo_requirements_config.json with dual-layer safety.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_FILE_PATH = path.join(__dirname, '../../data/cmo_requirements_config.json');

const DEFAULT_REQUIREMENTS = [
  {
    id: 'notarized_parent_waiver',
    code: 'notarized_parent_waiver',
    name: "Notarized Parent's Waiver",
    description: "Upload a clear photo or scanned copy of the signed and notarized parent's waiver form.",
    is_required: true,
    is_active: true,
    order: 1,
    created_at: '2026-05-16T09:00:00Z'
  },
  {
    id: 'validated_student_id',
    code: 'validated_student_id',
    name: 'Validated Student ID',
    description: 'Upload a clear photo or scanned copy of your validated LSPU Student ID (Front and Back).',
    is_required: true,
    is_active: true,
    order: 2,
    created_at: '2026-05-16T09:00:00Z'
  },
  {
    id: 'valid_parent_id',
    code: 'valid_parent_id',
    name: 'Valid Parent / Guardian ID',
    description: "Upload a clear photo of your parent or legal guardian's government-issued ID with specimen signatures.",
    is_required: true,
    is_active: true,
    order: 3,
    created_at: '2026-05-16T09:00:00Z'
  },
  {
    id: 'medical_certificate',
    code: 'medical_certificate',
    name: 'Medical Certificate',
    description: 'Upload a clear photo or scanned copy of your fit-to-train medical certificate issued by a physician.',
    is_required: true,
    is_active: true,
    order: 4,
    created_at: '2026-05-16T09:00:00Z'
  }
];

function ensureConfigFileExists() {
  const dir = path.dirname(CONFIG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(DEFAULT_REQUIREMENTS, null, 2), 'utf8');
  }
}

function readConfigFromDisk() {
  try {
    ensureConfigFileExists();
    const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_REQUIREMENTS;
  } catch (err) {
    console.error('[RequirementConfig] Error reading config from disk:', err.message);
    return DEFAULT_REQUIREMENTS;
  }
}

function writeConfigToDisk(config) {
  try {
    ensureConfigFileExists();
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[RequirementConfig] Error saving config to disk:', err.message);
    throw new Error('Failed to save requirement configuration.');
  }
}

function sanitizeCode(str) {
  if (!str) return 'req_' + Date.now();
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Gets all configured requirements (both active and inactive)
 */
function getAllRequirementsConfig() {
  return readConfigFromDisk();
}

/**
 * Gets only active requirements (used by students and compliance calculations)
 */
function getActiveRequirements() {
  const all = readConfigFromDisk();
  return all
    .filter(r => r.is_active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Gets requirement by code
 */
function getRequirementByCode(code) {
  if (!code) return null;
  const target = String(code).toLowerCase().trim();
  const all = readConfigFromDisk();
  return all.find(r => r.code === target || r.id === target) || null;
}

/**
 * Adds a new requirement definition
 */
function addRequirement({ name, description, code, is_required = true }, actorId = null) {
  if (!name || !name.trim()) {
    throw new Error('Requirement name is required.');
  }

  const all = readConfigFromDisk();
  const finalCode = sanitizeCode(code || name);

  if (all.some(r => r.code === finalCode)) {
    throw new Error(`A requirement with code "${finalCode}" already exists.`);
  }

  const newReq = {
    id: finalCode,
    code: finalCode,
    name: name.trim(),
    description: description ? description.trim() : `Upload a clear photo or scanned copy of ${name.trim()}.`,
    is_required: Boolean(is_required),
    is_active: true,
    order: all.length + 1,
    created_at: new Date().toISOString()
  };

  all.push(newReq);
  writeConfigToDisk(all);

  try {
    const { logAction } = require('./auditLogger');
    logAction({
      actorId: actorId || 'coordinator',
      action: 'REQUIREMENT_CREATED',
      target: finalCode,
      details: { name: newReq.name, is_required: newReq.is_required, total_requirements: all.filter(r => r.is_active).length }
    });
  } catch (_) {}

  return newReq;
}

/**
 * Updates an existing requirement definition
 */
function updateRequirement(code, updates = {}, actorId = null) {
  const targetCode = sanitizeCode(code);
  const all = readConfigFromDisk();
  const idx = all.findIndex(r => r.code === targetCode || r.id === targetCode);

  if (idx === -1) {
    throw new Error(`Requirement "${targetCode}" not found.`);
  }

  const existing = all[idx];

  if (updates.name && updates.name.trim()) {
    existing.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    existing.description = updates.description.trim();
  }
  if (updates.is_required !== undefined) {
    existing.is_required = Boolean(updates.is_required);
  }
  if (updates.is_active !== undefined) {
    existing.is_active = Boolean(updates.is_active);
  }
  if (typeof updates.order === 'number') {
    existing.order = updates.order;
  }

  existing.updated_at = new Date().toISOString();
  all[idx] = existing;
  writeConfigToDisk(all);

  try {
    const { logAction } = require('./auditLogger');
    logAction({
      actorId: actorId || 'coordinator',
      action: 'REQUIREMENT_UPDATED',
      target: targetCode,
      details: { updates }
    });
  } catch (_) {}

  return existing;
}

/**
 * Deletes or deactivates a requirement
 */
function deleteRequirement(code, actorId = null) {
  const targetCode = sanitizeCode(code);
  const all = readConfigFromDisk();
  const idx = all.findIndex(r => r.code === targetCode || r.id === targetCode);

  if (idx === -1) {
    throw new Error(`Requirement "${targetCode}" not found.`);
  }

  const removed = all.splice(idx, 1)[0];
  writeConfigToDisk(all);

  try {
    const { logAction } = require('./auditLogger');
    logAction({
      actorId: actorId || 'coordinator',
      action: 'REQUIREMENT_DELETED',
      target: targetCode,
      details: { name: removed.name, remaining_count: all.filter(r => r.is_active).length }
    });
  } catch (_) {}

  return removed;
}

/**
 * Resets requirements configuration back to standard defaults
 */
function resetToDefaults(actorId = null) {
  writeConfigToDisk(DEFAULT_REQUIREMENTS);

  try {
    const { logAction } = require('./auditLogger');
    logAction({
      actorId: actorId || 'coordinator',
      action: 'REQUIREMENT_CONFIG_RESET',
      target: 'all',
      details: { count: DEFAULT_REQUIREMENTS.length }
    });
  } catch (_) {}

  return DEFAULT_REQUIREMENTS;
}

module.exports = {
  getAllRequirementsConfig,
  getActiveRequirements,
  getRequirementByCode,
  addRequirement,
  updateRequirement,
  deleteRequirement,
  resetToDefaults,
  DEFAULT_REQUIREMENTS
};
