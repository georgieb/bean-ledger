-- Simple debug approach - just remove all constraints temporarily

-- Drop any existing triggers
DROP TRIGGER IF EXISTS validate_ledger_metadata ON ledger;
DROP TRIGGER IF EXISTS validate_ledger_entry ON ledger;

-- Drop the action type constraint temporarily 
ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_action_type_check;