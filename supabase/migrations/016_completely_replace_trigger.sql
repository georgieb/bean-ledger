-- Completely replace the metadata validation trigger to fix CASE statement issues

-- Drop everything related to the old trigger
DROP TRIGGER IF EXISTS validate_ledger_metadata ON ledger;
DROP TRIGGER IF EXISTS validate_ledger_entry ON ledger;
DROP FUNCTION IF EXISTS validate_ledger_metadata() CASCADE;

-- Create the new function with comprehensive action type handling
CREATE OR REPLACE FUNCTION validate_ledger_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required metadata fields based on action_type
    IF NEW.action_type = 'roast_completed' THEN
        IF NOT (NEW.metadata ? 'name' AND 
               NEW.metadata ? 'roast_date' AND 
               NEW.metadata ? 'roast_level' AND 
               NEW.metadata ? 'green_weight' AND
               NEW.metadata ? 'batch_number') THEN
            RAISE EXCEPTION 'roast_completed requires: name, roast_date, roast_level, green_weight, batch_number';
        END IF;
    ELSIF NEW.action_type = 'consumption' THEN
        IF NOT (NEW.metadata ? 'coffee_name') THEN
            RAISE EXCEPTION 'consumption requires: coffee_name';
        END IF;
    ELSIF NEW.action_type = 'green_purchase' THEN
        IF NOT (NEW.metadata ? 'name') THEN
            RAISE EXCEPTION 'green_purchase requires: name';
        END IF;
    ELSIF NEW.action_type = 'green_adjustment' THEN
        IF NOT (NEW.metadata ? 'name') THEN
            RAISE EXCEPTION 'green_adjustment requires: name';
        END IF;
    ELSIF NEW.action_type = 'roasted_adjustment' THEN
        IF NOT (NEW.metadata ? 'name') THEN
            RAISE EXCEPTION 'roasted_adjustment requires: name';
        END IF;
    ELSIF NEW.action_type = 'brew_logged' THEN
        IF NOT (NEW.metadata ? 'coffee_name' AND 
               NEW.metadata ? 'brew_method') THEN
            RAISE EXCEPTION 'brew_logged requires: coffee_name, brew_method';
        END IF;
    -- All other action types (roast_scheduled, roast_edited, roast_deleted) are allowed without specific validation
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER validate_ledger_metadata
    BEFORE INSERT OR UPDATE ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION validate_ledger_metadata();