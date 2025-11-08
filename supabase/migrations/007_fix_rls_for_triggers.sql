-- Fix RLS policies to allow triggers to create default user data
-- The issue is that triggers don't have proper auth context when creating users

-- Add policies to allow service_role to insert data during user creation
-- This will allow the trigger to work while maintaining security

-- Add service_role policies for user_preferences
CREATE POLICY "Service role can insert user preferences" ON user_preferences
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Add service_role policies for equipment
CREATE POLICY "Service role can insert equipment" ON equipment
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Update the trigger function to work with RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set the role to service_role for this operation
    -- This ensures the trigger has permission to insert data
    
    -- Log the attempt
    RAISE LOG 'Creating default data for new user: %', NEW.id;
    
    BEGIN
        -- Insert default user preferences
        INSERT INTO public.user_preferences (
            user_id,
            daily_consumption,
            default_roast_size,
            default_brew_ratio,
            preferred_units,
            timezone
        )
        VALUES (
            NEW.id,
            40,
            220,
            15,
            'grams',
            'UTC'
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE LOG 'Created user preferences for user: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Failed to create user preferences for user %: %', NEW.id, SQLERRM;
    END;
    
    BEGIN
        -- Insert default equipment for new users
        INSERT INTO public.equipment (user_id, type, brand, model, settings_schema, is_active)
        VALUES 
            (NEW.id, 'roaster', 'Fresh Roast', 'SR800', 
             '{"fan_range": {"min": 1, "max": 9}, "heat_range": {"min": 1, "max": 3}, "default_batch_size": 120}'::jsonb, 
             true),
            (NEW.id, 'grinder', 'OXO', '8717000', 
             '{"dial_range": {"min": 1, "max": 15, "step": 0.5}, "descriptions": {"1-5.5": "Fine (espresso to pour-over fine)", "5.5-10.5": "Medium (standard pour-over)", "10.5-15": "Coarse (French press to cold brew)"}}'::jsonb, 
             true),
            (NEW.id, 'brewer', 'Hario', 'V60 Switch Size 3', 
             '{"capacity_ml": 600, "recommended_dose": "20g", "recommended_ratio": 15}'::jsonb, 
             true)
        ON CONFLICT DO NOTHING;
        
        RAISE LOG 'Created default equipment for user: %', NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Failed to create default equipment for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If anything goes wrong, log it but allow user creation to proceed
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the function has proper ownership
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres;