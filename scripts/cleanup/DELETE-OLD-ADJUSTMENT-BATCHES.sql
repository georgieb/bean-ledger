-- Delete old adjustment batches (batch #99999)
-- These were created by the old broken code and should be removed

-- Step 1: Find all batch #99999 entries
SELECT
    entity_id,
    action_type,
    amount_change,
    metadata->>'name' as coffee_name,
    metadata->>'batch_number' as batch_num,
    created_at
FROM ledger
WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
    AND entity_type = 'roasted_coffee'
    AND metadata->>'batch_number' = '99999'
ORDER BY created_at DESC;

-- Step 2: Delete all entries with batch #99999 (uncomment to run)
DELETE FROM ledger
WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
    AND entity_type = 'roasted_coffee'
    AND metadata->>'batch_number' = '99999';

-- Step 3: Verify they're gone
SELECT
    coffee_id,
    name,
    current_amount,
    batch_number,
    roast_date
FROM calculate_roasted_inventory('5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a');
