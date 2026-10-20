/**
 * NSTPConnect - Notification Controller
 * Handles system notifications HTTP requests
 */

const notificationService = require('../services/notificationService');

/**
 * Gets user's notifications
 * GET /api/notifications
 */
async function getUserNotifications(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const filters = {
      is_read: req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined,
      notification_type: req.query.type,
      priority: req.query.priority,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const notifications = await notificationService.getUserNotifications(userId, filters);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get Notifications Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets unread notification count
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.json({ success: true, data: { unread_count: 0 } });
    }

    const count = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unread_count: count }
    });
  } catch (error) {
    console.error('Get Unread Count Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Marks notification as read
 * PUT /api/notifications/:notificationId/read
 */
async function markAsRead(req, res) {
  try {
    const notificationId = req.params.notificationId || req.params.id;
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notification = await notificationService.markAsRead(notificationId, userId);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark As Read Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Marks all notifications as read
 * PUT /api/notifications/mark-all-read
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const count = await notificationService.markAllAsRead(userId);
    
    res.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      data: { count }
    });
  } catch (error) {
    console.error('Mark All As Read Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Deletes a notification
 * DELETE /api/notifications/:notificationId
 */
async function deleteNotification(req, res) {
  try {
    const notificationId = req.params.notificationId || req.params.id;
    const userId = req.session?.user?.user_id || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await notificationService.deleteNotification(notificationId, userId);
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete Notification Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Gets notification preferences
 * GET /api/notifications/preferences
 */
async function getNotificationPreferences(req, res) {
  try {
    const userId = req.session.user.user_id;
    const preferences = await notificationService.getNotificationPreferences(userId);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get Notification Preferences Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Updates notification preferences
 * PUT /api/notifications/preferences
 */
async function updateNotificationPreferences(req, res) {
  try {
    const userId = req.session.user.user_id;
    const preferences = req.body;

    const updated = await notificationService.updateNotificationPreferences(userId, preferences);
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Update Notification Preferences Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Creates a notification (admin/system use)
 * POST /api/notifications/create
 */
async function createNotification(req, res) {
  try {
    const notificationData = req.body;

    if (!notificationData.user_id || !notificationData.notification_type || !notificationData.title || !notificationData.message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, notification_type, title, message'
      });
    }

    const notification = await notificationService.createNotification(notificationData);
    
    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create Notification Error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Cleans up old notifications
 * DELETE /api/notifications/cleanup
 */
async function cleanupOldNotifications(req, res) {
  try {
    const userId = req.session.user.user_id;
    const count = await notificationService.cleanupOldNotifications(userId);
    
    res.json({
      success: true,
      message: `Deleted ${count} old notifications`,
      data: { count }
    });
  } catch (error) {
    console.error('Cleanup Notifications Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  createNotification,
  cleanupOldNotifications,
  // Aliases for route compatibility
  getMyNotifications: getUserNotifications,
  getPreferences: getNotificationPreferences,
  updatePreferences: updateNotificationPreferences,
  sendNotification: createNotification,
  sendBulkNotification: async (req, res) => {
    try {
      const { user_ids, notification_type, title, message, priority } = req.body;
      
      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'user_ids array is required'
        });
      }
      
      const notifications = await Promise.all(
        user_ids.map(user_id => 
          notificationService.createNotification({
            user_id,
            notification_type,
            title,
            message,
            priority
          })
        )
      );
      
      res.status(201).json({
        success: true,
        message: `Sent ${notifications.length} notifications`,
        data: { count: notifications.length }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};