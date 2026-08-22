-- ============================================================
-- FIX: Add Missing Review Columns to community_requests
-- ============================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- ============================================================

-- Step 1: Check current columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_requests' 
ORDER BY ordinal_position;

-- Step 2: Add review_notes column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE community_requests 
    ADD COLUMN review_notes TEXT;
    RAISE NOTICE 'Added review_notes column';
  ELSE
    RAISE NOTICE 'review_notes column already exists';
  END IF;
END $$;

-- Step 3: Add reviewed_by column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE community_requests 
    ADD COLUMN reviewed_by UUID REFERENCES users(user_id);
    RAISE NOTICE 'Added reviewed_by column';
  ELSE
    RAISE NOTICE 'reviewed_by column already exists';
  END IF;
END $$;

-- Step 4: Add reviewed_at column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE community_requests 
    ADD COLUMN reviewed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added reviewed_at column';
  ELSE
    RAISE NOTICE 'reviewed_at column already exists';
  END IF;
END $$;

-- Step 5: Migrate data from old columns (if they exist)
DO $$ 
BEGIN
  -- Copy nstp_remarks to review_notes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'nstp_remarks'
  ) THEN
    UPDATE community_requests 
    SET review_notes = nstp_remarks 
    WHERE nstp_remarks IS NOT NULL AND review_notes IS NULL;
    RAISE NOTICE 'Migrated nstp_remarks to review_notes';
  END IF;

  -- Copy approved_by to reviewed_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'approved_by'
  ) THEN
    UPDATE community_requests 
    SET reviewed_by = approved_by 
    WHERE approved_by IS NOT NULL AND reviewed_by IS NULL;
    RAISE NOTICE 'Migrated approved_by to reviewed_by';
  END IF;

  -- Copy approved_at to reviewed_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'approved_at'
  ) THEN
    UPDATE community_requests 
    SET reviewed_at = approved_at 
    WHERE approved_at IS NOT NULL AND reviewed_at IS NULL;
    RAISE NOTICE 'Migrated approved_at to reviewed_at';
  END IF;
END $$;

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS idx_community_requests_reviewed_by 
ON community_requests(reviewed_by);

-- Step 7: Verify the new columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_requests' 
AND column_name IN ('review_notes', 'reviewed_by', 'reviewed_at')
ORDER BY column_name;

-- Step 8: Show current data
SELECT 
  request_id,
  activity_title,
  request_status,
  review_notes,
  reviewed_by,
  reviewed_at,
  created_at
FROM community_requests
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- If you see the columns in Step 7, the migration is complete!
-- You can now test the NSTP Official Community Requests module.
-- ============================================================
