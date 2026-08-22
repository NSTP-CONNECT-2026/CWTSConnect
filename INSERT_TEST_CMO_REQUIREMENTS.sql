-- ============================================================
-- Insert Test CMO Requirements for Ginalenn Mae Cuaterno
-- ============================================================

-- First, check if the table exists and has the correct structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_cmo_requirements' 
ORDER BY ordinal_position;

-- Insert test CMO requirements for Ginalenn Mae (user_id: d6e299ed-1547-4ab7-81cd-22c80040e99d)
-- Note: Using placeholder URLs - replace with actual Supabase storage URLs if needed

-- 1. Notarized Parent Waiver
INSERT INTO student_cmo_requirements (
  user_id,
  requirement_type,
  file_name,
  file_path,
  file_url,
  file_type,
  file_size,
  status,
  remarks,
  uploaded_at,
  reviewed_at,
  reviewed_by
) VALUES (
  'd6e299ed-1547-4ab7-81cd-22c80040e99d',
  'notarized_parent_waiver',
  'parent_waiver_cuaterno.pdf',
  'cmo_requirements/d6e299ed-1547-4ab7-81cd-22c80040e99d/parent_waiver_cuaterno.pdf',
  'https://via.placeholder.com/800x1000/2563EB/FFFFFF?text=Parent+Waiver',
  'application/pdf',
  245678,
  'approved',
  'Document is complete and properly notarized.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days',
  NULL
) ON CONFLICT (user_id, requirement_type) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  file_url = EXCLUDED.file_url,
  status = EXCLUDED.status,
  remarks = EXCLUDED.remarks;

-- 2. Validated Student ID
INSERT INTO student_cmo_requirements (
  user_id,
  requirement_type,
  file_name,
  file_path,
  file_url,
  file_type,
  file_size,
  status,
  remarks,
  uploaded_at,
  reviewed_at,
  reviewed_by
) VALUES (
  'd6e299ed-1547-4ab7-81cd-22c80040e99d',
  'validated_student_id',
  'student_id_cuaterno.jpg',
  'cmo_requirements/d6e299ed-1547-4ab7-81cd-22c80040e99d/student_id_cuaterno.jpg',
  'https://via.placeholder.com/600x400/2563EB/FFFFFF?text=Student+ID+0223-1847',
  'image/jpeg',
  156789,
  'approved',
  'Student ID is valid and clearly visible.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days',
  NULL
) ON CONFLICT (user_id, requirement_type) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  file_url = EXCLUDED.file_url,
  status = EXCLUDED.status,
  remarks = EXCLUDED.remarks;

-- 3. Valid Parent ID
INSERT INTO student_cmo_requirements (
  user_id,
  requirement_type,
  file_name,
  file_path,
  file_url,
  file_type,
  file_size,
  status,
  remarks,
  uploaded_at,
  reviewed_at,
  reviewed_by
) VALUES (
  'd6e299ed-1547-4ab7-81cd-22c80040e99d',
  'valid_parent_id',
  'parent_id_cuaterno.jpg',
  'cmo_requirements/d6e299ed-1547-4ab7-81cd-22c80040e99d/parent_id_cuaterno.jpg',
  'https://via.placeholder.com/600x400/2563EB/FFFFFF?text=Parent+Valid+ID',
  'image/jpeg',
  178234,
  'approved',
  'Parent ID is valid and not expired.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days',
  NULL
) ON CONFLICT (user_id, requirement_type) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  file_url = EXCLUDED.file_url,
  status = EXCLUDED.status,
  remarks = EXCLUDED.remarks;

-- 4. Medical Certificate
INSERT INTO student_cmo_requirements (
  user_id,
  requirement_type,
  file_name,
  file_path,
  file_url,
  file_type,
  file_size,
  status,
  remarks,
  uploaded_at,
  reviewed_at,
  reviewed_by
) VALUES (
  'd6e299ed-1547-4ab7-81cd-22c80040e99d',
  'medical_certificate',
  'medical_cert_cuaterno.pdf',
  'cmo_requirements/d6e299ed-1547-4ab7-81cd-22c80040e99d/medical_cert_cuaterno.pdf',
  'https://via.placeholder.com/800x1000/2563EB/FFFFFF?text=Medical+Certificate',
  'application/pdf',
  298456,
  'approved',
  'Medical certificate is complete and signed by a licensed physician.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days',
  NULL
) ON CONFLICT (user_id, requirement_type) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  file_url = EXCLUDED.file_url,
  status = EXCLUDED.status,
  remarks = EXCLUDED.remarks;

-- Update CMO compliance status to 'compliant' since all requirements are approved
UPDATE users 
SET cmo_compliance_status = 'compliant'
WHERE user_id = 'd6e299ed-1547-4ab7-81cd-22c80040e99d';

-- Verify the inserted data
SELECT 
  requirement_type,
  file_name,
  status,
  remarks,
  uploaded_at
FROM student_cmo_requirements
WHERE user_id = 'd6e299ed-1547-4ab7-81cd-22c80040e99d'
ORDER BY requirement_type;

-- Verify user's CMO compliance status
SELECT 
  email,
  cmo_compliance_status
FROM users
WHERE user_id = 'd6e299ed-1547-4ab7-81cd-22c80040e99d';
