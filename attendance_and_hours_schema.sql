-- ============================================================
-- NSTPConnect - Attendance Tracking & Rendered Hours Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: attendance_records
-- Stores student attendance for each deployment session
CREATE TABLE IF NOT EXISTS attendance_records (
  attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Attendance Information
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  attendance_status VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (attendance_status IN (
    'present',
    'absent',
    'late',
    'excused',
    'make_up_pending',
    'make_up_completed'
  )),
  
  -- Hours Calculation
  hours_rendered DECIMAL(5,2) DEFAULT 0 CHECK (hours_rendered >= 0),
  
  -- Verification
  verified_by UUID REFERENCES users(user_id),
  verified_at TIMESTAMPTZ,
  
  -- Notes and Remarks
  student_remarks TEXT,
  nstp_remarks TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one attendance record per student per deployment per date
  UNIQUE(deployment_id, student_user_id, attendance_date)
);

-- TABLE: rendered_hours_summary
-- Stores cumulative rendered hours per student per deployment
CREATE TABLE IF NOT EXISTS rendered_hours_summary (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Hours Summary
  total_hours_required DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_hours_rendered DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_hours_verified DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_hours_pending DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Attendance Summary
  total_sessions INTEGER NOT NULL DEFAULT 0,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  excused_count INTEGER NOT NULL DEFAULT 0,
  make_up_count INTEGER NOT NULL DEFAULT 0,
  
  -- Completion Status
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  completion_status VARCHAR(20) DEFAULT 'in_progress' CHECK (completion_status IN (
    'in_progress',
    'completed',
    'incomplete',
    'pending_verification'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one summary per student per deployment
  UNIQUE(deployment_id, student_user_id)
);

-- TABLE: make_up_requests
-- Stores make-up session requests for missed attendance
CREATE TABLE IF NOT EXISTS make_up_requests (
  make_up_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance_records(attendance_id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  deployment_id UUID NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
  
  -- Make-up Request Information
  missed_date DATE NOT NULL,
  reason TEXT NOT NULL,
  proposed_make_up_date DATE,
  proposed_make_up_time TIME,
  
  -- Request Status
  request_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (request_status IN (
    'pending',
    'approved',
    'rejected',
    'completed',
    'cancelled'
  )),
  
  -- Approval Information
  reviewed_by UUID REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ,
  nstp_remarks TEXT,
  
  -- Make-up Session Details
  actual_make_up_date DATE,
  actual_make_up_time TIME,
  hours_rendered DECIMAL(5,2) DEFAULT 0,
  completion_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_deployment ON attendance_records(deployment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(attendance_status);

CREATE INDEX IF NOT EXISTS idx_hours_summary_deployment ON rendered_hours_summary(deployment_id);
CREATE INDEX IF NOT EXISTS idx_hours_summary_student ON rendered_hours_summary(student_user_id);
CREATE INDEX IF NOT EXISTS idx_hours_summary_status ON rendered_hours_summary(completion_status);

CREATE INDEX IF NOT EXISTS idx_make_up_student ON make_up_requests(student_user_id);
CREATE INDEX IF NOT EXISTS idx_make_up_deployment ON make_up_requests(deployment_id);
CREATE INDEX IF NOT EXISTS idx_make_up_status ON make_up_requests(request_status);

-- Auto-update updated_at triggers
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rendered_hours_summary_updated_at
  BEFORE UPDATE ON rendered_hours_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_make_up_requests_updated_at
  BEFORE UPDATE ON make_up_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate hours between check-in and check-out
CREATE OR REPLACE FUNCTION calculate_rendered_hours(
  check_in TIME,
  check_out TIME
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  hours_diff DECIMAL(5,2);
BEGIN
  IF check_in IS NULL OR check_out IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate difference in hours
  hours_diff := EXTRACT(EPOCH FROM (check_out - check_in)) / 3600;
  
  -- Ensure non-negative
  IF hours_diff < 0 THEN
    hours_diff := 0;
  END IF;
  
  RETURN ROUND(hours_diff, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate hours when check-out is recorded
CREATE OR REPLACE FUNCTION auto_calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL AND NEW.check_in_time IS NOT NULL THEN
    NEW.hours_rendered := calculate_rendered_hours(NEW.check_in_time, NEW.check_out_time);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hours_on_attendance
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION auto_calculate_attendance_hours();

-- Function to update rendered hours summary
CREATE OR REPLACE FUNCTION update_rendered_hours_summary_for_student(
  target_deployment_id UUID,
  target_student_id UUID
)
RETURNS VOID AS $$
DECLARE
  summary_record RECORD;
  total_rendered DECIMAL(5,2);
  total_verified DECIMAL(5,2);
  total_pending DECIMAL(5,2);
  present_cnt INTEGER;
  absent_cnt INTEGER;
  late_cnt INTEGER;
  excused_cnt INTEGER;
  makeup_cnt INTEGER;
  total_sessions_cnt INTEGER;
  completion_pct DECIMAL(5,2);
  required_hours DECIMAL(5,2);
BEGIN
  -- Get deployment required hours (assuming 8 hours per day for deployment duration)
  SELECT 
    EXTRACT(DAY FROM (deployment_end_date - deployment_start_date + 1)) * 8
  INTO required_hours
  FROM deployments
  WHERE deployment_id = target_deployment_id;
  
  -- Calculate totals from attendance records
  SELECT 
    COALESCE(SUM(hours_rendered), 0),
    COALESCE(SUM(CASE WHEN verified_at IS NOT NULL THEN hours_rendered ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN verified_at IS NULL THEN hours_rendered ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE attendance_status = 'present'),
    COUNT(*) FILTER (WHERE attendance_status = 'absent'),
    COUNT(*) FILTER (WHERE attendance_status = 'late'),
    COUNT(*) FILTER (WHERE attendance_status = 'excused'),
    COUNT(*) FILTER (WHERE attendance_status IN ('make_up_pending', 'make_up_completed')),
    COUNT(*)
  INTO 
    total_rendered,
    total_verified,
    total_pending,
    present_cnt,
    absent_cnt,
    late_cnt,
    excused_cnt,
    makeup_cnt,
    total_sessions_cnt
  FROM attendance_records
  WHERE deployment_id = target_deployment_id
  AND student_user_id = target_student_id;
  
  -- Calculate completion percentage
  IF required_hours > 0 THEN
    completion_pct := (total_verified / required_hours) * 100;
  ELSE
    completion_pct := 0;
  END IF;
  
  -- Determine completion status
  DECLARE
    comp_status VARCHAR(20);
  BEGIN
    IF completion_pct >= 100 THEN
      comp_status := 'completed';
    ELSIF total_pending > 0 THEN
      comp_status := 'pending_verification';
    ELSIF completion_pct > 0 THEN
      comp_status := 'in_progress';
    ELSE
      comp_status := 'incomplete';
    END IF;
    
    -- Insert or update summary
    INSERT INTO rendered_hours_summary (
      deployment_id,
      student_user_id,
      total_hours_required,
      total_hours_rendered,
      total_hours_verified,
      total_hours_pending,
      total_sessions,
      present_count,
      absent_count,
      late_count,
      excused_count,
      make_up_count,
      completion_percentage,
      completion_status
    ) VALUES (
      target_deployment_id,
      target_student_id,
      required_hours,
      total_rendered,
      total_verified,
      total_pending,
      total_sessions_cnt,
      present_cnt,
      absent_cnt,
      late_cnt,
      excused_cnt,
      makeup_cnt,
      completion_pct,
      comp_status
    )
    ON CONFLICT (deployment_id, student_user_id)
    DO UPDATE SET
      total_hours_required = required_hours,
      total_hours_rendered = total_rendered,
      total_hours_verified = total_verified,
      total_hours_pending = total_pending,
      total_sessions = total_sessions_cnt,
      present_count = present_cnt,
      absent_count = absent_cnt,
      late_count = late_cnt,
      excused_count = excused_cnt,
      make_up_count = makeup_cnt,
      completion_percentage = completion_pct,
      completion_status = comp_status,
      updated_at = NOW();
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update summary when attendance changes
CREATE OR REPLACE FUNCTION trigger_update_hours_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_rendered_hours_summary_for_student(
    COALESCE(NEW.deployment_id, OLD.deployment_id),
    COALESCE(NEW.student_user_id, OLD.student_user_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_summary_on_attendance_change
  AFTER INSERT OR UPDATE OR DELETE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION trigger_update_hours_summary();

-- Function to get attendance dashboard summary
CREATE OR REPLACE FUNCTION get_attendance_dashboard_summary(target_deployment_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  total_sessions BIGINT,
  total_attendance_records BIGINT,
  average_attendance_rate DECIMAL(5,2),
  total_hours_rendered DECIMAL(5,2),
  total_hours_verified DECIMAL(5,2),
  pending_make_up_requests BIGINT,
  students_completed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total students in deployment
    (SELECT COUNT(DISTINCT student_user_id) 
     FROM deployment_students 
     WHERE deployment_id = target_deployment_id) AS total_students,
    
    -- Total sessions (unique dates with attendance)
    (SELECT COUNT(DISTINCT attendance_date) 
     FROM attendance_records 
     WHERE deployment_id = target_deployment_id) AS total_sessions,
    
    -- Total attendance records
    (SELECT COUNT(*) 
     FROM attendance_records 
     WHERE deployment_id = target_deployment_id) AS total_attendance_records,
    
    -- Average attendance rate
    (SELECT COALESCE(
       (COUNT(*) FILTER (WHERE attendance_status IN ('present', 'late'))::DECIMAL / 
        NULLIF(COUNT(*), 0)) * 100, 0
     )
     FROM attendance_records 
     WHERE deployment_id = target_deployment_id) AS average_attendance_rate,
    
    -- Total hours rendered
    (SELECT COALESCE(SUM(hours_rendered), 0) 
     FROM attendance_records 
     WHERE deployment_id = target_deployment_id) AS total_hours_rendered,
    
    -- Total hours verified
    (SELECT COALESCE(SUM(hours_rendered), 0) 
     FROM attendance_records 
     WHERE deployment_id = target_deployment_id 
     AND verified_at IS NOT NULL) AS total_hours_verified,
    
    -- Pending make-up requests
    (SELECT COUNT(*) 
     FROM make_up_requests 
     WHERE deployment_id = target_deployment_id 
     AND request_status = 'pending') AS pending_make_up_requests,
    
    -- Students who completed hours
    (SELECT COUNT(*) 
     FROM rendered_hours_summary 
     WHERE deployment_id = target_deployment_id 
     AND completion_status = 'completed') AS students_completed;
END;
$$ LANGUAGE plpgsql;

-- View for attendance monitoring
CREATE OR REPLACE VIEW attendance_monitoring_view AS
SELECT 
  ar.attendance_id,
  ar.deployment_id,
  ar.student_user_id,
  ar.attendance_date,
  ar.check_in_time,
  ar.check_out_time,
  ar.attendance_status,
  ar.hours_rendered,
  ar.verified_by,
  ar.verified_at,
  ar.student_remarks,
  ar.nstp_remarks,
  -- Student info
  sp.full_name as student_name,
  sp.student_number,
  sp.course,
  -- Deployment info
  d.deployment_batch_name,
  cr.community_name,
  cr.activity_title,
  -- Verification info
  u.email as verified_by_email
FROM attendance_records ar
JOIN users u_student ON ar.student_user_id = u_student.user_id
JOIN student_profiles sp ON u_student.user_id = sp.user_id
JOIN deployments d ON ar.deployment_id = d.deployment_id
JOIN community_requests cr ON d.request_id = cr.request_id
LEFT JOIN users u ON ar.verified_by = u.user_id
ORDER BY ar.attendance_date DESC, sp.full_name ASC;

-- Verify table structures
DO $$
BEGIN
  RAISE NOTICE 'Attendance and Hours schema created successfully!';
  RAISE NOTICE 'Tables created: attendance_records, rendered_hours_summary, make_up_requests';
  RAISE NOTICE 'Views created: attendance_monitoring_view';
  RAISE NOTICE 'Functions created: calculate_rendered_hours, update_rendered_hours_summary_for_student, get_attendance_dashboard_summary';
END $$;