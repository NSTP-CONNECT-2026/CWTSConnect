/**
 * CWTSConnect — Request Types (School Offered Services) Service
 * Manages institutional services that communities can request.
 * Implements dual persistence: Supabase request_types table with local JSON store fallback.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const supabase = require('../config/supabaseClient');

const LOCAL_STORE_PATH = path.join(__dirname, '../../data/request_types_store.json');

/**
 * Read from local JSON fallback store
 */
function readLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_STORE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading local request_types store:', err);
    return [];
  }
}

/**
 * Write to local JSON fallback store
 */
function writeLocalStore(data) {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing local request_types store:', err);
    return false;
  }
}

/**
 * Get all request types / services
 * @param {object} options - { activeOnly: boolean }
 * @returns {Promise<Array>}
 */
async function getAllRequestTypes(options = {}) {
  try {
    let query = supabase
      .from('request_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      return data;
    }

    // Fallback to local store if table not found or query error
    const local = readLocalStore();
    if (options.activeOnly) {
      return local.filter(item => item.is_active !== false);
    }
    return local;
  } catch (err) {
    console.warn('Supabase query failed for request_types, using local store:', err.message);
    const local = readLocalStore();
    if (options.activeOnly) {
      return local.filter(item => item.is_active !== false);
    }
    return local;
  }
}

/**
 * Get single request type by ID
 */
async function getRequestTypeById(typeId) {
  if (!typeId) return null;

  try {
    const { data, error } = await supabase
      .from('request_types')
      .select('*')
      .eq('type_id', typeId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    // Ignore and fallback
  }

  const local = readLocalStore();
  return local.find(item => item.type_id === typeId) || null;
}

/**
 * Create a new request type
 * @param {object} inputData - { name, description, required_skills, is_active }
 * @param {string} userId - Coordinator user ID
 */
async function createRequestType(inputData, userId = null) {
  const name = (inputData.name || '').trim();
  const description = (inputData.description || '').trim();
  const skills = Array.isArray(inputData.required_skills)
    ? inputData.required_skills.map(s => String(s).trim()).filter(Boolean)
    : [];

  if (!name) {
    throw new Error('Service name is required.');
  }

  if (!description) {
    throw new Error('Service description is required.');
  }

  const newRecord = {
    name,
    description,
    required_skills: skills,
    is_active: inputData.is_active !== false,
    created_by: userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Try saving to Supabase
  try {
    const { data, error } = await supabase
      .from('request_types')
      .insert(newRecord)
      .select()
      .single();

    if (!error && data) {
      // Also update local store for backup consistency
      const local = readLocalStore();
      local.unshift(data);
      writeLocalStore(local);
      return data;
    }
  } catch (err) {
    console.warn('Supabase insert failed, saving to local store:', err.message);
  }

  // Fallback: save to local store
  const local = readLocalStore();
  const duplicate = local.some(item => item.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    throw new Error(`A service named "${name}" already exists.`);
  }

  const recordWithId = {
    type_id: crypto.randomUUID(),
    ...newRecord
  };

  local.unshift(recordWithId);
  writeLocalStore(local);
  return recordWithId;
}

/**
 * Update an existing request type
 */
async function updateRequestType(typeId, inputData, userId = null) {
  if (!typeId) {
    throw new Error('Type ID is required.');
  }

  const name = inputData.name ? inputData.name.trim() : undefined;
  const description = inputData.description ? inputData.description.trim() : undefined;
  const skills = Array.isArray(inputData.required_skills)
    ? inputData.required_skills.map(s => String(s).trim()).filter(Boolean)
    : undefined;

  const updates = {
    updated_at: new Date().toISOString()
  };

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (skills !== undefined) updates.required_skills = skills;
  if (inputData.is_active !== undefined) updates.is_active = !!inputData.is_active;

  // Try updating in Supabase
  try {
    const { data, error } = await supabase
      .from('request_types')
      .update(updates)
      .eq('type_id', typeId)
      .select()
      .maybeSingle();

    if (!error && data) {
      const local = readLocalStore();
      const idx = local.findIndex(item => item.type_id === typeId);
      if (idx !== -1) {
        local[idx] = data;
        writeLocalStore(local);
      }
      return data;
    }
  } catch (err) {
    console.warn('Supabase update failed, updating local store:', err.message);
  }

  // Fallback: update local store
  const local = readLocalStore();
  const idx = local.findIndex(item => item.type_id === typeId);
  if (idx === -1) {
    throw new Error('Request type not found.');
  }

  local[idx] = {
    ...local[idx],
    ...updates
  };

  writeLocalStore(local);
  return local[idx];
}

/**
 * Delete a request type
 */
async function deleteRequestType(typeId) {
  if (!typeId) {
    throw new Error('Type ID is required.');
  }

  // Try deleting from Supabase
  try {
    const { error } = await supabase
      .from('request_types')
      .delete()
      .eq('type_id', typeId);

    if (!error) {
      const local = readLocalStore();
      const filtered = local.filter(item => item.type_id !== typeId);
      writeLocalStore(filtered);
      return true;
    }
  } catch (err) {
    console.warn('Supabase delete failed, removing from local store:', err.message);
  }

  // Fallback: delete from local store
  const local = readLocalStore();
  const initialLength = local.length;
  const filtered = local.filter(item => item.type_id !== typeId);

  if (filtered.length === initialLength) {
    throw new Error('Request type not found.');
  }

  writeLocalStore(filtered);
  return true;
}

module.exports = {
  getAllRequestTypes,
  getRequestTypeById,
  createRequestType,
  updateRequestType,
  deleteRequestType
};
