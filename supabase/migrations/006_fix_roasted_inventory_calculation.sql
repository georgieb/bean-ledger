-- Fix roasted inventory calculation to properly handle consumption
-- Drop function with cascade to remove dependent view
DROP FUNCTION IF EXISTS calculate_roasted_inventory(uuid) CASCADE;

-- Recreate the function with correct consumption handling
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
    WITH coffee_calculations AS (
        SELECT
            l.entity_id,
            -- Get metadata from the first roast entry (they should all be the same for same entity_id)
            (array_agg(l.metadata ORDER BY l.created_at ASC) FILTER (WHERE l.action_type = 'roast_completed'))[1] as roast_metadata,
            -- Calculate current amount: sum of all amount_changes for this entity_id
            SUM(l.amount_change) as current_amount,
            -- Calculate initial amount: sum of only roast_completed entries
            SUM(CASE WHEN l.action_type = 'roast_completed' THEN l.amount_change ELSE 0 END) as initial_amount
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'roasted_coffee'
            AND l.action_type IN ('roast_completed', 'consumption')
        GROUP BY l.entity_id
        HAVING SUM(l.amount_change) > 0  -- Only show coffees with remaining amount
    )
    SELECT
        cc.entity_id,
        cc.roast_metadata->>'name',
        cc.current_amount,
        CASE
            WHEN cc.roast_metadata->>'roast_date' IS NOT NULL AND cc.roast_metadata->>'roast_date' != ''
            THEN (cc.roast_metadata->>'roast_date')::date
            ELSE NULL
        END,
        cc.roast_metadata->>'roast_level',
        cc.initial_amount,
        CASE
            WHEN cc.roast_metadata->>'green_weight' IS NOT NULL AND cc.roast_metadata->>'green_weight' != ''
            THEN (cc.roast_metadata->>'green_weight')::numeric
            ELSE NULL
        END,
        CASE
            WHEN cc.roast_metadata->>'weight_loss' IS NOT NULL AND cc.roast_metadata->>'weight_loss' != ''
            THEN (cc.roast_metadata->>'weight_loss')::numeric
            ELSE NULL
        END,
        CASE
            WHEN cc.roast_metadata->>'batch_number' IS NOT NULL AND cc.roast_metadata->>'batch_number' != ''
            THEN (cc.roast_metadata->>'batch_number')::integer
            ELSE NULL
        END,
        cc.roast_metadata->'roast_profile',
        cc.roast_metadata->>'notes'
    FROM coffee_calculations cc
    ORDER BY
        CASE
            WHEN cc.roast_metadata->>'roast_date' IS NOT NULL AND cc.roast_metadata->>'roast_date' != ''
            THEN (cc.roast_metadata->>'roast_date')::date
            ELSE '1900-01-01'::date
        END DESC;
END;
$$;

-- Recreate the view that depends on this function
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