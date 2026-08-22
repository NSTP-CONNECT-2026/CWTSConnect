-- ============================================================
-- CREATE TEST DATA FOR DSS MATCHING
-- Run this ONLY if you need test data for DSS matching
-- ============================================================

-- IMPORTANT: Only run this if DIAGNOSE_DSS_MATCHING.sql shows:
-- - No approved community requests, OR
-- - No eligible students

-- ============================================================
-- PART 1: Ensure student has complete profile and CMO compliance
-- ============================================================

-- Check current student status
SELECT 
  u.user_id,
  u.email,
  u.profile_status,
  u.cmo_compliance_status,
  sp.full_name,
  sp.student_number
FROM users u
LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'student';

-- Update existing student to be eligible (if exists)
-- Replace 'student@email.com' with actual student email
UPDATE users
SET 
  profile_status = 'complete',
  cmo_compliance_status = 'compliant',
  account_status = 'active'
WHERE role = 'student'
  AND email = 'ginalennmae.cuaterno@lspu.edu.ph';

-- Verify student profile has required fields
-- If student_profiles is incomplete, you need to complete it via the UI

-- ============================================================
-- PART 2: Create or approve a community request
-- ============================================================

-- Option A: Approve an existing pending request
UPDATE community_requests
SET 
  request_status = 'approved',
  reviewed_by = (SELECT user_id FROM users WHERE role = 'nstp_official' LIMIT 1),
  reviewed_at = NOW(),
  review_notes = 'Approved for testing DSS matching'
WHERE request_status = 'pending'
  AND request_id = (
    SELECT request_id 
    FROM community_requests 
    WHERE request_status = 'pending' 
    LIMIT 1
  );

-- Option B: Create a new test community request (if no requests exist)
-- First, get the community official user_id
DO $$
DECLARE
  v_community_official_id UUID;
  v_nstp_official_id UUID;
BEGIN
  -- Get community official ID
  SELECT user_id INTO v_community_official_id
  FROM users
  WHERE role = 'community_official'
  LIMIT 1;

  -- Get NSTP official ID
  SELECT user_id INTO v_nstp_official_id
  FROM users
  WHERE role = 'nstp_official'
  LIMIT 1;

  -- Only create if we have both officials
  IF v_community_official_id IS NOT NULL AND v_nstp_official_id IS NOT NULL THEN
    -- Insert test request
    INSERT INTO community_requests (
      user_id,
      community_name,
      community_address,
      barangay,
      municipality,
      province,
      activity_title,
      activity_description,
      activity_type,
      preferred_nstp_component,
      students_needed,
      preferred_start_date,
      preferred_end_date,
      preferred_schedule,
      urgency_level,
      needed_skills,
      target_beneficiaries,
      request_status,
      reviewed_by,
      reviewed_at,
      review_notes
    ) VALUES (
      v_community_official_id,
      'Test Community',
      'Test Address, Barangay Test',
      'Test Barangay',
      'Santa Cruz',
      'Laguna',
      'Community Clean-up Drive',
      'A test community service activity for DSS matching demonstration',
      'Clean-up Drive',
      'CWTS',
      10,
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '14 days',
      'Saturdays, 8:00 AM - 12:00 PM',
      'Medium',
      ARRAY['Teamwork', 'Physical Fitness', 'Environmental Awareness'],
      'Local residents and community members',
      'approved',
      v_nstp_official_id,
      NOW(),
      'Approved for testing DSS matching'
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Test community request created and approved';
  ELSE
    RAISE NOTICE 'Cannot create test request: Missing community_official or nstp_official';
  END IF;
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check approved requests
SELECT 
  request_id,
  community_name,
  activity_title,
  request_status,
  students_needed
FROM community_requests
WHERE request_status = 'approved';

-- Check eligible students
SELECT 
  u.user_id,
  u.email,
  sp.full_name,
  sp.nstp_component,
  u.cmo_compliance_status,
  u.profile_status
FROM users u
INNER JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'student'
  AND u.account_status = 'active'
  AND u.profile_status = 'complete'
  AND u.cmo_compliance_status = 'compliant';

-- ============================================================
-- READY TO TEST
-- ============================================================
-- If you see:
-- - At least 1 approved request
-- - At least 1 eligible student
-- Then DSS matching should work!
-- ============================================================
