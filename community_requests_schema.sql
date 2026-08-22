-- ============================================================
-- NSTPConnect - Community Requests Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: community_requests
-- Stores community activity requests created by Community Officials
CREATE TABLE IF NOT EXISTS community_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Community Information
  community_name VARCHAR(255) NOT NULL,
  community_address TEXT NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  municipality VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  
  -- Activity Information
  activity_title VARCHAR(255) NOT NULL,
  activity_description TEXT NOT NULL,
  activity_type VARCHAR(100) NOT NULL CHECK (activity_type IN (
    'Clean-up Drive',
    'Tree Planting',
    'Literacy Program',
    'Computer Literacy Training',
    'Feeding Program',
    'Disaster Preparedness',
    'Community Survey',
    'Health Awareness Program',
    'Others'
  )),
  preferred_nstp_component VARCHAR(20) NOT NULL CHECK (preferred_nstp_component IN (
    'CWTS',
    'LTS',
    'Both'
  )),
  students_needed INTEGER NOT NULL CHECK (students_needed > 0),
  preferred_start_date DATE NOT NULL,
  preferred_end_date DATE NOT NULL CHECK (preferred_end_date >= preferred_start_date),
  preferred_schedule VARCHAR(255) NOT NULL,
  urgency_level VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (urgency_level IN (
    'Low',
    'Medium',
    'High'
  )),
  
  -- Deployment Requirements
  needed_skills TEXT[], -- Array of skills
  target_beneficiaries VARCHAR(255) NOT NULL,
  special_instructions TEXT,
  
  -- Request Status and Review
  request_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (request_status IN (
    'pending',
    'approved',
    'rejected',
    'completed',
    'cancelled'
  )),
  nstp_remarks TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(user_id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_requests_user_id ON community_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_community_requests_status ON community_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_community_requests_activity_type ON community_requests(activity_type);
CREATE INDEX IF NOT EXISTS idx_community_requests_created_at ON community_requests(created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_community_requests_updated_at
  BEFORE UPDATE ON community_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get request summary for a Community Official
CREATE OR REPLACE FUNCTION get_community_request_summary(community_official_id UUID)
RETURNS TABLE (
  total_requests BIGINT,
  pending_requests BIGINT,
  approved_requests BIGINT,
  rejected_requests BIGINT,
  completed_activities BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE request_status = 'pending') AS pending_requests,
    COUNT(*) FILTER (WHERE request_status = 'approved') AS approved_requests,
    COUNT(*) FILTER (WHERE request_status = 'rejected') AS rejected_requests,
    COUNT(*) FILTER (WHERE request_status = 'completed') AS completed_activities
  FROM community_requests 
  WHERE user_id = community_official_id;
END;
$$ LANGUAGE plpgsql;

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'community_requests' 
ORDER BY ordinal_position;