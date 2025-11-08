-- Fix JSONB Type Casting Issues
-- This migration fixes all jsonb to proper type casting issues in database functions

-- Drop and recreate the view first since it depends on the function
DROP VIEW IF EXISTS current_coffee_inventory;

-- Recreate all functions with proper type casting
-- Function to calculate current roasted coffee inventory (fixed version)
CREATE OR REPLACE FUNCTION calculate_roasted_inventory(p_user_id uuid)
RETURNS TABLE(
    coffee_id uuid,
    name text,
    current_amount numeric,
    roast_date date,
    roast_level text,
    initial_amount numeric,
    green_weight numeric,
    weight_loss numeric,
    batch_number integer,
    roast_profile jsonb,
    notes text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH roast_entries AS (
        SELECT 
            l.entity_id,
            l.metadata,
            SUM(l.amount_change) as total_amount
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'roasted_coffee'
            AND l.action_type = 'roast_completed'
        GROUP BY l.entity_id, l.metadata
        HAVING SUM(l.amount_change) > 0
    )
    SELECT 
        re.entity_id,
        re.metadata->>'name',
        re.total_amount,
        CASE 
            WHEN re.metadata->>'roast_date' IS NOT NULL AND re.metadata->>'roast_date' != '' 
            THEN (re.metadata->>'roast_date')::date
            ELSE NULL
        END,
        re.metadata->>'roast_level',
        CASE 
            WHEN re.metadata->>'initial_amount' IS NOT NULL AND re.metadata->>'initial_amount' != '' 
            THEN (re.metadata->>'initial_amount')::numeric
            ELSE re.total_amount
        END,
        CASE 
            WHEN re.metadata->>'green_weight' IS NOT NULL AND re.metadata->>'green_weight' != '' 
            THEN (re.metadata->>'green_weight')::numeric
            ELSE NULL
        END,
        CASE 
            WHEN re.metadata->>'weight_loss' IS NOT NULL AND re.metadata->>'weight_loss' != '' 
            THEN (re.metadata->>'weight_loss')::numeric
            ELSE NULL
        END,
        CASE 
            WHEN re.metadata->>'batch_number' IS NOT NULL AND re.metadata->>'batch_number' != '' 
            THEN (re.metadata->>'batch_number')::integer
            ELSE NULL
        END,
        re.metadata->'roast_profile',
        re.metadata->>'notes'
    FROM roast_entries re
    ORDER BY 
        CASE 
            WHEN re.metadata->>'roast_date' IS NOT NULL AND re.metadata->>'roast_date' != '' 
            THEN (re.metadata->>'roast_date')::date
            ELSE '1900-01-01'::date
        END DESC;
END;
$$;

-- Function to calculate current green coffee inventory (fixed version)
CREATE OR REPLACE FUNCTION calculate_green_inventory(p_user_id uuid)
RETURNS TABLE(
    coffee_id uuid,
    name text,
    current_amount numeric,
    roasts_available integer,
    origin text,
    processing_method text,
    varietal text,
    farm text,
    elevation numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH green_entries AS (
        SELECT 
            l.entity_id,
            l.metadata,
            SUM(l.amount_change) as total_amount
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'green_coffee'
        GROUP BY l.entity_id, l.metadata
        HAVING SUM(l.amount_change) > 0
    )
    SELECT 
        ge.entity_id,
        ge.metadata->>'name',
        ge.total_amount,
        FLOOR(ge.total_amount / 220)::integer, -- Default roast size
        ge.metadata->>'origin',
        ge.metadata->>'processing_method',
        ge.metadata->>'varietal',
        ge.metadata->>'farm',
        CASE 
            WHEN ge.metadata->>'elevation' IS NOT NULL AND ge.metadata->>'elevation' != '' 
            THEN (ge.metadata->>'elevation')::numeric
            ELSE NULL
        END
    FROM green_entries ge
    ORDER BY ge.metadata->>'name';
END;
$$;

-- Function to get brew history with ratings (fixed version)
CREATE OR REPLACE FUNCTION get_brew_history(
    p_user_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    "timestamp" timestamptz,
    coffee_name text,
    amount numeric,
    coffee_age_days integer,
    grinder_model text,
    grind_setting numeric,
    brew_method text,
    water_temp numeric,
    brew_time text,
    notes text,
    rating numeric,
    extraction_quality text,
    taste_notes text,
    would_repeat boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l."timestamp",
        l.metadata->>'coffee_name',
        ABS(l.amount_change), -- Make positive for display
        CASE 
            WHEN l.metadata->>'coffee_age_days' IS NOT NULL AND l.metadata->>'coffee_age_days' != '' 
            THEN (l.metadata->>'coffee_age_days')::integer
            ELSE NULL
        END,
        l.metadata->>'grinder_model',
        CASE 
            WHEN l.metadata->>'grind_setting' IS NOT NULL AND l.metadata->>'grind_setting' != '' 
            THEN (l.metadata->>'grind_setting')::numeric
            ELSE NULL
        END,
        l.metadata->>'brew_method',
        CASE 
            WHEN l.metadata->>'water_temp' IS NOT NULL AND l.metadata->>'water_temp' != '' 
            THEN (l.metadata->>'water_temp')::numeric
            ELSE NULL
        END,
        l.metadata->>'brew_time',
        l.metadata->>'notes',
        br.rating,
        br.extraction_quality,
        br.taste_notes,
        br.would_repeat
    FROM ledger l
    LEFT JOIN brew_ratings br ON br.ledger_entry_id = l.id
    WHERE l.user_id = p_user_id
        AND l.action_type IN ('consumption', 'brew_logged')
    ORDER BY l."timestamp" DESC
    LIMIT p_limit;
END;
$$;

-- Function to get roast schedule (fixed version)
CREATE OR REPLACE FUNCTION get_roast_schedule(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    scheduled_date date,
    coffee_name text,
    green_weight numeric,
    target_roast_level text,
    completed boolean,
    completed_date timestamptz,
    notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.entity_id,
        CASE 
            WHEN l.metadata->>'scheduled_date' IS NOT NULL AND l.metadata->>'scheduled_date' != '' 
            THEN (l.metadata->>'scheduled_date')::date
            ELSE NULL
        END,
        l.metadata->>'coffee_name',
        CASE 
            WHEN l.metadata->>'green_weight' IS NOT NULL AND l.metadata->>'green_weight' != '' 
            THEN (l.metadata->>'green_weight')::numeric
            ELSE NULL
        END,
        l.metadata->>'target_roast_level',
        CASE 
            WHEN l.metadata->>'completed' IS NOT NULL AND l.metadata->>'completed' != '' 
            THEN (l.metadata->>'completed')::boolean
            ELSE false
        END,
        CASE 
            WHEN l.metadata->>'completed' IS NOT NULL 
                AND l.metadata->>'completed' != '' 
                AND (l.metadata->>'completed')::boolean = true 
            THEN l."timestamp" 
            ELSE NULL 
        END,
        l.metadata->>'notes'
    FROM ledger l
    WHERE l.user_id = p_user_id
        AND l.action_type = 'roast_scheduled'
        AND l.entity_type = 'roast_schedule'
    ORDER BY 
        CASE 
            WHEN l.metadata->>'scheduled_date' IS NOT NULL AND l.metadata->>'scheduled_date' != '' 
            THEN (l.metadata->>'scheduled_date')::date
            ELSE '2099-12-31'::date
        END ASC;
END;
$$;

-- Fix the calculate_coffee_age_days function
CREATE OR REPLACE FUNCTION calculate_coffee_age_days(roast_date date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (CURRENT_DATE - roast_date)::integer;
$$;

-- Recreate the view with proper null handling
CREATE OR REPLACE VIEW current_coffee_inventory AS
SELECT 
    ri.*,
    CASE 
        WHEN ri.roast_date IS NOT NULL 
        THEN get_coffee_freshness_status(ri.roast_date)
        ELSE 'UNKNOWN'
    END as freshness_status,
    CASE 
        WHEN ri.roast_date IS NOT NULL 
        THEN calculate_coffee_age_days(ri.roast_date)
        ELSE NULL
    END as age_days,
    CASE 
        WHEN ri.current_amount <= 20 THEN 'LOW'
        WHEN ri.current_amount <= 40 THEN 'MEDIUM'
        ELSE 'HIGH'
    END as stock_level
FROM calculate_roasted_inventory(auth.uid()) ri;