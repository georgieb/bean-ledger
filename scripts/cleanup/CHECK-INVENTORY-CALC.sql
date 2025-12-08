-- Check what the inventory function calculates vs what's in the ledger
-- Use your user_id: 5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a

-- 1. What does the function return?
SELECT
    coffee_id,
    name,
    current_amount,
    initial_amount,
    batch_number,
    roast_date
FROM calculate_roasted_inventory('5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a');

-- 2. What should it be (manual calculation)?
SELECT
    entity_id,
    SUM(amount_change) as calculated_total,
    COUNT(*) as transaction_count,
    array_agg(action_type ORDER BY created_at) as action_types,
    array_agg(amount_change ORDER BY created_at) as amounts
FROM ledger
WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
    AND entity_type = 'roasted_coffee'
    AND entity_id = '8eaf4c54-1ee6-43e9-96d7-694e508321c8'
GROUP BY entity_id;
