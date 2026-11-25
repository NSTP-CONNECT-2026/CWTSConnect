/**
 * NSTPConnect - Admin Service
 * Handles core business logic for the Administrator Portal:
 * - Module 1: Account Management & Helpdesk (User lookup, email correction, password reset, status toggle)
 * - Module 2: Audit Trail coordination
 * - Module 3: System Health Diagnostics & Error Tracking
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');
const { logAction } = require('./auditLogger');
const { getOfficialProfile, updateOfficialProfile } = require('./communityOfficialStore');

const DATA_DIR = path.join(__dirname, '../../data');
const ERROR_LOGS_PATH = path.join(DATA_DIR, 'system_errors.json');

// Ensure error logs file exists
let _errorCache = [];
try {
  if (fs.existsSync(ERROR_LOGS_PATH)) {
    const raw = fs.readFileSync(ERROR_LOGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) _errorCache = parsed;
  }
} catch (e) {
  _errorCache = [];
}

function persistErrorLogs() {
  try {
    fs.writeFileSync(ERROR_LOGS_PATH, JSON.stringify(_errorCache, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist error logs:', e.message);
  }
}

/**
 * Log a technical/system error for admin diagnostics
 */
function logSystemError(error, context = 'General') {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    context,
    message: error.message || String(error),
    stack: error.stack || null,
    timestamp: new Date().toISOString()
  };
  _errorCache.unshift(entry);
  if (_errorCache.length > 500) _errorCache = _errorCache.slice(0, 500);
  persistErrorLogs();
  return entry;
}

/**
 * MODULE 1: Get all users with full search and filtering
 */
async function getAllUsers({ role = 'all', status = 'all', searchTerm = '', page = 1, limit = 20 } = {}) {
  try {
    let query = supabase
      .from('users')
      .select(`
        user_id,
        email,
        role,
        account_status,
        cmo_compliance_status,
        profile_status,
        created_at,
        updated_at,
        student_profiles(
          full_name,
          student_number,
          course,
          year_level,
          section,
          contact_number,
          municipality,
          province,
          barangay,
          nstp_component
        )
      `, { count: 'exact' });

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status && status !== 'all') {
      query = query.eq('account_status', status);
    }

    const { data: users, count, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to query users: ' + error.message);
    }

    // Enrich users with student profile flattening or community official store info
    let enriched = (users || []).map(u => {
      let profile = {};
      if (u.student_profiles) {
        profile = Array.isArray(u.student_profiles) ? (u.student_profiles[0] || {}) : u.student_profiles;
      }

      // If community official, check communityOfficialStore
      let officialMeta = null;
      if (u.role === 'community_official') {
        officialMeta = getOfficialProfile(u.user_id) || {};
      }

      const displayName = profile.full_name || officialMeta?.full_name || (u.role === 'nstp_official' ? 'NSTP Coordinator' : 'User');
      const studentNum = profile.student_number || 'N/A';
      const courseInfo = profile.course ? `${profile.course} ${profile.year_level || ''} ${profile.section || ''}`.trim() : (officialMeta?.position || 'Staff');
      const locationInfo = profile.municipality || officialMeta?.municipality || 'Laguna';

      return {
        user_id: u.user_id,
        email: u.email,
        role: u.role,
        account_status: u.account_status || 'active',
        cmo_compliance_status: u.cmo_compliance_status,
        profile_status: u.profile_status,
        created_at: u.created_at,
        display_name: displayName,
        student_number: studentNum,
        course_info: courseInfo,
        location_info: locationInfo,
        contact_number: profile.contact_number || officialMeta?.contact_number || 'N/A',
        community_name: officialMeta?.community_name || 'N/A',
        position: officialMeta?.position || 'N/A'
      };
    });

    // Client-side search matching student_number, full_name, email, course
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      enriched = enriched.filter(u => 
        u.email.toLowerCase().includes(term) ||
        u.display_name.toLowerCase().includes(term) ||
        u.student_number.toLowerCase().includes(term) ||
        u.course_info.toLowerCase().includes(term) ||
        u.location_info.toLowerCase().includes(term)
      );
    }

    const totalCount = enriched.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageSize;
    const paginated = enriched.slice(offset, offset + pageSize);

    return {
      users: paginated,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / pageSize),
      limit: pageSize
    };
  } catch (error) {
    logSystemError(error, 'getAllUsers');
    throw error;
  }
}

/**
 * MODULE 1: Update a user's email address (Helpdesk typo fix)
 */
async function updateUserEmail(userId, newEmail, adminUser, req) {
  try {
    const cleanEmail = (newEmail || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    // Check if new email is already taken by another user
    const { data: existing, error: checkErr } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing && existing.user_id !== userId) {
      throw new Error(`The email address "${cleanEmail}" is already registered to another account.`);
    }

    // Get old user details for audit
    const { data: oldUser } = await supabase
      .from('users')
      .select('user_id, email, role')
      .eq('user_id', userId)
      .single();

    const oldEmail = oldUser ? oldUser.email : 'Unknown';

    // Update in Supabase
    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({
        email: cleanEmail,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateErr) {
      throw new Error('Database update failed: ' + updateErr.message);
    }

    // Audit log
    await logAction({
      actorId: adminUser?.user_id || 'sysadmin',
      actorName: adminUser?.full_name || 'System Administrator',
      actorRole: 'admin',
      actionType: 'USER_EMAIL_UPDATED',
      targetType: 'user',
      targetId: userId,
      targetName: cleanEmail,
      description: `Updated email address for ${oldUser?.role || 'user'} from "${oldEmail}" to "${cleanEmail}".`,
      req
    });

    return {
      success: true,
      message: `Email successfully updated to "${cleanEmail}".`,
      user: updated
    };
  } catch (error) {
    logSystemError(error, 'updateUserEmail');
    throw error;
  }
}

/**
 * MODULE 1: Reset a user's password (One-click Helpdesk Reset)
 */
async function resetUserPassword(userId, customPassword = '', adminUser, req) {
  try {
    const newPassword = (customPassword && customPassword.trim()) ? customPassword.trim() : 'Lspu2026!Temp';
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { data: user, error: getErr } = await supabase
      .from('users')
      .select('user_id, email, role')
      .eq('user_id', userId)
      .single();

    if (getErr || !user) {
      throw new Error('Target user account not found.');
    }

    // Update in Supabase
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateErr) {
      throw new Error('Failed to update password: ' + updateErr.message);
    }

    // Audit log
    await logAction({
      actorId: adminUser?.user_id || 'sysadmin',
      actorName: adminUser?.full_name || 'System Administrator',
      actorRole: 'admin',
      actionType: 'PASSWORD_RESET',
      targetType: 'user',
      targetId: userId,
      targetName: user.email,
      description: `Reset password for ${user.role} (${user.email}). Temporary credentials issued: "${newPassword}".`,
      req
    });

    return {
      success: true,
      temporaryPassword: newPassword,
      message: `Password reset successfully. The temporary password is "${newPassword}".`
    };
  } catch (error) {
    logSystemError(error, 'resetUserPassword');
    throw error;
  }
}

/**
 * MODULE 1: Toggle account status (Active, Inactive, Suspended)
 */
async function toggleUserStatus(userId, newStatus, adminUser, req) {
  try {
    const validStatuses = ['active', 'inactive', 'suspended'];
    const statusClean = (newStatus || '').toLowerCase().trim();
    if (!validStatuses.includes(statusClean)) {
      throw new Error('Invalid account status. Valid choices are: active, inactive, suspended.');
    }

    const { data: user } = await supabase
      .from('users')
      .select('user_id, email, role, account_status')
      .eq('user_id', userId)
      .single();

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({
        account_status: statusClean,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateErr) {
      throw new Error('Failed to update account status: ' + updateErr.message);
    }

    // Audit log
    await logAction({
      actorId: adminUser?.user_id || 'sysadmin',
      actorName: adminUser?.full_name || 'System Administrator',
      actorRole: 'admin',
      actionType: 'ACCOUNT_STATUS_CHANGED',
      targetType: 'user',
      targetId: userId,
      targetName: user?.email || 'User',
      description: `Changed account status of ${user?.email || userId} from "${user?.account_status || 'active'}" to "${statusClean}".`,
      req
    });

    return {
      success: true,
      message: `Account status updated to "${statusClean}".`,
      user: updated
    };
  } catch (error) {
    logSystemError(error, 'toggleUserStatus');
    throw error;
  }
}

/**
 * MODULE 1: Create a new NSTP Coordinator Account
 */
async function createCoordinatorAccount({ email, full_name, password }, adminUser, req) {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid official email address.');
    }

    const initialPassword = (password && password.trim()) ? password.trim() : 'Lspu2026!Coord';
    const hashedPassword = await bcrypt.hash(initialPassword, 12);

    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .insert([{
        email: cleanEmail,
        password_hash: hashedPassword,
        role: 'nstp_official',
        account_status: 'active',
        profile_status: 'complete',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createErr) {
      if (createErr.code === '23505') {
        throw new Error(`An account with email "${cleanEmail}" already exists.`);
      }
      throw new Error('Failed to create coordinator account: ' + createErr.message);
    }

    // Audit log
    await logAction({
      actorId: adminUser?.user_id || 'sysadmin',
      actorName: adminUser?.full_name || 'System Administrator',
      actorRole: 'admin',
      actionType: 'COORDINATOR_CREATED',
      targetType: 'user',
      targetId: newUser.user_id,
      targetName: cleanEmail,
      description: `Created new NSTP Coordinator account for ${full_name || cleanEmail} (${cleanEmail}).`,
      req
    });

    return {
      success: true,
      message: `NSTP Coordinator account for "${cleanEmail}" created successfully.`,
      temporaryPassword: initialPassword,
      user: newUser
    };
  } catch (error) {
    logSystemError(error, 'createCoordinatorAccount');
    throw error;
  }
}

/**
 * MODULE 3: System Health Diagnostics
 */
async function getSystemHealth() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  let dbMessage = 'Connected to Supabase PostgreSQL';

  try {
    const dbPingStart = Date.now();
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    dbLatencyMs = Date.now() - dbPingStart;
    if (error) {
      dbStatus = 'degraded';
      dbMessage = error.message;
    }
  } catch (err) {
    dbStatus = 'error';
    dbLatencyMs = -1;
    dbMessage = err.message;
  }

  // Cloudinary Check
  const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'Not configured';
  const cloudinaryStatus = process.env.CLOUDINARY_API_KEY ? 'healthy' : 'degraded';

  // System Memory & Uptime
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

  // Aggregate System Records
  let userCounts = { total: 0, students: 0, coordinators: 0, partners: 0 };
  let requestCounts = { total: 0, approved: 0 };
  let deploymentCounts = { total: 0 };

  try {
    const { data: usersData } = await supabase.from('users').select('role');
    if (usersData) {
      userCounts.total = usersData.length;
      userCounts.students = usersData.filter(u => u.role === 'student').length;
      userCounts.coordinators = usersData.filter(u => u.role === 'nstp_official').length;
      userCounts.partners = usersData.filter(u => u.role === 'community_official').length;
    }

    const { count: reqCount } = await supabase.from('community_requests').select('*', { count: 'exact', head: true });
    requestCounts.total = reqCount || 0;

    const { count: depCount } = await supabase.from('deployments').select('*', { count: 'exact', head: true });
    deploymentCounts.total = depCount || 0;
  } catch (e) {}

  return {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseDurationMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      provider: 'Supabase PostgreSQL',
      message: dbMessage
    },
    storage: {
      status: cloudinaryStatus,
      provider: 'Cloudinary CDN',
      cloudName: cloudinaryCloudName
    },
    server: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      uptimeFormatted,
      uptimeSeconds,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
      }
    },
    systemMetrics: {
      users: userCounts,
      requests: requestCounts,
      deployments: deploymentCounts
    }
  };
}

/**
 * MODULE 3: Get recent technical error logs
 */
function getSystemErrors() {
  return {
    errors: _errorCache.slice(0, 50),
    totalErrors: _errorCache.length
  };
}

module.exports = {
  getAllUsers,
  updateUserEmail,
  resetUserPassword,
  toggleUserStatus,
  createCoordinatorAccount,
  getSystemHealth,
  getSystemErrors,
  logSystemError
};
