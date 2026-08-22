-- ============================================================
-- DIAGNOSE DSS MATCHING ISSUES
-- Run this to check why "Failed to generate matches" error occurs
-- ============================================================

-- Step 1: Check if there are any approved community requests
SELECT 
  'APPROVED REQUESTS' as check_type,
  COUNT(*) as count
FROM community_requests
WHERE request_status = 'approved';

-- Step 2: Show approved requests details
SELECT 
  request_id,
  community_name,
  activity_title,
  activity_type,
  preferred_nstp_component,
  students_needed,
  request_status,
  created_at
FROM community_requests
WHERE request_status = 'approved'
ORDER BY created_at DESC;

-- Step 3: Check if approved_community_requests view exists
SELECT 
  'VIEW EXISTS' as check_type,
  COUNT(*) as count
FROM information_schema.views
WHERE table_name = 'approved_community_requests';

-- Step 4: Check if eligible_students view exists
SELECT 
  'VIEW EXISTS' as check_type,
  COUNT(*) as count
FROM information_schema.views
WHERE table_name = 'eligible_students';

-- Step 5: Check eligible students count
SELECT 
  'ELIGIBLE STUDENTS' as check_type,
  COUNT(*) as count
FROM users u
INNER JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'student'
  AND u.account_status = 'active'
  AND u.profile_status = 'complete'
  AND u.cmo_compliance_status = 'compliant';

-- Step 6: Show eligible students details
SELECT 
  u.user_id,
  u.email,
  sp.full_name,
  sp.student_number,
  sp.course,
  sp.year_level,
  sp.nstp_component,
  sp.municipality,
  sp.province,
  u.cmo_compliance_status,
  u.profile_status
FROM users u
INNER JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'student'
  AND u.account_status = 'active'
  AND u.profile_status = 'complete'
  AND u.cmo_compliance_status = 'compliant'
ORDER BY sp.full_name;

-- Step 7: Check if clear_dss_matches_for_request function exists
SELECT 
  'FUNCTION EXISTS' as check_type,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_name = 'clear_dss_matches_for_request';

-- Step 8: Check if get_dss_dashboard_summary function exists
SELECT 
  'FUNCTION EXISTS' as check_type,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_name = 'get_dss_dashboard_summary';

-- Step 9: Check dss_match_results table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'dss_match_results'
ORDER BY ordinal_position;

-- Step 10: Check existing match results
SELECT 
  'EXISTING MATCHES' as check_type,
  COUNT(*) as count
FROM dss_match_results;

-- ============================================================
-- INTERPRETATION:
-- ============================================================
-- If APPROVED REQUESTS count = 0:
--   → No approved requests to match against
--   → Solution: Approve at least one community request first
--
-- If ELIGIBLE STUDENTS count = 0:
--   → No students meet eligibility criteria
--   → Solution: Ensure students have:
--     1. Complete profile (profile_status = 'complete')
--     2. CMO compliance (cmo_compliance_status = 'compliant')
--     3. Active account (account_status = 'active')
--
-- If VIEW EXISTS count = 0:
--   → Database views are missing
--   → Solution: Run dss_matching_schema.sql
--
-- If FUNCTION EXISTS count = 0:
--   → Database functions are missing
--   → Solution: Run dss_matching_schema.sql
-- ============================================================
