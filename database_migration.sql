-- ============================================================
-- NSTPConnect Database Migration Script
-- Run this in your Supabase SQL Editor to fix missing columns
-- ============================================================

-- First, let's check if the student_profiles table exists and what columns it has
-- You can run this query first to see the current structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_profiles' 
-- ORDER BY ordinal_position;

-- Drop and recreate the student_profiles table to ensure correct schema
DROP TABLE IF EXISTS student_profiles CASCADE;

-- Recreate the student_profiles table with all required columns
CREATE TABLE student_profiles (
  profile_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  full_name       VARCHAR(255),
  student_number  VARCHAR(100) UNIQUE,
  course          VARCHAR(255),
  year_level      VARCHAR(50),
  section         VARCHAR(50),
  nstp_component  VARCHAR(100),
  contact_number  VARCHAR(20),
  birthdate       DATE,
  sex             VARCHAR(10),
  complete_address TEXT,
  barangay        VARCHAR(255),
  municipality    VARCHAR(255),
  province        VARCHAR(255),
  skills          TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_number VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_student_number ON student_profiles(student_number);

-- Recreate the trigger for updated_at
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure (run this to confirm)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_profiles' 
ORDER BY ordinal_position;