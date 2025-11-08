-- Fix the new user trigger to handle errors gracefully
-- This addresses the "Database error saving new user" issue

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a new, more robust function to handle new user setup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;