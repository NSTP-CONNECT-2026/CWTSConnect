-- ============================================================
-- NSTPConnect - Add Missing Columns Script
-- Run this if you want to add missing columns without dropping the table
-- ============================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add barangay column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'barangay') THEN
        ALTER TABLE student_profiles ADD COLUMN barangay VARCHAR(255);
    END IF;
    
    -- Add municipality column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'municipality') THEN
        ALTER TABLE student_profiles ADD COLUMN municipality VARCHAR(255);
    END IF;
    
    -- Add province column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'province') THEN
        ALTER TABLE student_profiles ADD COLUMN province VARCHAR(255);
    END IF;
    
    -- Add complete_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'complete_address') THEN
        ALTER TABLE student_profiles ADD COLUMN complete_address TEXT;
    END IF;
    
    -- Add skills column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'skills') THEN
        ALTER TABLE student_profiles ADD COLUMN skills TEXT;
    END IF;
    
    -- Add emergency contact columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE student_profiles ADD COLUMN emergency_contact_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'emergency_contact_number') THEN
        ALTER TABLE student_profiles ADD COLUMN emergency_contact_number VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'emergency_contact_relationship') THEN
        ALTER TABLE student_profiles ADD COLUMN emergency_contact_relationship VARCHAR(100);
    END IF;
    
    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'birthdate') THEN
        ALTER TABLE student_profiles ADD COLUMN birthdate DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'sex') THEN
        ALTER TABLE student_profiles ADD COLUMN sex VARCHAR(10);
    END IF;
    
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_profiles' 
ORDER BY ordinal_position;