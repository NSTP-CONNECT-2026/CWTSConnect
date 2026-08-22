const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

// All authenticated users - manage own notifications
router.get('/my-notifications', authenticateToken, notificationController.getMyNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);
router.put('/mark-all-read', authenticateToken, notificationController.markAllAsRead);
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

// All authenticated users - manage preferences
router.get('/preferences', authenticateToken, notificationController.getPreferences);
router.put('/preferences', authenticateToken, notificationController.updatePreferences);

// NSTP Official routes - send notifications
router.post('/send', authenticateToken, requireRole(['nstp_official']), notificationController.sendNotification);
router.post('/send-bulk', authenticateToken, requireRole(['nstp_official']), notificationController.sendBulkNotification);

module.exports = router;
