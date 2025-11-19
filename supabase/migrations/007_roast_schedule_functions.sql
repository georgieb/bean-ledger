-- Add roast schedule management functions
-- This migration adds database functions to support roast scheduling

-- Function to get roast schedule for a user
CREATE OR REPLACE FUNCTION get_roast_schedule(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    scheduled_date date,
    coffee_name text,
    green_coffee_name text,
    green_weight numeric,
    target_roast_level text,
    equipment_id text,
    completed boolean,
    completed_date timestamptz,
    priority text,
    notes text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_schedule_entries AS (
        SELECT DISTINCT ON (l.entity_id)
            l.entity_id,
            l.metadata,
            l.created_at,
            l.action_type
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'roast_schedule'
            AND l.action_type IN ('roast_scheduled', 'roast_edited')
        ORDER BY l.entity_id, l.created_at DESC
    )
    SELECT 
        lse.entity_id,
        CASE 
            WHEN lse.metadata->>'scheduled_date' IS NOT NULL AND lse.metadata->>'scheduled_date' != '' 
            THEN (lse.metadata->>'scheduled_date')::date
            ELSE NULL
        END,
        lse.metadata->>'coffee_name',
        lse.metadata->>'green_coffee_name',
        CASE 
            WHEN lse.metadata->>'green_weight' IS NOT NULL AND lse.metadata->>'green_weight' != '' 
            THEN (lse.metadata->>'green_weight')::numeric
            ELSE NULL
        END,
        lse.metadata->>'target_roast_level',
        lse.metadata->>'equipment_id',
        CASE 
            WHEN lse.metadata->>'completed' IS NOT NULL AND lse.metadata->>'completed' != '' 
            THEN (lse.metadata->>'completed')::boolean
            ELSE false
        END,
        CASE 
            WHEN lse.metadata->>'completed_date' IS NOT NULL AND lse.metadata->>'completed_date' != '' 
            THEN (lse.metadata->>'completed_date')::timestamptz
            ELSE NULL
        END,
        COALESCE(lse.metadata->>'priority', 'medium'),
        lse.metadata->>'notes',
        lse.created_at
    FROM latest_schedule_entries lse
    WHERE NOT EXISTS (
        SELECT 1 FROM ledger l2 
        WHERE l2.user_id = p_user_id 
            AND l2.entity_id = lse.entity_id 
            AND l2.action_type = 'roast_deleted'
            AND l2.created_at > lse.created_at
    )
    ORDER BY 
        CASE 
            WHEN lse.metadata->>'scheduled_date' IS NOT NULL AND lse.metadata->>'scheduled_date' != '' 
            THEN (lse.metadata->>'scheduled_date')::date
            ELSE '2099-12-31'::date
        END ASC;
END;
$$;

-- Function to get next batch number for a user
CREATE OR REPLACE FUNCTION get_next_batch_number(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_batch integer;
BEGIN
    SELECT COALESCE(MAX((metadata->>'batch_number')::integer), 0) + 1
    INTO next_batch
    FROM ledger
    WHERE user_id = p_user_id
        AND action_type = 'roast_completed'
        AND metadata->>'batch_number' IS NOT NULL
        AND metadata->>'batch_number' != '';
    
    RETURN next_batch;
END;
$$;

-- Function to get upcoming roasts (next 7 days)
CREATE OR REPLACE FUNCTION get_upcoming_roasts(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    scheduled_date date,
    coffee_name text,
    green_coffee_name text,
    green_weight numeric,
    target_roast_level text,
    priority text,
    notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        rs.scheduled_date,
        rs.coffee_name,
        rs.green_coffee_name,
        rs.green_weight,
        rs.target_roast_level,
        rs.priority,
        rs.notes
    FROM get_roast_schedule(p_user_id) rs
    WHERE rs.completed = false
        AND rs.scheduled_date >= CURRENT_DATE
        AND rs.scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY rs.scheduled_date ASC;
END;
$$;

-- Function to get overdue roasts
CREATE OR REPLACE FUNCTION get_overdue_roasts(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    scheduled_date date,
    coffee_name text,
    green_coffee_name text,
    green_weight numeric,
    target_roast_level text,
    priority text,
    days_overdue integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        rs.scheduled_date,
        rs.coffee_name,
        rs.green_coffee_name,
        rs.green_weight,
        rs.target_roast_level,
        rs.priority,
        (CURRENT_DATE - rs.scheduled_date)::integer as days_overdue
    FROM get_roast_schedule(p_user_id) rs
    WHERE rs.completed = false
        AND rs.scheduled_date < CURRENT_DATE
    ORDER BY rs.scheduled_date ASC;
END;
$$;

-- Function to calculate coffee freshness status
CREATE OR REPLACE FUNCTION get_coffee_freshness_status(roast_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 
        CASE
            WHEN roast_date IS NULL THEN 'UNKNOWN'
            WHEN CURRENT_DATE - roast_date <= 6 THEN 'DEGASSING'
            WHEN CURRENT_DATE - roast_date BETWEEN 7 AND 13 THEN 'PEAK'
            WHEN CURRENT_DATE - roast_date BETWEEN 14 AND 21 THEN 'SWEET_SPOT'
            ELSE 'AGING'
        END;
$$;

-- Create index for better performance on schedule queries
CREATE INDEX IF NOT EXISTS idx_ledger_roast_schedule 
ON ledger(user_id, entity_type, action_type, created_at) 
WHERE entity_type = 'roast_schedule';

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_ledger_metadata_gin 
ON ledger USING gin(metadata);

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_roast_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_batch_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_roasts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_roasts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coffee_freshness_status(date) TO authenticated;