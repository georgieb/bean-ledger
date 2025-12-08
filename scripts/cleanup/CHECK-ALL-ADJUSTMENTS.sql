-- Check ALL roasted coffee entries (not filtered by user)
-- This will show if adjustments are being saved at all

-- Get recent roasted coffee ledger entries for ALL users
SELECT
    user_id,
    action_type,
    entity_id,
    amount_change,
    metadata->>'name' as coffee_name,
    metadata->>'adjustment_direction' as adjustment_dir,
    created_at
FROM ledger
WHERE entity_type = 'roasted_coffee'
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are ANY roasted_adjustment entries
SELECT COUNT(*) as adjustment_count
FROM ledger
WHERE action_type = 'roasted_adjustment';

-- Show the most recent adjustment if it exists
SELECT
    user_id,
    action_type,
    entity_id,
    amount_change,
    metadata,
    created_at
FROM ledger
WHERE action_type = 'roasted_adjustment'
ORDER BY created_at DESC
LIMIT 5;
