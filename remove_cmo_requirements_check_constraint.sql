-- ============================================================
-- NSTPConnect - Allow Dynamic CMO Requirement Types
-- Run this in your Supabase SQL Editor if you add custom requirement types
-- ============================================================

-- 1. Drop restrictive check constraint on requirement_type
ALTER TABLE student_cmo_requirements 
  DROP CONSTRAINT IF EXISTS student_cmo_requirements_requirement_type_check;

-- 2. Ensure requirement_type has an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cmo_requirements_type_dyn 
  ON student_cmo_requirements(requirement_type);
