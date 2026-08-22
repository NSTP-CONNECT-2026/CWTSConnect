-- ============================================================
-- NSTPConnect - Reset Test Account Passwords
-- Run this in Supabase SQL Editor
-- ============================================================

-- New password for all accounts: Test123!
-- Fresh bcrypt hash generated: $2a$12$PhRY.71EPOulEycy3y4g8e3rwEzinJ6.RFuuPrWu7Jv7fMRxoRrGG

-- IMPORTANT: This updates the 'users' table, NOT auth.users
-- The system uses custom authentication with the users table

-- Reset NSTP Official password
UPDATE users
SET password_hash = '$2a$12$PhRY.71EPOulEycy3y4g8e3rwEzinJ6.RFuuPrWu7Jv7fMRxoRrGG',
    updated_at = NOW()
WHERE email = 'nstpconnect@gmail.com';

-- Reset Community Official password
UPDATE users
SET password_hash = '$2a$12$PhRY.71EPOulEycy3y4g8e3rwEzinJ6.RFuuPrWu7Jv7fMRxoRrGG',
    updated_at = NOW()
WHERE email = 'communityofficial@gmail.com';

-- Reset Student password
UPDATE users
SET password_hash = '$2a$12$PhRY.71EPOulEycy3y4g8e3rwEzinJ6.RFuuPrWu7Jv7fMRxoRrGG',
    updated_at = NOW()
WHERE email = 'ginalennmae.cuaterno@lspu.edu.ph';

-- Verify the updates
SELECT 
  email,
  role,
  CASE 
    WHEN password_hash = '$2a$12$PhRY.71EPOulEycy3y4g8e3rwEzinJ6.RFuuPrWu7Jv7fMRxoRrGG' 
    THEN '✅ Password Reset to: Test123!'
    ELSE '❌ Password NOT reset'
  END as status,
  account_status,
  profile_status
FROM users
WHERE email IN (
  'nstpconnect@gmail.com',
  'communityofficial@gmail.com',
  'ginalennmae.cuaterno@lspu.edu.ph'
)
ORDER BY role;
