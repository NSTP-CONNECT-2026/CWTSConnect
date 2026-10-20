-- ============================================================
-- FIX: Update Attendance & Hours Functions in PostgreSQL
-- 1. Fix auto_calculate_attendance_hours trigger to allow custom edited hours
-- 2. Fix update_rendered_hours_summary_for_student date difference calculation
-- ============================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select project 'bzlsthobeomeytbukolo'
-- 3. Go to SQL Editor (left navigation bar)
-- 4. Copy and paste this entire script
-- 5. Click "Run"
-- ============================================================

-- Part 1: Allow custom edited rendered hours without trigger overwriting
CREATE OR REPLACE FUNCTION auto_calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-calculate if hours_rendered was not manually set
  IF NEW.hours_rendered IS NULL AND NEW.check_out_time IS NOT NULL AND NEW.check_in_time IS NOT NULL THEN
    NEW.hours_rendered := calculate_rendered_hours(NEW.check_in_time, NEW.check_out_time);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Part 2: Fix update_rendered_hours_summary_for_student
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
  -- Note: In PostgreSQL, (date - date + 1) is already an integer day count.
  SELECT 
    (deployment_end_date - deployment_start_date + 1) * 8
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
