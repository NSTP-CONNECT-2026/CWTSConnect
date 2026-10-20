-- ============================================================
-- NSTPConnect - Loosen activity_type check constraint
-- Run this in your Supabase SQL Editor to allow any custom
-- coordinator Request Type names directly in PostgreSQL.
-- ============================================================

-- 1. Drop check constraint if exists
ALTER TABLE community_requests 
  DROP CONSTRAINT IF EXISTS community_requests_activity_type_check;

-- 2. Expand activity_type column width
ALTER TABLE community_requests 
  ALTER COLUMN activity_type TYPE VARCHAR(255);
