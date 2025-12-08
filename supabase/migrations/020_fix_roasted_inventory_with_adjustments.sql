-- Fix roasted inventory calculation to include adjustments
-- This fixes the issue where increasing roasted coffee inventory creates duplicate entries

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
        -- Get initial roast entries with metadata
        SELECT
            l.entity_id,
            l.metadata,
            MAX(l.created_at) as roast_date_created
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'roasted_coffee'
            AND l.action_type = 'roast_completed'
        GROUP BY l.entity_id, l.metadata
    ),
    inventory_amounts AS (
        -- Sum all transactions for each roasted coffee (roast_completed, consumption, adjustments)
        SELECT
            l.entity_id,
            SUM(l.amount_change) as total_amount
        FROM ledger l
        WHERE l.user_id = p_user_id
            AND l.entity_type = 'roasted_coffee'
            AND l.action_type IN ('roast_completed', 'consumption', 'roasted_adjustment')
        GROUP BY l.entity_id
        HAVING SUM(l.amount_change) > 0
    )
    SELECT
        re.entity_id,
        re.metadata->>'name',
        COALESCE(ia.total_amount, 0),
        CASE
            WHEN re.metadata->>'roast_date' IS NOT NULL AND re.metadata->>'roast_date' != ''
            THEN (re.metadata->>'roast_date')::date
            ELSE NULL
        END,
        re.metadata->>'roast_level',
        CASE
            WHEN re.metadata->>'roasted_weight' IS NOT NULL AND re.metadata->>'roasted_weight' != ''
            THEN (re.metadata->>'roasted_weight')::numeric
            ELSE COALESCE(ia.total_amount, 0)
        END,
        CASE
            WHEN re.metadata->>'green_weight' IS NOT NULL AND re.metadata->>'green_weight' != ''
            THEN (re.metadata->>'green_weight')::numeric
            ELSE NULL
        END,
        CASE
            WHEN re.metadata->>'weight_loss_pct' IS NOT NULL AND re.metadata->>'weight_loss_pct' != ''
            THEN (re.metadata->>'weight_loss_pct')::numeric
            ELSE NULL
        END,
        CASE
            WHEN re.metadata->>'batch_number' IS NOT NULL AND re.metadata->>'batch_number' != ''
            THEN (re.metadata->>'batch_number')::integer
            ELSE NULL
        END,
        CASE
            WHEN re.metadata->>'roast_profile' IS NOT NULL
            THEN (re.metadata->'roast_profile')::jsonb
            ELSE NULL
        END,
        re.metadata->>'roast_notes'
    FROM roast_entries re
    INNER JOIN inventory_amounts ia ON re.entity_id = ia.entity_id
    ORDER BY re.roast_date_created DESC;
END;
$$;