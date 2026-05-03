-- ============================================================
-- NSTPConnect - Add Location Coordinates for Map Integration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add latitude and longitude columns for map integration
DO $ 
BEGIN
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'latitude') THEN
        ALTER TABLE student_profiles ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    
    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'longitude') THEN
        ALTER TABLE student_profiles ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
    
END $;

-- Verify the new columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_profiles' 
AND column_name IN ('latitude', 'longitude')
ORDER BY ordinal_position;