-- Check if there are students in the database
SELECT 
  u.user_id,
  u.email,
  u.role,
  u.profile_status,
  u.cmo_compliance_status,
  sp.full_name,
  sp.student_number,
  sp.course,
  sp.year_level,
  sp.section,
  sp.nstp_component,
  sp.municipality
FROM users u
LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'student'
ORDER BY u.created_at DESC
LIMIT 10;

-- Count total students
SELECT COUNT(*) as total_students
FROM users
WHERE role = 'student';

-- Count students with profiles
SELECT COUNT(*) as students_with_profiles
FROM users u
INNER JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'student';

-- Check sample student profile data
SELECT *
FROM student_profiles
LIMIT 5;
