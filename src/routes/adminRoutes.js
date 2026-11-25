/**
 * NSTPConnect - Administrator API Routes
 * Protected by requireAdminAccess (Zero-login for localhost / stealth 404 for unauthorized visitors)
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdminAccess } = require('../middlewares/adminAuthMiddleware');

// Apply admin access control to all routes in this router
router.use(requireAdminAccess);

// ─── MODULE 1: USER ACCOUNTS & HELPDESK ───────────────────────────────────────
router.get('/users', adminController.listUsers);
router.put('/users/:userId/email', adminController.updateUserEmail);
router.post('/users/:userId/reset-password', adminController.resetUserPassword);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.post('/coordinators', adminController.createCoordinatorAccount);

// ─── MODULE 2: AUDIT LOGS & TRACEABILITY ──────────────────────────────────────
router.get('/audit-logs', adminController.listAuditLogs);
router.get('/audit-summary', adminController.getAuditSummary);
router.get('/audit-export', adminController.exportAuditLogsCsv);

// ─── MODULE 3: SYSTEM HEALTH & DIAGNOSTICS ───────────────────────────────────
router.get('/health', adminController.getSystemHealth);
router.get('/errors', adminController.getSystemErrors);

module.exports = router;
