-- ============================================================
-- NSTPConnect - CMO Requirements Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: student_cmo_requirements
-- Stores CMO requirement upload records for each student
CREATE TABLE IF NOT EXISTS student_cmo_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  requirement_type VARCHAR(100) NOT NULL CHECK (requirement_type IN (
    'notarized_parent_waiver',
    'validated_student_id', 
    'valid_parent_id',
    'medical_certificate'
  )),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'not_submitted',
    'pending',
    'approved', 
    'rejected'
  )),
  remarks TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one active record per student per requirement type
  UNIQUE(user_id, requirement_type)
);

-- Add CMO compliance status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cmo_compliance_status VARCHAR(50) DEFAULT 'incomplete' 
CHECK (cmo_compliance_status IN ('incomplete', 'pending_review', 'compliant', 'rejected'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cmo_requirements_user_id ON student_cmo_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_cmo_requirements_status ON student_cmo_requirements(status);
CREATE INDEX IF NOT EXISTS idx_cmo_requirements_type ON student_cmo_requirements(requirement_type);

-- Auto-update updated_at trigger
CREATE TRIGGER update_cmo_requirements_updated_at
  BEFORE UPDATE ON student_cmo_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update overall CMO compliance status
CREATE OR REPLACE FUNCTION update_cmo_compliance_status(student_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  total_required INTEGER := 4;
  submitted_count INTEGER;
  pending_count INTEGER;
  approved_count INTEGER;
  rejected_count INTEGER;
  overall_status VARCHAR(50);
BEGIN
  -- Count requirements by status
  SELECT 
    COUNT(*) FILTER (WHERE status != 'not_submitted'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  INTO submitted_count, pending_count, approved_count, rejected_count
  FROM student_cmo_requirements 
  WHERE user_id = student_user_id;
  
  -- Determine overall status
  IF rejected_count > 0 THEN
    overall_status := 'rejected';
  ELSIF approved_count = total_required THEN
    overall_status := 'compliant';
  ELSIF submitted_count = total_required THEN
    overall_status := 'pending_review';
  ELSE
    overall_status := 'incomplete';
  END IF;
  
  -- Update users table
  UPDATE users 
  SET cmo_compliance_status = overall_status 
  WHERE user_id = student_user_id;
  
  RETURN overall_status;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update CMO compliance status when requirements change
CREATE OR REPLACE FUNCTION trigger_update_cmo_compliance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_cmo_compliance_status(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cmo_requirements_status_update
  AFTER INSERT OR UPDATE OR DELETE ON student_cmo_requirements
  FOR EACH ROW EXECUTE FUNCTION trigger_update_cmo_compliance();

-- Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_cmo_requirements' 
ORDER BY ordinal_position;