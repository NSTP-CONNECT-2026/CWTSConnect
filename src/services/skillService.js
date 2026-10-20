/**
 * CWTSConnect — Skills Management Service
 * Dual persistence: Supabase `skills` table with local JSON store fallback (`skills_store.json`).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const supabase = require('../config/supabaseClient');

const LOCAL_STORE_PATH = path.join(__dirname, '../../data/skills_store.json');

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
    console.error('Error reading local skills store:', err);
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
    console.error('Error writing local skills store:', err);
    return false;
  }
}

/**
 * Get all skills
 * @param {object} options - { activeOnly: boolean }
 * @returns {Promise<Array>}
 */
async function getAllSkills(options = {}) {
  try {
    let query = supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });

    if (options.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      // If table does not exist or schema cache error, fall back to local store
      const localData = readLocalStore();
      if (options.activeOnly) {
        return localData.filter(s => s.is_active !== false);
      }
      return localData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Sync database data to local store
    if (Array.isArray(data) && data.length > 0) {
      writeLocalStore(data);
      return data;
    }

    return readLocalStore();
  } catch (err) {
    console.warn('getAllSkills falling back to local store:', err.message);
    const localData = readLocalStore();
    if (options.activeOnly) {
      return localData.filter(s => s.is_active !== false);
    }
    return localData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
}

/**
 * Get single skill by ID
 */
async function getSkillById(id) {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('skill_id', id)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    // Ignore and fallback
  }

  const localList = readLocalStore();
  return localList.find(s => String(s.skill_id) === String(id)) || null;
}

/**
 * Create a new skill
 */
async function createSkill({ name, description = '', category = 'General', is_active = true }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new Error('Skill name is required.');
  }

  const localList = readLocalStore();
  const existsLocal = localList.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
  if (existsLocal) {
    throw new Error(`A skill with the name "${trimmedName}" already exists.`);
  }

  const now = new Date().toISOString();
  const newId = crypto.randomUUID ? crypto.randomUUID() : `sk-${Date.now()}`;

  const newSkill = {
    skill_id: newId,
    name: trimmedName,
    description: (description || '').trim(),
    category: (category || 'General').trim(),
    is_active: is_active !== false,
    created_at: now,
    updated_at: now
  };

  let savedToDb = false;
  try {
    const { data, error } = await supabase
      .from('skills')
      .insert([newSkill])
      .select()
      .maybeSingle();

    if (!error && data) {
      newSkill.skill_id = data.skill_id || newSkill.skill_id;
      savedToDb = true;
    }
  } catch (err) {
    console.warn('Failed to insert skill into Supabase, saving to local store:', err.message);
  }

  // Save to local store
  localList.push(newSkill);
  localList.sort((a, b) => a.name.localeCompare(b.name));
  writeLocalStore(localList);

  return newSkill;
}

/**
 * Update an existing skill
 */
async function updateSkill(id, { name, description, category, is_active }) {
  if (!id) {
    throw new Error('Skill ID is required.');
  }

  const localList = readLocalStore();
  const index = localList.findIndex(s => String(s.skill_id) === String(id));

  if (index === -1) {
    throw new Error('Skill not found.');
  }

  const existing = localList[index];
  const oldName = existing.name;

  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Skill name cannot be empty.');
    }
    const duplicate = localList.some(s => 
      String(s.skill_id) !== String(id) && s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Another skill with the name "${trimmedName}" already exists.`);
    }
    existing.name = trimmedName;
  }

  if (description !== undefined) {
    existing.description = description.trim();
  }

  if (category !== undefined) {
    existing.category = category.trim() || 'General';
  }

  if (is_active !== undefined) {
    existing.is_active = Boolean(is_active);
  }

  existing.updated_at = new Date().toISOString();

  // Try updating in Supabase
  try {
    await supabase
      .from('skills')
      .update({
        name: existing.name,
        description: existing.description,
        category: existing.category,
        is_active: existing.is_active,
        updated_at: existing.updated_at
      })
      .eq('skill_id', id);
  } catch (err) {
    console.warn('Failed to update skill in Supabase:', err.message);
  }

  // Update local store
  localList[index] = existing;
  localList.sort((a, b) => a.name.localeCompare(b.name));
  writeLocalStore(localList);

  // If name changed, synchronize request types that referenced oldName
  if (name !== undefined && oldName !== existing.name) {
    try {
      const requestTypeService = require('./requestTypeService');
      const allTypes = await requestTypeService.getAllRequestTypes();
      for (const t of allTypes) {
        if (Array.isArray(t.required_skills) && t.required_skills.includes(oldName)) {
          const updatedSkills = t.required_skills.map(s => (s === oldName ? existing.name : s));
          await requestTypeService.updateRequestType(t.type_id, { required_skills: updatedSkills });
        }
      }
    } catch (syncErr) {
      console.warn('Could not sync renamed skill across request types:', syncErr.message);
    }
  }

  return existing;
}

/**
 * Delete a skill
 */
async function deleteSkill(id) {
  if (!id) {
    throw new Error('Skill ID is required.');
  }

  const localList = readLocalStore();
  const index = localList.findIndex(s => String(s.skill_id) === String(id));

  if (index === -1) {
    throw new Error('Skill not found.');
  }

  const removedSkill = localList[index];

  // Try removing from Supabase
  try {
    await supabase
      .from('skills')
      .delete()
      .eq('skill_id', id);
  } catch (err) {
    console.warn('Failed to delete skill from Supabase:', err.message);
  }

  localList.splice(index, 1);
  writeLocalStore(localList);

  // Remove this skill from any request types currently referencing it
  try {
    const requestTypeService = require('./requestTypeService');
    const allTypes = await requestTypeService.getAllRequestTypes();
    for (const t of allTypes) {
      if (Array.isArray(t.required_skills) && t.required_skills.includes(removedSkill.name)) {
        const updatedSkills = t.required_skills.filter(s => s !== removedSkill.name);
        await requestTypeService.updateRequestType(t.type_id, { required_skills: updatedSkills });
      }
    }
  } catch (syncErr) {
    console.warn('Could not cleanup deleted skill from request types:', syncErr.message);
  }

  return true;
}

module.exports = {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill
};
