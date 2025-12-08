-- Check if positive adjustments are creating new batches or adjusting existing ones

-- Show recent roasted_adjustment entries (both positive and negative)
SELECT
    action_type,
    entity_id,
    amount_change,
    metadata->>'name' as coffee_name,
    metadata->>'adjustment_direction' as direction,
    created_at
FROM ledger
WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
    AND action_type = 'roasted_adjustment'
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any roast_completed entries that look like adjustments
SELECT
    action_type,
    entity_id,
    amount_change,
    metadata->>'name' as coffee_name,
    metadata->>'batch_number' as batch_num,
    metadata->>'adjustment_type' as is_adjustment,
    created_at
FROM ledger
WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
    AND entity_type = 'roasted_coffee'
    AND action_type = 'roast_completed'
ORDER BY created_at DESC
LIMIT 10;
