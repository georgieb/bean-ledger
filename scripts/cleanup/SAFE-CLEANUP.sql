-- Safe cleanup: Only delete orphaned consumption entries
-- These are consumptions that were logged without a corresponding roast

-- Step 1: Find orphaned consumption entries (no roast_completed for that entity_id)
WITH orphaned_entities AS (
    SELECT DISTINCT l.entity_id
    FROM ledger l
    WHERE l.user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
        AND l.entity_type = 'roasted_coffee'
        AND l.action_type = 'consumption'
        AND NOT EXISTS (
            SELECT 1 FROM ledger l2
            WHERE l2.entity_id = l.entity_id
                AND l2.action_type = 'roast_completed'
        )
)
SELECT
    COUNT(*) as orphaned_entity_count,
    (SELECT COUNT(*) FROM ledger WHERE entity_id IN (SELECT entity_id FROM orphaned_entities)) as entries_to_delete
FROM orphaned_entities;

-- Step 2: DELETE orphaned entries (uncomment to run)
-- DELETE FROM ledger
-- WHERE entity_id IN (
--     SELECT DISTINCT l.entity_id
--     FROM ledger l
--     WHERE l.user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
--         AND l.entity_type = 'roasted_coffee'
--         AND l.action_type = 'consumption'
--         AND NOT EXISTS (
--             SELECT 1 FROM ledger l2
--             WHERE l2.entity_id = l.entity_id
--                 AND l2.action_type = 'roast_completed'
--         )
-- );

-- Step 3: For the Kenya batch (8eaf4c54-1ee6-43e9-96d7-694e508321c8) that's at -90g,
-- you can either delete it or add a positive adjustment to bring it back.
-- To delete just that batch:
-- DELETE FROM ledger WHERE entity_id = '8eaf4c54-1ee6-43e9-96d7-694e508321c8';
