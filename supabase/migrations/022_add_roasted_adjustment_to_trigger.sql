-- Add roasted_adjustment action type to the validation trigger
-- This fixes the "case not found" error when adjusting roasted coffee inventory

DROP TRIGGER IF EXISTS validate_ledger_entry ON ledger;
DROP FUNCTION IF EXISTS validate_ledger_metadata() CASCADE;

-- Recreate the validation function with roasted_adjustment support
CREATE OR REPLACE FUNCTION validate_ledger_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate required metadata fields based on action_type
    CASE NEW.action_type
        WHEN 'roast_completed' THEN
            IF NOT (NEW.metadata ? 'name' AND
                   NEW.metadata ? 'roast_date' AND
                   NEW.metadata ? 'roast_level' AND
                   NEW.metadata ? 'green_weight' AND
                   NEW.metadata ? 'batch_number') THEN
                RAISE EXCEPTION 'roast_completed requires: name, roast_date, roast_level, green_weight, batch_number';
            END IF;

        WHEN 'consumption' THEN
            IF NOT (NEW.metadata ? 'coffee_name') THEN
                RAISE EXCEPTION 'consumption requires: coffee_name';
            END IF;

        WHEN 'green_purchase' THEN
            IF NOT (NEW.metadata ? 'name') THEN
                RAISE EXCEPTION 'green_purchase requires: name';
            END IF;

        WHEN 'green_adjustment' THEN
            IF NOT (NEW.metadata ? 'name') THEN
                RAISE EXCEPTION 'green_adjustment requires: name';
            END IF;

        WHEN 'roasted_adjustment' THEN
            IF NOT (NEW.metadata ? 'name') THEN
                RAISE EXCEPTION 'roasted_adjustment requires: name';
            END IF;

        WHEN 'brew_logged' THEN
            IF NOT (NEW.metadata ? 'coffee_name' AND
                   NEW.metadata ? 'brew_method') THEN
                RAISE EXCEPTION 'brew_logged requires: coffee_name, brew_method';
            END IF;

        -- Default case: allow other action types without validation
        ELSE
            -- No validation needed for other action types
            NULL;
    END CASE;

    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER validate_ledger_entry
    BEFORE INSERT ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION validate_ledger_metadata();
