/**
 * NSTPConnect - Administrator Controller
 * Endpoints powering:
 * - Module 1: User Account Helpdesk (Lookup, Email Typo Fix, Password Reset, Status Toggle)
 * - Module 2: Audit Logs & Traceability
 * - Module 3: System Health Diagnostics & Error Monitor
 */

const adminService = require('../services/adminService');
const auditLogger = require('../services/auditLogger');

/**
 * GET /api/admin/users
 */
async function listUsers(req, res) {
  try {
    const { role, status, search, page, limit } = req.query;
    const result = await adminService.getAllUsers({
      role: role || 'all',
      status: status || 'all',
      searchTerm: search || '',
      page: page || 1,
      limit: limit || 20
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve users.'
    });
  }
}

/**
 * PUT /api/admin/users/:userId/email
 */
async function updateUserEmail(req, res) {
  try {
    const { userId } = req.params;
    const { email } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: 'New email address is required.' });
    }

    const result = await adminService.updateUserEmail(userId, email, req.user, req);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update user email.'
    });
  }
}

/**
 * POST /api/admin/users/:userId/reset-password
 */
async function resetUserPassword(req, res) {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const result = await adminService.resetUserPassword(userId, password, req.user, req);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset user password.'
    });
  }
}

/**
 * PUT /api/admin/users/:userId/status
 */
async function toggleUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ success: false, message: 'User ID and status are required.' });
    }

    const result = await adminService.toggleUserStatus(userId, status, req.user, req);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update account status.'
    });
  }
}

/**
 * POST /api/admin/coordinators
 */
async function createCoordinator(req, res) {
  try {
    const { email, full_name, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Coordinator email is required.' });
    }

    const result = await adminService.createCoordinatorAccount({ email, full_name, password }, req.user, req);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create coordinator account.'
    });
  }
}

/**
 * GET /api/admin/audit-logs
 */
async function listAuditLogs(req, res) {
  try {
    const { role, actionType, search, startDate, endDate, page, limit } = req.query;
    const result = auditLogger.getAuditLogs({
      role: role || 'all',
      actionType: actionType || 'all',
      searchTerm: search || '',
      startDate: startDate || '',
      endDate: endDate || '',
      page: page || 1,
      limit: limit || 25
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit logs.'
    });
  }
}

/**
 * GET /api/admin/audit-summary
 */
async function getAuditSummary(req, res) {
  try {
    const summary = auditLogger.getAuditSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit summary.'
    });
  }
}

/**
 * GET /api/admin/audit-export
 * Exports logs as CSV file download
 */
async function exportAuditLogsCsv(req, res) {
  try {
    const { role, actionType, search, startDate, endDate } = req.query;
    const result = auditLogger.getAuditLogs({
      role: role || 'all',
      actionType: actionType || 'all',
      searchTerm: search || '',
      startDate: startDate || '',
      endDate: endDate || '',
      page: 1,
      limit: 1000
    });

    const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Target Name', 'Target ID', 'Description', 'IP Address'];
    const rows = result.logs.map(l => [
      `"${l.log_id}"`,
      `"${l.created_at}"`,
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      `"${l.actor_role}"`,
      `"${l.action_type}"`,
      `"${(l.target_name || '').replace(/"/g, '""')}"`,
      `"${l.target_id || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.ip_address || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=nstp_audit_logs_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export audit logs: ' + error.message });
  }
}

/**
 * GET /api/admin/health
 */
async function getSystemHealth(req, res) {
  try {
    const health = await adminService.getSystemHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check system health.'
    });
  }
}

/**
 * GET /api/admin/errors
 */
async function getSystemErrors(req, res) {
  try {
    const errors = adminService.getSystemErrors();
    res.json({
      success: true,
      data: errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve system errors.'
    });
  }
}

module.exports = {
  listUsers,
  updateUserEmail,
  resetUserPassword,
  toggleUserStatus,
  createCoordinatorAccount: createCoordinator,
  listAuditLogs,
  getAuditSummary,
  exportAuditLogsCsv,
  getSystemHealth,
  getSystemErrors
};
