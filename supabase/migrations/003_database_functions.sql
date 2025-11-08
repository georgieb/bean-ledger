-- Database Helper Functions
-- Calculate current state from immutable ledger entries

-- Function to calculate current roasted coffee inventory
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
    SELECT 
        l.entity_id,
        l.metadata->>'name',
        SUM(l.amount_change),
        (l.metadata->>'roast_date')::date,
        l.metadata->>'roast_level',
        (l.metadata->>'initial_amount')::numeric,
        (l.metadata->>'green_weight')::numeric,
        (l.metadata->>'weight_loss')::numeric,
        (l.metadata->>'batch_number')::integer,
        l.metadata->'roast_profile',
        l.metadata->>'notes'
    FROM ledger l
    WHERE l.user_id = p_user_id
        AND l.entity_type = 'roasted_coffee'
    GROUP BY l.entity_id, l.metadata
    HAVING SUM(l.amount_change) > 0
    ORDER BY (l.metadata->>'roast_date')::date DESC;
END;
$$;

-- Function to calculate current green coffee inventory
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
    SELECT 
        l.entity_id,
        l.metadata->>'name',
        SUM(l.amount_change),
        FLOOR(SUM(l.amount_change) / 220)::integer, -- Default roast size
        l.metadata->>'origin',
        l.metadata->>'processing_method',
        l.metadata->>'varietal',
        l.metadata->>'farm',
        (l.metadata->>'elevation')::numeric
    FROM ledger l
    WHERE l.user_id = p_user_id
        AND l.entity_type = 'green_coffee'
    GROUP BY l.entity_id, l.metadata
    HAVING SUM(l.amount_change) > 0
    ORDER BY l.metadata->>'name';
END;
$$;

-- Function to get brew history with ratings
CREATE OR REPLACE FUNCTION get_brew_history(
    p_user_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    timestamp timestamptz,
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
        l.timestamp,
        l.metadata->>'coffee_name',
        ABS(l.amount_change), -- Make positive for display
        (l.metadata->>'coffee_age_days')::integer,
        l.metadata->>'grinder_model',
        (l.metadata->>'grind_setting')::numeric,
        l.metadata->>'brew_method',
        (l.metadata->>'water_temp')::numeric,
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
    ORDER BY l.timestamp DESC
    LIMIT p_limit;
END;
$$;

-- Function to get roast schedule
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
        (l.metadata->>'scheduled_date')::date,
        l.metadata->>'coffee_name',
        (l.metadata->>'green_weight')::numeric,
        l.metadata->>'target_roast_level',
        COALESCE((l.metadata->>'completed')::boolean, false),
        CASE 
            WHEN (l.metadata->>'completed')::boolean = true 
            THEN l.timestamp 
            ELSE NULL 
        END,
        l.metadata->>'notes'
    FROM ledger l
    WHERE l.user_id = p_user_id
        AND l.action_type = 'roast_scheduled'
        AND l.entity_type = 'roast_schedule'
    ORDER BY (l.metadata->>'scheduled_date')::date ASC;
END;
$$;

-- Function to get user's equipment
CREATE OR REPLACE FUNCTION get_user_equipment(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    type text,
    brand text,
    model text,
    settings_schema jsonb,
    is_active boolean,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.type,
        e.brand,
        e.model,
        e.settings_schema,
        e.is_active,
        e.created_at
    FROM equipment e
    WHERE e.user_id = p_user_id
        AND e.is_active = true
    ORDER BY e.type, e.brand, e.model;
END;
$$;

-- Function to calculate coffee age in days
CREATE OR REPLACE FUNCTION calculate_coffee_age_days(roast_date date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT EXTRACT(DAY FROM (CURRENT_DATE - roast_date))::integer;
$$;

-- Function to get consumption analytics
CREATE OR REPLACE FUNCTION get_consumption_analytics(
    p_user_id uuid,
    p_days integer DEFAULT 30
)
RETURNS TABLE(
    date date,
    total_consumed numeric,
    brew_count integer,
    avg_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.timestamp::date,
        SUM(ABS(l.amount_change)),
        COUNT(*)::integer,
        AVG(br.rating)
    FROM ledger l
    LEFT JOIN brew_ratings br ON br.ledger_entry_id = l.id
    WHERE l.user_id = p_user_id
        AND l.action_type IN ('consumption', 'brew_logged')
        AND l.timestamp >= (CURRENT_DATE - p_days)
    GROUP BY l.timestamp::date
    ORDER BY l.timestamp::date DESC;
END;
$$;