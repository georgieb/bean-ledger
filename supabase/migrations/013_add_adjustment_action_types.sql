-- Add green_adjustment and roasted_adjustment action types

-- Update the check constraint to include new action types
ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_action_type_check;

ALTER TABLE ledger ADD CONSTRAINT ledger_action_type_check 
CHECK (action_type IN (
  'green_purchase',
  'green_adjustment', 
  'roast_completed', 
  'consumption', 
  'roasted_adjustment',
  'brew_logged', 
  'roast_scheduled',
  'roast_edited', 
  'roast_deleted'
));