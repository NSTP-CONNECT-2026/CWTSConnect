-- Debug login issues
-- Run this to check user data

-- Check if users exist and their current password hashes
SELECT 
  user_id,
  email,
  role,
  account_status,
  profile_status,
  LEFT(password_hash, 20) || '...' as password_hash_preview,
  LENGTH(password_hash) as hash_length
FROM users
WHERE email IN (
  'nstpconnect@gmail.com',
  'communityofficial@gmail.com',
  'ginalennmae.cuaterno@lspu.edu.ph'
)
ORDER BY role;

-- Check for email case sensitivity issues
SELECT 
  email,
  LOWER(email) as lowercase_email,
  role
FROM users
WHERE LOWER(email) IN (
  'nstpconnect@gmail.com',
  'communityofficial@gmail.com',
  'ginalennmae.cuaterno@lspu.edu.ph'
);
