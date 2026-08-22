-- ============================================================
-- NSTPConnect - System Notifications Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: notifications
-- Stores system notifications for all users
CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Notification Content
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
    'deployment_assigned',
    'deployment_status_changed',
    'attendance_reminder',
    'attendance_verified',
    'hours_verified',
    'make_up_approved',
    'make_up_rejected',
    'requirement_approved',
    'requirement_rejected',
    'request_approved',
    'request_rejected',
    'system_announcement',
    'deadline_reminder',
    'completion_milestone'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Entities (optional references)
  related_deployment_id UUID REFERENCES deployments(deployment_id) ON DELETE SET NULL,
  related_attendance_id UUID REFERENCES attendance_records(attendance_id) ON DELETE SET NULL,
  related_make_up_id UUID REFERENCES make_up_requests(make_up_id) ON DELETE SET NULL,
  related_request_id UUID REFERENCES community_requests(request_id) ON DELETE SET NULL,
  
  -- Notification Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN (
    'low',
    'normal',
    'high',
    'urgent'
  )),
  
  -- Action Link (optional)
  action_url TEXT,
  action_label VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: notification_preferences
-- Stores user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Email Notifications
  email_enabled BOOLEAN DEFAULT TRUE,
  email_deployment_updates BOOLEAN DEFAULT TRUE,
  email_attendance_reminders BOOLEAN DEFAULT TRUE,
  email_requirement_updates BOOLEAN DEFAULT TRUE,
  email_make_up_updates BOOLEAN DEFAULT TRUE,
  email_system_announcements BOOLEAN DEFAULT TRUE,
  
  -- In-App Notifications
  in_app_enabled BOOLEAN DEFAULT TRUE,
  in_app_deployment_updates BOOLEAN DEFAULT TRUE,
  in_app_attendance_reminders BOOLEAN DEFAULT TRUE,
  in_app_requirement_updates BOOLEAN DEFAULT TRUE,
  in_app_make_up_updates BOOLEAN DEFAULT TRUE,
  in_app_system_announcements BOOLEAN DEFAULT TRUE,
  
  -- Notification Frequency
  digest_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (digest_frequency IN (
    'immediate',
    'daily',
    'weekly',
    'disabled'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Auto-update updated_at triggers
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notif_type VARCHAR,
  notif_title VARCHAR,
  notif_message TEXT,
  notif_priority VARCHAR DEFAULT 'normal',
  deployment_id UUID DEFAULT NULL,
  attendance_id UUID DEFAULT NULL,
  make_up_id UUID DEFAULT NULL,
  request_id UUID DEFAULT NULL,
  action_url TEXT DEFAULT NULL,
  action_label VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    notification_type,
    title,
    message,
    priority,
    related_deployment_id,
    related_attendance_id,
    related_make_up_id,
    related_request_id,
    action_url,
    action_label
  ) VALUES (
    target_user_id,
    notif_type,
    notif_title,
    notif_message,
    notif_priority,
    deployment_id,
    attendance_id,
    make_up_id,
    request_id,
    action_url,
    action_label
  )
  RETURNING notification_id INTO new_notification_id;
  
  RETURN new_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(target_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE notification_id = target_notification_id
  AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = target_user_id
  AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = target_user_id
  AND is_read = FALSE;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification preferences for new user
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create notification preferences for new users
CREATE TRIGGER create_notification_prefs_on_user_creation
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Function to send deployment assignment notification
CREATE OR REPLACE FUNCTION notify_deployment_assignment(
  target_deployment_id UUID,
  target_student_id UUID
)
RETURNS VOID AS $$
DECLARE
  deployment_info RECORD;
BEGIN
  -- Get deployment information
  SELECT 
    d.deployment_batch_name,
    cr.community_name,
    cr.activity_title,
    d.deployment_start_date,
    d.deployment_end_date
  INTO deployment_info
  FROM deployments d
  JOIN community_requests cr ON d.request_id = cr.request_id
  WHERE d.deployment_id = target_deployment_id;
  
  -- Create notification
  PERFORM create_notification(
    target_student_id,
    'deployment_assigned',
    'New Deployment Assignment',
    format('You have been assigned to %s - %s. Deployment starts on %s.',
      deployment_info.community_name,
      deployment_info.activity_title,
      deployment_info.deployment_start_date::TEXT
    ),
    'high',
    target_deployment_id,
    NULL,
    NULL,
    NULL,
    '/student/deployment-details.html?id=' || target_deployment_id::TEXT,
    'View Deployment'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to send attendance reminder
CREATE OR REPLACE FUNCTION notify_attendance_reminder(
  target_deployment_id UUID,
  target_student_id UUID,
  session_date DATE
)
RETURNS VOID AS $$
DECLARE
  deployment_info RECORD;
BEGIN
  -- Get deployment information
  SELECT 
    d.deployment_batch_name,
    cr.community_name
  INTO deployment_info
  FROM deployments d
  JOIN community_requests cr ON d.request_id = cr.request_id
  WHERE d.deployment_id = target_deployment_id;
  
  -- Create notification
  PERFORM create_notification(
    target_student_id,
    'attendance_reminder',
    'Attendance Reminder',
    format('Reminder: You have a deployment session at %s on %s. Please check in on time.',
      deployment_info.community_name,
      session_date::TEXT
    ),
    'normal',
    target_deployment_id,
    NULL,
    NULL,
    NULL,
    '/student/attendance.html?deployment=' || target_deployment_id::TEXT,
    'View Attendance'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to send make-up request status notification
CREATE OR REPLACE FUNCTION notify_make_up_status(
  target_make_up_id UUID,
  new_status VARCHAR
)
RETURNS VOID AS $$
DECLARE
  make_up_info RECORD;
  notif_title VARCHAR;
  notif_message TEXT;
  notif_type VARCHAR;
BEGIN
  -- Get make-up request information
  SELECT 
    mr.student_user_id,
    mr.missed_date,
    d.deployment_batch_name,
    cr.community_name
  INTO make_up_info
  FROM make_up_requests mr
  JOIN deployments d ON mr.deployment_id = d.deployment_id
  JOIN community_requests cr ON d.request_id = cr.request_id
  WHERE mr.make_up_id = target_make_up_id;
  
  -- Determine notification content based on status
  IF new_status = 'approved' THEN
    notif_type := 'make_up_approved';
    notif_title := 'Make-up Request Approved';
    notif_message := format('Your make-up request for %s at %s has been approved.',
      make_up_info.missed_date::TEXT,
      make_up_info.community_name
    );
  ELSIF new_status = 'rejected' THEN
    notif_type := 'make_up_rejected';
    notif_title := 'Make-up Request Rejected';
    notif_message := format('Your make-up request for %s at %s has been rejected. Please contact your NSTP coordinator.',
      make_up_info.missed_date::TEXT,
      make_up_info.community_name
    );
  ELSE
    RETURN;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    make_up_info.student_user_id,
    notif_type,
    notif_title,
    notif_message,
    'high',
    NULL,
    NULL,
    target_make_up_id,
    NULL,
    '/student/make-up-requests.html',
    'View Make-up Requests'
  );
END;
$$ LANGUAGE plpgsql;

-- View for notification dashboard
CREATE OR REPLACE VIEW notification_dashboard_view AS
SELECT 
  n.notification_id,
  n.user_id,
  n.notification_type,
  n.title,
  n.message,
  n.priority,
  n.is_read,
  n.read_at,
  n.action_url,
  n.action_label,
  n.created_at,
  -- User info
  u.email,
  u.role,
  -- Related entity info
  d.deployment_batch_name,
  cr.community_name,
  cr.activity_title
FROM notifications n
JOIN users u ON n.user_id = u.user_id
LEFT JOIN deployments d ON n.related_deployment_id = d.deployment_id
LEFT JOIN community_requests cr ON d.request_id = cr.request_id OR n.related_request_id = cr.request_id
ORDER BY n.created_at DESC;

-- Verify table structures
DO $$
BEGIN
  RAISE NOTICE 'Notifications schema created successfully!';
  RAISE NOTICE 'Tables created: notifications, notification_preferences';
  RAISE NOTICE 'Views created: notification_dashboard_view';
  RAISE NOTICE 'Functions created: create_notification, mark_notification_read, mark_all_notifications_read, get_unread_notification_count';
  RAISE NOTICE 'Notification triggers created for deployment, attendance, and make-up updates';
END $$;