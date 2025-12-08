-- Clean up negative inventory batches
-- WARNING: This will delete ledger entries. Only run if you're sure!

-- First, let's see what batches are negative
WITH batch_totals AS (
    SELECT
        entity_id,
        SUM(amount_change) as total_amount,
        COUNT(*) as entry_count,
        (array_agg(metadata->'name' ORDER BY created_at))[1]->>'name' as coffee_name
    FROM ledger
    WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
        AND entity_type = 'roasted_coffee'
    GROUP BY entity_id
    HAVING SUM(amount_change) <= 0
)
SELECT * FROM batch_totals;

-- To delete ALL entries for negative batches (DANGEROUS - comment out if not sure):
-- DELETE FROM ledger
-- WHERE entity_id IN (
--     SELECT entity_id FROM (
--         SELECT
--             entity_id,
--             SUM(amount_change) as total_amount
--         FROM ledger
--         WHERE user_id = '5d4e02d1-f64d-4e61-8b5e-1c2537b8f37a'
--             AND entity_type = 'roasted_coffee'
--         GROUP BY entity_id
--         HAVING SUM(amount_change) <= 0
--     ) negative_batches
-- );
