-- Update green inventory function to include adjustment entries

DROP FUNCTION IF EXISTS calculate_green_inventory(uuid);

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
    WITH green_aggregated AS (
        SELECT 
            l.metadata->>'name' as coffee_name,
            SUM(l.amount_change) as total_amount,
            -- Use the metadata from the most recent entry for display purposes
            (array_agg(l.entity_id ORDER BY l.created_at DESC))[1] as latest_entity_id,
            (array_agg(l.metadata ORDER BY l.created_at DESC))[1] as latest_metadata
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'green_coffee'
            AND l.action_type IN ('green_purchase', 'green_adjustment', 'consumption')
            AND l.metadata->>'name' IS NOT NULL
        GROUP BY l.metadata->>'name'
        HAVING SUM(l.amount_change) > 0
    )
    SELECT 
        ga.latest_entity_id,
        ga.coffee_name,
        ga.total_amount,
        FLOOR(ga.total_amount / 220)::integer, -- Default roast size
        ga.latest_metadata->>'origin',
        ga.latest_metadata->>'processing_method',
        ga.latest_metadata->>'varietal',
        ga.latest_metadata->>'farm',
        CASE 
            WHEN ga.latest_metadata->>'elevation' IS NOT NULL AND ga.latest_metadata->>'elevation' != '' 
            THEN (ga.latest_metadata->>'elevation')::numeric
            ELSE NULL
        END
    FROM green_aggregated ga
    ORDER BY ga.coffee_name;
END;
$$;