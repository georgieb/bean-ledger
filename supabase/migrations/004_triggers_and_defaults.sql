-- Database Triggers and Default Data
-- Automated actions and initial setup

-- Trigger to automatically update user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create default user preferences when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert default equipment for new users
    INSERT INTO equipment (user_id, type, brand, model, settings_schema, is_active)
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
    
    RETURN NEW;
END;
$$;

-- Trigger to create default data for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to validate ledger entry metadata based on action type
CREATE OR REPLACE FUNCTION validate_ledger_metadata()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate required metadata fields based on action_type
    CASE NEW.action_type
        WHEN 'roast_completed' THEN
            IF NOT (NEW.metadata ? 'name' AND 
                   NEW.metadata ? 'roast_date' AND 
                   NEW.metadata ? 'roast_level' AND 
                   NEW.metadata ? 'green_weight' AND
                   NEW.metadata ? 'batch_number') THEN
                RAISE EXCEPTION 'roast_completed requires: name, roast_date, roast_level, green_weight, batch_number';
            END IF;
            
        WHEN 'consumption' THEN
            IF NOT (NEW.metadata ? 'coffee_name') THEN
                RAISE EXCEPTION 'consumption requires: coffee_name';
            END IF;
            
        WHEN 'green_purchase' THEN
            IF NOT (NEW.metadata ? 'name') THEN
                RAISE EXCEPTION 'green_purchase requires: name';
            END IF;
            
        WHEN 'brew_logged' THEN
            IF NOT (NEW.metadata ? 'coffee_name' AND 
                   NEW.metadata ? 'brew_method') THEN
                RAISE EXCEPTION 'brew_logged requires: coffee_name, brew_method';
            END IF;
    END CASE;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_ledger_entry
    BEFORE INSERT ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION validate_ledger_metadata();

-- Function to automatically calculate batch numbers for roasts
CREATE OR REPLACE FUNCTION get_next_batch_number(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_batch_num integer;
BEGIN
    SELECT COALESCE(MAX((metadata->>'batch_number')::integer), 0) + 1
    INTO next_batch_num
    FROM ledger
    WHERE user_id = p_user_id
        AND action_type = 'roast_completed'
        AND entity_type = 'roasted_coffee';
    
    RETURN next_batch_num;
END;
$$;

-- Function to calculate weight loss percentage
CREATE OR REPLACE FUNCTION calculate_weight_loss_percentage(
    green_weight numeric,
    roasted_weight numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ROUND(((green_weight - roasted_weight) / green_weight * 100), 2);
$$;

-- Function to determine coffee freshness status
CREATE OR REPLACE FUNCTION get_coffee_freshness_status(roast_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 
        CASE 
            WHEN roast_date > CURRENT_DATE THEN 'FUTURE'
            WHEN CURRENT_DATE - roast_date <= 3 THEN 'DEGASSING'
            WHEN CURRENT_DATE - roast_date BETWEEN 4 AND 7 THEN 'FRESH'
            WHEN CURRENT_DATE - roast_date BETWEEN 8 AND 14 THEN 'PEAK'
            WHEN CURRENT_DATE - roast_date BETWEEN 15 AND 21 THEN 'GOOD'
            WHEN CURRENT_DATE - roast_date BETWEEN 22 AND 30 THEN 'FADING'
            ELSE 'STALE'
        END;
$$;

-- View for easy access to current coffee inventory with freshness
CREATE OR REPLACE VIEW current_coffee_inventory AS
SELECT 
    ri.*,
    get_coffee_freshness_status(ri.roast_date) as freshness_status,
    calculate_coffee_age_days(ri.roast_date) as age_days,
    CASE 
        WHEN ri.current_amount <= 20 THEN 'LOW'
        WHEN ri.current_amount <= 40 THEN 'MEDIUM'
        ELSE 'HIGH'
    END as stock_level
FROM calculate_roasted_inventory(auth.uid()) ri;

-- Grant permissions for functions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_roasted_inventory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_green_inventory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_brew_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_roast_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_equipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_coffee_age_days(date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_consumption_analytics(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_batch_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_weight_loss_percentage(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coffee_freshness_status(date) TO authenticated;

-- Grant access to the view
GRANT SELECT ON current_coffee_inventory TO authenticated;