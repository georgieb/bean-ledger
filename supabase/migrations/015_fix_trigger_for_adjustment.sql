-- Fix trigger to handle adjustment action types

DROP TRIGGER IF EXISTS validate_ledger_metadata ON ledger;

CREATE OR REPLACE FUNCTION validate_ledger_metadata()
RETURNS TRIGGER AS $$
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
            
        WHEN 'roast_scheduled' THEN
            -- Allow roast_scheduled entries with minimal validation
            NULL;
            
        WHEN 'roast_edited' THEN
            -- Allow roast_edited entries with minimal validation
            NULL;
            
        WHEN 'roast_deleted' THEN
            -- Allow roast_deleted entries with minimal validation
            NULL;
            
        ELSE
            -- Allow other action types without specific validation
            NULL;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_ledger_metadata
    BEFORE INSERT OR UPDATE ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION validate_ledger_metadata();