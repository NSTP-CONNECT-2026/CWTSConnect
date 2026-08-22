-- ============================================================
-- NSTPConnect - Deployment Management Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: deployments
-- Stores deployment batch information
CREATE TABLE IF NOT EXISTS deployments (
  deployment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES community_requests(request_id) ON DELETE CASCADE,
  
  -- Deployment Information
  deployment_batch_name VARCHAR(255) NOT NULL,
  deployment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (deployment_status IN (
    'pending',
    'active', 
    'ongoing',
    'completed',
    'cancelled'
  )),
  
  -- Assignment Information
  assigned_by UUID NOT NULL REFERENCES users(user_id),
  deployment_start_date DATE NOT NULL,
  deployment_end_date DATE NOT NULL CHECK (deployment_end_date >= deployment_start_date),
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one active deployment per request
  UNIQUE(request_id, deployment_status) DEFERRABLE INITIALLY DEFERRED
);

-- TABLE: deployment_students
-- Stores individual student assignments to deployments
CREATE TABLE IF NOT EXISTS deployment_students (
  deployment_student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Student Deployment Status
  deployment_student_status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (deployment_student_status IN (
    'assigned',
    'active',
    'completed',
    'removed'
  )),
  
  -- Assignment Metadata
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique student per deployment
  UNIQUE(deployment_id, student_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployments_request_id ON deployments(request_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(deployment_status);
CREATE INDEX IF NOT EXISTS idx_deployments_assigned_by ON deployments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_deployments_start_date ON deployments(deployment_start_date);

CREATE INDEX IF NOT EXISTS idx_deployment_students_deployment_id ON deployment_students(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_students_student_id ON deployment_students(student_user_id);
CREATE INDEX IF NOT EXISTS idx_deployment_students_status ON deployment_students(deployment_student_status);

-- Auto-update updated_at triggers
CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployment_students_updated_at
  BEFORE UPDATE ON deployment_students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get deployment dashboard summary
CREATE OR REPLACE FUNCTION get_deployment_dashboard_summary()
RETURNS TABLE (
  total_deployments BIGINT,
  active_deployments BIGINT,
  completed_deployments BIGINT,
  pending_deployments BIGINT,
  assigned_students BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total deployments
    (SELECT COUNT(*) FROM deployments) AS total_deployments,
    
    -- Active deployments (active + ongoing)
    (SELECT COUNT(*) FROM deployments 
     WHERE deployment_status IN ('active', 'ongoing')) AS active_deployments,
    
    -- Completed deployments
    (SELECT COUNT(*) FROM deployments 
     WHERE deployment_status = 'completed') AS completed_deployments,
    
    -- Pending deployments
    (SELECT COUNT(*) FROM deployments 
     WHERE deployment_status = 'pending') AS pending_deployments,
    
    -- Total assigned students (active assignments)
    (SELECT COUNT(*) FROM deployment_students ds
     JOIN deployments d ON ds.deployment_id = d.deployment_id
     WHERE d.deployment_status IN ('pending', 'active', 'ongoing')
     AND ds.deployment_student_status IN ('assigned', 'active')) AS assigned_students;
END;
$$ LANGUAGE plpgsql;

-- Function to check if student has active deployment
CREATE OR REPLACE FUNCTION student_has_active_deployment(target_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM deployment_students ds
  JOIN deployments d ON ds.deployment_id = d.deployment_id
  WHERE ds.student_user_id = target_student_id
  AND d.deployment_status IN ('pending', 'active', 'ongoing')
  AND ds.deployment_student_status IN ('assigned', 'active');
  
  RETURN active_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get available students for deployment (not already assigned)
CREATE OR REPLACE FUNCTION get_available_students_for_deployment()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  student_number VARCHAR,
  course VARCHAR,
  year_level VARCHAR,
  section VARCHAR,
  nstp_component VARCHAR,
  municipality VARCHAR,
  province VARCHAR,
  barangay VARCHAR,
  skills TEXT[],
  profile_status VARCHAR,
  cmo_compliance_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.user_id,
    u.email,
    sp.full_name,
    sp.student_number,
    sp.course,
    sp.year_level,
    sp.section,
    sp.nstp_component,
    sp.municipality,
    sp.province,
    sp.barangay,
    sp.skills,
    u.profile_status,
    u.cmo_compliance_status
  FROM users u
  JOIN student_profiles sp ON u.user_id = sp.user_id
  WHERE u.role = 'student'
  AND u.profile_status = 'complete'
  AND u.cmo_compliance_status = 'compliant'
  AND NOT student_has_active_deployment(u.user_id)
  ORDER BY sp.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get deployment details with students
CREATE OR REPLACE FUNCTION get_deployment_details(target_deployment_id UUID)
RETURNS TABLE (
  deployment_id UUID,
  request_id UUID,
  deployment_batch_name VARCHAR,
  deployment_status VARCHAR,
  deployment_start_date DATE,
  deployment_end_date DATE,
  assigned_by UUID,
  assigned_by_email VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Community request info
  community_name VARCHAR,
  activity_title VARCHAR,
  activity_type VARCHAR,
  community_address TEXT,
  municipality VARCHAR,
  province VARCHAR,
  preferred_nstp_component VARCHAR,
  students_needed INTEGER,
  -- Student count
  total_assigned_students BIGINT,
  active_students BIGINT,
  completed_students BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.deployment_id,
    d.request_id,
    d.deployment_batch_name,
    d.deployment_status,
    d.deployment_start_date,
    d.deployment_end_date,
    d.assigned_by,
    u.email as assigned_by_email,
    d.notes,
    d.created_at,
    d.updated_at,
    -- Community request info
    cr.community_name,
    cr.activity_title,
    cr.activity_type,
    cr.community_address,
    cr.municipality,
    cr.province,
    cr.preferred_nstp_component,
    cr.students_needed,
    -- Student counts
    (SELECT COUNT(*) FROM deployment_students ds2 WHERE ds2.deployment_id = d.deployment_id) as total_assigned_students,
    (SELECT COUNT(*) FROM deployment_students ds3 WHERE ds3.deployment_id = d.deployment_id AND ds3.deployment_student_status = 'active') as active_students,
    (SELECT COUNT(*) FROM deployment_students ds4 WHERE ds4.deployment_id = d.deployment_id AND ds4.deployment_student_status = 'completed') as completed_students
  FROM deployments d
  JOIN community_requests cr ON d.request_id = cr.request_id
  JOIN users u ON d.assigned_by = u.user_id
  WHERE d.deployment_id = target_deployment_id;
END;
$$ LANGUAGE plpgsql;

-- View for deployment management list
CREATE OR REPLACE VIEW deployment_management_view AS
SELECT 
  d.deployment_id,
  d.request_id,
  d.deployment_batch_name,
  d.deployment_status,
  d.deployment_start_date,
  d.deployment_end_date,
  d.assigned_by,
  u.email as assigned_by_email,
  d.created_at,
  d.updated_at,
  -- Community request info
  cr.community_name,
  cr.activity_title,
  cr.activity_type,
  cr.municipality,
  cr.province,
  cr.preferred_nstp_component,
  cr.students_needed,
  -- Student counts
  (SELECT COUNT(*) FROM deployment_students ds WHERE ds.deployment_id = d.deployment_id) as assigned_students,
  (SELECT COUNT(*) FROM deployment_students ds WHERE ds.deployment_id = d.deployment_id AND ds.deployment_student_status IN ('assigned', 'active')) as active_students
FROM deployments d
JOIN community_requests cr ON d.request_id = cr.request_id
JOIN users u ON d.assigned_by = u.user_id
ORDER BY d.created_at DESC;

-- View for approved requests available for deployment
CREATE OR REPLACE VIEW deployable_requests_view AS
SELECT 
  cr.*,
  u.email as community_official_email,
  COALESCE(d.deployment_status, 'no_deployment') as deployment_status,
  COALESCE(assigned_count.total, 0) as assigned_students
FROM community_requests cr
JOIN users u ON cr.user_id = u.user_id
LEFT JOIN deployments d ON cr.request_id = d.request_id AND d.deployment_status IN ('pending', 'active', 'ongoing')
LEFT JOIN (
  SELECT 
    d2.request_id,
    COUNT(ds.deployment_student_id) as total
  FROM deployments d2
  JOIN deployment_students ds ON d2.deployment_id = ds.deployment_id
  WHERE d2.deployment_status IN ('pending', 'active', 'ongoing')
  AND ds.deployment_student_status IN ('assigned', 'active')
  GROUP BY d2.request_id
) assigned_count ON cr.request_id = assigned_count.request_id
WHERE cr.request_status = 'approved'
ORDER BY cr.urgency_level DESC, cr.created_at ASC;

-- Verify table structures
DO $$
BEGIN
  RAISE NOTICE 'Deployment Management schema created successfully!';
  RAISE NOTICE 'Tables created: deployments, deployment_students';
  RAISE NOTICE 'Views created: deployment_management_view, deployable_requests_view';
  RAISE NOTICE 'Functions created: get_deployment_dashboard_summary, student_has_active_deployment, get_available_students_for_deployment, get_deployment_details';
END $$;