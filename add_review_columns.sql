-- ============================================================
-- Add Review Columns to community_requests Table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add review_notes column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE community_requests 
    ADD COLUMN review_notes TEXT;
  END IF;
END $$;

-- Add reviewed_by column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE community_requests 
    ADD COLUMN reviewed_by UUID REFERENCES users(user_id);
  END IF;
END $$;

-- Add reviewed_at column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE community_requests 
    ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Migrate existing data from old columns to new columns (if they exist)
DO $$ 
BEGIN
  -- Copy nstp_remarks to review_notes if nstp_remarks exists and has data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'nstp_remarks'
  ) THEN
    UPDATE community_requests 
    SET review_notes = nstp_remarks 
    WHERE nstp_remarks IS NOT NULL AND review_notes IS NULL;
  END IF;

  -- Copy approved_by to reviewed_by if approved_by exists and has data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'approved_by'
  ) THEN
    UPDATE community_requests 
    SET reviewed_by = approved_by 
    WHERE approved_by IS NOT NULL AND reviewed_by IS NULL;
  END IF;

  -- Copy approved_at to reviewed_at if approved_at exists and has data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_requests' 
    AND column_name = 'approved_at'
  ) THEN
    UPDATE community_requests 
    SET reviewed_at = approved_at 
    WHERE approved_at IS NOT NULL AND reviewed_at IS NULL;
  END IF;
END $$;

-- Add index for reviewed_by
CREATE INDEX IF NOT EXISTS idx_community_requests_reviewed_by 
ON community_requests(reviewed_by);

-- Verify the new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_requests' 
AND column_name IN ('review_notes', 'reviewed_by', 'reviewed_at')
ORDER BY column_name;

-- Show sample data
SELECT 
  request_id,
  activity_title,
  request_status,
  review_notes,
  reviewed_by,
  reviewed_at
FROM community_requests
LIMIT 5;
