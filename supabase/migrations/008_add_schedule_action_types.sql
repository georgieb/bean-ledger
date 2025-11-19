-- Add new action types for roast scheduling
-- This migration updates the action_type constraint to include schedule-related actions

-- Drop the existing constraint
ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_action_type_check;

-- Add the new constraint with schedule action types
ALTER TABLE ledger ADD CONSTRAINT ledger_action_type_check 
CHECK (action_type IN (
    'green_purchase',
    'roast_completed', 
    'consumption',
    'brew_logged',
    'inventory_adjustment',
    'roast_scheduled',
    'roast_edited',
    'roast_deleted',
    'equipment_added',
    'equipment_updated'
));

-- Also ensure entity_type includes roast_schedule
ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_entity_type_check;

ALTER TABLE ledger ADD CONSTRAINT ledger_entity_type_check 
CHECK (entity_type IN (
    'green_coffee',
    'roasted_coffee',
    'equipment',
    'brew_session',
    'roast_schedule'
));