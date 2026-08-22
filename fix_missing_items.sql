-- ============================================================
-- NSTPConnect - Fix Missing Items
-- Run this in Supabase SQL Editor to fix setup issues
-- ============================================================

-- 1. Check if student_cmo_requirements table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'student_cmo_requirements'
  ) THEN
    RAISE NOTICE '❌ Table student_cmo_requirements is MISSING';
    RAISE NOTICE '➡️  Please run: cmo_requirements_schema.sql';
  ELSE
    RAISE NOTICE '✅ Table student_cmo_requirements exists';
  END IF;
END $$;

-- 2. Check if storage bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'cmo-requirements'
  ) THEN
    RAISE NOTICE '❌ Storage bucket cmo-requirements is MISSING';
    RAISE NOTICE '➡️  Creating bucket now...';
    
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('cmo-requirements', 'cmo-requirements', false)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Storage bucket created';
  ELSE
    RAISE NOTICE '✅ Storage bucket cmo-requirements exists';
  END IF;
END $$;

-- 3. Create storage policies if they don't exist
DO $$
BEGIN
  -- Drop existing policies if any (to avoid conflicts)
  DROP POLICY IF EXISTS "Students can upload own CMO files" ON storage.objects;
  DROP POLICY IF EXISTS "Students can view own CMO files" ON storage.objects;
  DROP POLICY IF EXISTS "NSTP Officials can view all CMO files" ON storage.objects;
  DROP POLICY IF EXISTS "Students can delete own CMO files" ON storage.objects;
  
  RAISE NOTICE '➡️  Creating storage policies...';
END $$;

-- Policy: Students can upload their own files
CREATE POLICY "Students can upload own CMO files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cmo-requirements' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Students can view their own files
CREATE POLICY "Students can view own CMO files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cmo-requirements' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: NSTP Officials can view all files
CREATE POLICY "NSTP Officials can view all CMO files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cmo-requirements'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.user_id = auth.uid() 
    AND users.role = 'nstp_official'
  )
);

-- Policy: Students can delete their own files
CREATE POLICY "Students can delete own CMO files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cmo-requirements' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Verify everything
DO $$
DECLARE
  table_count INTEGER;
  bucket_count INTEGER;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   Verification Results';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  -- Check table
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'student_cmo_requirements';
  
  IF table_count > 0 THEN
    RAISE NOTICE '✅ student_cmo_requirements table: EXISTS';
  ELSE
    RAISE NOTICE '❌ student_cmo_requirements table: MISSING';
  END IF;
  
  -- Check bucket
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets 
  WHERE id = 'cmo-requirements';
  
  IF bucket_count > 0 THEN
    RAISE NOTICE '✅ cmo-requirements bucket: EXISTS';
  ELSE
    RAISE NOTICE '❌ cmo-requirements bucket: MISSING';
  END IF;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%CMO%';
  
  RAISE NOTICE '✅ Storage policies created: %', policy_count;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF table_count = 0 THEN
    RAISE NOTICE '⚠️  ACTION REQUIRED:';
    RAISE NOTICE '   Run cmo_requirements_schema.sql to create the table';
  ELSE
    RAISE NOTICE '🎉 All items verified successfully!';
    RAISE NOTICE '   Run: node test-setup.js to verify complete setup';
  END IF;
  
  RAISE NOTICE '';
END $$;
