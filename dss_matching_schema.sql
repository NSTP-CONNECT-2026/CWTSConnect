-- ============================================================
-- NSTPConnect - DSS Matching Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: dss_match_results
-- Stores generated DSS matching recommendations
CREATE TABLE IF NOT EXISTS dss_match_results (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES community_requests(request_id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Matching Score Details
  match_score DECIMAL(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_label VARCHAR(50) NOT NULL CHECK (match_label IN (
    'Highly Recommended',
    'Recommended', 
    'Possible Match',
    'Low Match'
  )),
  recommendation_rank INTEGER NOT NULL CHECK (recommendation_rank > 0),
  
  -- Score Breakdown (for transparency)
  location_score DECIMAL(5,2) DEFAULT 0,
  skills_score DECIMAL(5,2) DEFAULT 0,
  component_score DECIMAL(5,2) DEFAULT 0,
  availability_score DECIMAL(5,2) DEFAULT 0,
  
  -- Generation Metadata
  generated_by UUID NOT NULL REFERENCES users(user_id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique ranking per request
  UNIQUE(request_id, recommendation_rank),
  -- Ensure unique student per request
  UNIQUE(request_id, student_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dss_match_results_request_id ON dss_match_results(request_id);
CREATE INDEX IF NOT EXISTS idx_dss_match_results_student_id ON dss_match_results(student_user_id);
CREATE INDEX IF NOT EXISTS idx_dss_match_results_score ON dss_match_results(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_dss_match_results_generated_at ON dss_match_results(generated_at DESC);

-- Auto-update updated_at trigger
CREATE TRIGGER update_dss_match_results_updated_at
  BEFORE UPDATE ON dss_match_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get DSS dashboard summary
CREATE OR REPLACE FUNCTION get_dss_dashboard_summary()
RETURNS TABLE (
  total_eligible_students BIGINT,
  approved_community_requests BIGINT,
  recommended_matches_generated BIGINT,
  students_already_assigned BIGINT,
  pending_deployment_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total eligible students (complete profile + compliant CMO)
    (SELECT COUNT(*) 
     FROM users u 
     JOIN student_profiles sp ON u.user_id = sp.user_id 
     WHERE u.role = 'student' 
     AND u.profile_status = 'complete' 
     AND u.cmo_compliance_status = 'compliant') AS total_eligible_students,
    
    -- Approved community requests
    (SELECT COUNT(*) 
     FROM community_requests 
     WHERE request_status = 'approved') AS approved_community_requests,
    
    -- Recommended matches generated (unique request-student pairs)
    (SELECT COUNT(DISTINCT request_id) 
     FROM dss_match_results) AS recommended_matches_generated,
    
    -- Students already assigned (placeholder - will be updated when deployment module is created)
    0::BIGINT AS students_already_assigned,
    
    -- Pending deployment requests (approved requests without matches)
    (SELECT COUNT(*) 
     FROM community_requests cr
     WHERE cr.request_status = 'approved'
     AND NOT EXISTS (
       SELECT 1 FROM dss_match_results dmr 
       WHERE dmr.request_id = cr.request_id
     )) AS pending_deployment_requests;
END;
$$ LANGUAGE plpgsql;

-- Function to clear existing matches for a request (for regeneration)
CREATE OR REPLACE FUNCTION clear_dss_matches_for_request(target_request_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM dss_match_results 
  WHERE request_id = target_request_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for easy access to student eligibility
CREATE OR REPLACE VIEW eligible_students AS
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
AND u.cmo_compliance_status = 'compliant';

-- View for approved community requests
CREATE OR REPLACE VIEW approved_community_requests AS
SELECT 
  cr.*,
  u.email as community_official_email
FROM community_requests cr
JOIN users u ON cr.user_id = u.user_id
WHERE cr.request_status = 'approved'
ORDER BY cr.urgency_level DESC, cr.created_at ASC;

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dss_match_results' 
ORDER BY ordinal_position;