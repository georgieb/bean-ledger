-- Add temperature_unit preference column
-- This allows users to choose between Celsius and Fahrenheit for temperature displays

ALTER TABLE user_preferences
ADD COLUMN temperature_unit text DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit'));

-- Update existing rows to have the default value
UPDATE user_preferences
SET temperature_unit = 'celsius'
WHERE temperature_unit IS NULL;
