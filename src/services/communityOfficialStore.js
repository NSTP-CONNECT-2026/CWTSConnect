/**
 * CWTSConnect - Community Official Profiles Store
 * Manages persistent metadata for community partner accounts (designation, contact, community name, location).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const STORE_PATH = path.join(DATA_DIR, 'community_official_profiles.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err.message);
  }
}

// Initial seed map for existing seed accounts
const DEFAULT_OFFICIALS = {
  '1cef9076-2cb8-4bdf-b950-ba01ab03ae06': {
    user_id: '1cef9076-2cb8-4bdf-b950-ba01ab03ae06',
    email: 'communityofficial@gmail.com',
    full_name: 'Hon. Roberto M. Santos',
    position: 'Barangay Captain',
    contact_number: '09178901234',
    community_name: 'Barangay Community Partner',
    barangay: 'Poblacion',
    municipality: 'Santa Cruz',
    province: 'Laguna'
  },
  'f1df9df5-f933-4c7b-93d9-aa52e3f923e0': {
    user_id: 'f1df9df5-f933-4c7b-93d9-aa52e3f923e0',
    email: 'communityofficial2@gmail.com',
    full_name: 'Hon. Maria Elena V. Ramos',
    position: 'Community Liaison Officer',
    contact_number: '09283456789',
    community_name: 'Quinale Civic Outreach',
    barangay: 'Quinale',
    municipality: 'Paete',
    province: 'Laguna'
  }
};

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_OFFICIALS, null, 2), 'utf8');
      return { ...DEFAULT_OFFICIALS };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OFFICIALS, ...parsed };
  } catch (err) {
    console.error('Error reading community official profiles store:', err.message);
    return { ...DEFAULT_OFFICIALS };
  }
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing community official profiles store:', err.message);
    return false;
  }
}

function getOfficialProfile(userId, email) {
  const store = readStore();
  if (userId && store[userId]) return store[userId];
  if (email) {
    const found = Object.values(store).find(o => o.email && o.email.toLowerCase() === email.toLowerCase());
    if (found) return found;
  }
  return null;
}

function saveOfficialProfile(userId, profileData) {
  if (!userId) return false;
  const store = readStore();
  const existing = store[userId] || {};
  store[userId] = {
    ...existing,
    ...profileData,
    user_id: userId,
    updated_at: new Date().toISOString()
  };
  return writeStore(store);
}

function getAllOfficialProfiles() {
  return readStore();
}

module.exports = {
  getOfficialProfile,
  saveOfficialProfile,
  getAllOfficialProfiles
};
