-- ============================================================
-- NSTPConnect - Community Official Role Support
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Update users table role constraint to include community_official
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('student', 'nstp_official', 'community_official'));

-- Verify the constraint update
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_role_check';