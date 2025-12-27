-- Standalone script to add temperature_unit column to user_preferences
-- Run this in your Supabase SQL Editor or via psql

-- Check if column already exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_preferences'
        AND column_name = 'temperature_unit'
    ) THEN
        ALTER TABLE user_preferences
        ADD COLUMN temperature_unit text DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit'));

        RAISE NOTICE 'Column temperature_unit added successfully';
    ELSE
        RAISE NOTICE 'Column temperature_unit already exists';
    END IF;
END $$;

-- Update any existing rows to have the default value
UPDATE user_preferences
SET temperature_unit = 'celsius'
WHERE temperature_unit IS NULL;
