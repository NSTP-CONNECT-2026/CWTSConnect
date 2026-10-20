/**
 * NSTPConnect - Notification Service
 * Handles system notifications business logic
 */

const supabase = require('../config/supabaseClient');

/**
 * Gets notifications for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of notifications
 */
async function getUserNotifications(userId, filters = {}) {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    // Apply read status filter
    if (filters.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }

    // Apply type filter
    if (filters.notification_type) {
      query = query.eq('notification_type', filters.notification_type);
    }

    // Apply priority filter
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    // Limit results
    const limit = filters.limit || 50;
    query = query.limit(limit);

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: notifications, error } = await query;

    if (error) {
      throw new Error('Failed to fetch notifications: ' + error.message);
    }

    return notifications || [];
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
async function getUnreadCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      const { data } = await supabase.rpc('get_unread_notification_count', { target_user_id: userId });
      return data || 0;
    }

    return count || 0;
  } catch (error) {
    console.warn('getUnreadCount error:', error.message);
    return 0;
  }
}

/**
 * Marks a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<object>} Updated notification
 */
async function markAsRead(notificationId, userId) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('notification_id', notificationId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error('Failed to mark notification as read: ' + error.message);
    }

    return notification;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Marks all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
async function markAllAsRead(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('notification_id');

    if (error) {
      const { data: rpcData } = await supabase.rpc('mark_all_notifications_read', { target_user_id: userId });
      return rpcData || 0;
    }

    return data?.length || 0;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Creates a notification safely
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} Created notification
 */
async function createNotification(notificationData) {
  try {
    if (!notificationData || !notificationData.user_id) return null;

    const payload = {
      user_id: notificationData.user_id,
      notification_type: notificationData.notification_type || 'system_announcement',
      title: notificationData.title || 'System Notification',
      message: notificationData.message || '',
      priority: notificationData.priority || 'normal',
      related_deployment_id: notificationData.related_deployment_id || notificationData.related_id || null,
      related_attendance_id: notificationData.related_attendance_id || null,
      related_make_up_id: notificationData.related_make_up_id || null,
      related_request_id: notificationData.related_request_id || null,
      action_url: notificationData.action_url || null,
      action_label: notificationData.action_label || null
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Direct notification insert failed, trying RPC:', error.message);
      const { data: rpcData } = await supabase.rpc('create_notification', {
        target_user_id: payload.user_id,
        notif_type: payload.notification_type,
        notif_title: payload.title,
        notif_message: payload.message,
        notif_priority: payload.priority,
        deployment_id: payload.related_deployment_id,
        attendance_id: payload.related_attendance_id,
        make_up_id: payload.related_make_up_id,
        request_id: payload.related_request_id,
        action_url: payload.action_url,
        action_label: payload.action_label
      });
      return rpcData || null;
    }

    return data;
  } catch (error) {
    console.warn('createNotification service error:', error.message);
    return null;
  }
}

/**
 * Sends notifications to all NSTP Coordinators
 * @param {object} notificationData - Notification data
 * @returns {Promise<Array>} Created notifications
 */
async function notifyCoordinators(notificationData) {
  try {
    const { data: coords, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('role', 'nstp_official');

    if (error || !coords || coords.length === 0) return [];

    const notifs = coords.map(c => ({
      user_id: c.user_id,
      notification_type: notificationData.notification_type || 'system_announcement',
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'normal',
      action_url: notificationData.action_url || null,
      action_label: notificationData.action_label || null,
      related_request_id: notificationData.related_request_id || null,
      related_deployment_id: notificationData.related_deployment_id || null
    }));

    const { data } = await supabase.from('notifications').insert(notifs).select();
    return data || [];
  } catch (err) {
    console.warn('notifyCoordinators error:', err.message);
    return [];
  }
}

/**
 * Deletes a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<void>}
 */
async function deleteNotification(notificationId, userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to delete notification: ' + error.message);
    }
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Gets user's notification preferences
 * @param {string} userId - User ID
 * @returns {Promise<object>} Notification preferences
 */
async function getNotificationPreferences(userId) {
  try {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences yet, return defaults
        return {
          user_id: userId,
          email_enabled: true,
          email_deployment_updates: true,
          email_attendance_reminders: true,
          email_requirement_updates: true,
          email_make_up_updates: true,
          email_system_announcements: true,
          in_app_enabled: true,
          in_app_deployment_updates: true,
          in_app_attendance_reminders: true,
          in_app_requirement_updates: true,
          in_app_make_up_updates: true,
          in_app_system_announcements: true,
          digest_frequency: 'immediate'
        };
      }
      throw new Error('Failed to fetch preferences: ' + error.message);
    }

    return preferences;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Updates user's notification preferences
 * @param {string} userId - User ID
 * @param {object} preferences - Preference updates
 * @returns {Promise<object>} Updated preferences
 */
async function updateNotificationPreferences(userId, preferences) {
  try {
    const { data: updated, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update preferences: ' + error.message);
    }

    return updated;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Sends deployment assignment notification to student
 * @param {string} deploymentId - Deployment ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<void>}
 */
async function notifyDeploymentAssignment(deploymentId, studentId) {
  try {
    await supabase.rpc('notify_deployment_assignment', {
      target_deployment_id: deploymentId,
      target_student_id: studentId
    });
  } catch (error) {
    console.error('Failed to send deployment notification:', error);
    // Don't throw error - notification failure shouldn't break main flow
  }
}

/**
 * Sends attendance reminder notification
 * @param {string} deploymentId - Deployment ID
 * @param {string} studentId - Student user ID
 * @param {string} sessionDate - Session date
 * @returns {Promise<void>}
 */
async function notifyAttendanceReminder(deploymentId, studentId, sessionDate) {
  try {
    await supabase.rpc('notify_attendance_reminder', {
      target_deployment_id: deploymentId,
      target_student_id: studentId,
      session_date: sessionDate
    });
  } catch (error) {
    console.error('Failed to send attendance reminder:', error);
    // Don't throw error - notification failure shouldn't break main flow
  }
}

/**
 * Sends bulk notifications to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {object} notificationData - Notification data
 * @returns {Promise<number>} Number of notifications created
 */
async function sendBulkNotifications(userIds, notificationData) {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      notification_type: notificationData.notification_type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'normal',
      related_deployment_id: notificationData.related_deployment_id || null,
      action_url: notificationData.action_url || null,
      action_label: notificationData.action_label || null
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      throw new Error('Failed to send bulk notifications: ' + error.message);
    }

    return data?.length || 0;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

/**
 * Cleans up old read notifications (older than 30 days)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications deleted
 */
async function cleanupOldNotifications(userId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select();

    if (error) {
      throw new Error('Failed to cleanup notifications: ' + error.message);
    }

    return data?.length || 0;
  } catch (error) {
    throw new Error('Service error: ' + error.message);
  }
}

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  notifyDeploymentAssignment,
  notifyAttendanceReminder,
  sendBulkNotifications,
  cleanupOldNotifications,
  notifyCoordinators
};