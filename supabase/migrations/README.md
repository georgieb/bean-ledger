# Database Migrations

This directory contains sequential database migrations for Supabase.

## Migration Order

Migrations are numbered sequentially and should be applied in order:

- `001-016` - Initial schema, RLS, functions, and triggers
- `018-019` - Green inventory fixes (017 was skipped/deleted)
- `020-022` - Roasted coffee adjustment fixes

## Recent Migrations (020-022)

These migrations fix the roasted coffee inventory adjustment feature:

### 020_fix_roasted_inventory_with_adjustments.sql
- Updates `calculate_roasted_inventory()` function to include `roasted_adjustment` action type
- Fixes issue where adjustments weren't counted in inventory totals
- **Status**: Superseded by 021

### 021_revert_to_working_roasted_inventory.sql
- Reverts to the simpler working version of `calculate_roasted_inventory()`
- Uses `array_agg` approach instead of complex joins
- Includes `roasted_adjustment` in action types
- **Status**: Active - This is the current version

### 022_add_roasted_adjustment_to_trigger.sql
- Updates the `validate_ledger_metadata()` trigger to accept `roasted_adjustment` action type
- Adds ELSE clause to prevent "case not found" errors
- Required for roasted coffee adjustments to work
- **Status**: Active

## Applying Migrations

1. Open Supabase SQL Editor
2. Copy the SQL from the migration file
3. Execute the SQL
4. Verify success

## Notes

- Migration 017 is missing from the sequence (was deleted or never created)
- Migrations 006, 007 were deleted from git (see archive if needed)
- Always test migrations in a dev environment first
