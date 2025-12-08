-- Run this query in Supabase SQL Editor to check if adjustments are being saved
-- Replace 'YOUR_USER_ID' with your actual user ID

-- 1. First, get your user ID (if you don't know it)
SELECT id FROM auth.users LIMIT 1;

-- 2. Check all roasted coffee ledger entries for your user
-- Replace the UUID below with your user ID from step 1
SELECT
    id,
    action_type,
    entity_id,
    amount_change,
    metadata->>'name' as coffee_name,
    created_at
FROM ledger
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
    AND entity_type = 'roasted_coffee'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check what the calculate_roasted_inventory function returns
-- Replace the UUID below with your user ID
SELECT * FROM calculate_roasted_inventory('YOUR_USER_ID_HERE');

-- 4. Verify the trigger exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'validate_ledger_entry';
