-- Quick check for roasted coffee adjustments
-- This will show recent ledger entries and current inventory

-- Get recent roasted coffee ledger entries
SELECT
    action_type,
    entity_id,
    amount_change,
    metadata->>'name' as coffee_name,
    metadata->>'adjustment_direction' as adjustment_dir,
    created_at
FROM ledger
WHERE user_id = auth.uid()
    AND entity_type = 'roasted_coffee'
ORDER BY created_at DESC
LIMIT 15;

-- Check current inventory calculation
SELECT
    name,
    current_amount,
    batch_number,
    roast_date
FROM calculate_roasted_inventory(auth.uid());
