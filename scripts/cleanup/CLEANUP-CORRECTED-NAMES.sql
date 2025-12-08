-- Clean up "(Corrected XXXXXXXXXX)" suffixes from green coffee names in the database

-- Step 1: Preview what will be changed
SELECT
    id,
    metadata->>'name' as old_name,
    regexp_replace(metadata->>'name', ' \(Corrected \d+\)$', '') as new_name,
    created_at
FROM ledger
WHERE entity_type = 'green_coffee'
    AND metadata->>'name' ~ ' \(Corrected \d+\)$'
ORDER BY created_at DESC
LIMIT 20;

-- Step 2: Update the names (uncomment to run)
UPDATE ledger
SET metadata = jsonb_set(
    metadata,
    '{name}',
    to_jsonb(regexp_replace(metadata->>'name', ' \(Corrected \d+\)$', ''))
)
WHERE entity_type = 'green_coffee'
    AND metadata->>'name' ~ ' \(Corrected \d+\)$';

-- Step 3: Verify the changes
SELECT DISTINCT
    metadata->>'name' as coffee_name
FROM ledger
WHERE entity_type = 'green_coffee'
ORDER BY metadata->>'name';
