# Fix: Duplicate Roasted Coffee Entries When Adjusting Upward

## 🐛 Problem

When editing roasted coffee inventory to **increase** the amount (e.g., adding 5g), the system creates a **duplicate entry** instead of adjusting the existing batch. This happens because:

1. The adjustment logic was creating a **new roast entry** with `action_type: 'roast_completed'` and a new `entity_id`
2. The database function `calculate_roasted_inventory` only includes `roast_completed` transactions, not `roasted_adjustment`

**Result:** Two separate batches appear in inventory instead of one adjusted batch.

---

## ✅ Solution Applied

### 1. Fixed Adjustment Logic (TypeScript)

**File:** `src/lib/ledger.ts` (lines 517-560)

**Before:**
- Positive adjustments → created new roast with `roast_completed` action
- Negative adjustments → created consumption entry

**After:**
- **Both** positive and negative adjustments → use `roasted_adjustment` action type
- Uses the **same entity_id** as the original batch
- Properly records the amount change (+ or -)

```typescript
// Now uses roasted_adjustment for both increases and decreases
action_type: 'roasted_adjustment',
entity_id: entityId, // Same entity as original roast
amount_change: amountDiff, // Positive or negative
```

### 2. Updated Database Function (SQL)

**File:** `supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql`

**Changes:**
- Added `roasted_adjustment` to the action types counted in inventory
- Separated roast metadata from inventory calculation
- Uses CTEs for clearer logic:
  - `roast_entries` - gets roast metadata
  - `inventory_amounts` - sums all transactions including adjustments

**Key change:**
```sql
-- NOW includes adjustments
WHERE l.action_type IN ('roast_completed', 'consumption', 'roasted_adjustment')
-- BEFORE was only:
WHERE l.action_type = 'roast_completed'
```

---

## 🚀 How to Apply the Fix

### Step 1: Apply the Database Migration

You need to run the SQL migration on your Supabase database. Choose one method:

**Option A: Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Create a new query
5. Copy the entire contents of `supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql`
6. Paste and click "Run"

**Option B: Supabase CLI**
```bash
# First, link your project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Then push the migration
npx supabase db push
```

### Step 2: Test the Fix

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Visit the inventory page: `http://localhost:3000/inventory`

3. Find a roasted coffee batch and click "Edit"

4. **Increase** the amount by 5g (or any amount)

5. Save the adjustment

6. **Verify:** Only ONE entry should show with the updated amount (no duplicate)

7. **Also test decreasing:** Should still work correctly

---

## 🧪 Testing Scenarios

| Test Case | Before Fix | After Fix |
|-----------|------------|-----------|
| Increase roasted by 5g | Creates duplicate entry | ✅ Adjusts existing entry |
| Decrease roasted by 10g | Works correctly | ✅ Still works correctly |
| Multiple adjustments | Multiple duplicates | ✅ Single entry, correct total |
| View inventory | Shows duplicates | ✅ Shows single batch |

---

## 📝 Technical Details

### Why This Happened

The original design tried to use event sourcing:
- Every change = new ledger entry
- Inventory = sum of all entries

**But the implementation was inconsistent:**
- Green coffee adjustments: Used `green_adjustment` action
- Roasted coffee positive adjustments: Created **fake roast entries**
- Roasted coffee negative adjustments: Used `consumption` action

This caused the inventory calculation to count fake roasts as separate batches.

### The Proper Fix

Now uses a consistent pattern:
1. **Roasts** = `roast_completed` (initial roast only)
2. **Consumption** = `consumption` (brewing, gifting, waste)
3. **Adjustments** = `roasted_adjustment` (physical count corrections)

The database function sums all three types but only shows unique batches based on `entity_id`.

---

## 🔍 How to Verify It's Working

### Check the Database

```sql
-- See all transactions for a specific coffee
SELECT
    action_type,
    amount_change,
    metadata->>'name' as coffee_name,
    created_at
FROM ledger
WHERE user_id = 'YOUR_USER_ID'
    AND entity_type = 'roasted_coffee'
    AND metadata->>'name' = 'Kenya Muranga Gatagua AA #3'
ORDER BY created_at DESC;
```

**You should see:**
- 1 `roast_completed` entry (the original roast)
- N `roasted_adjustment` entries (your edits)
- M `consumption` entries (brews/consumption)

### Check the Inventory View

```sql
-- See current inventory calculation
SELECT * FROM calculate_roasted_inventory('YOUR_USER_ID');
```

**You should see:**
- Only ONE row per batch (not duplicates)
- `current_amount` = sum of all transactions

---

## 🎯 Impact

**Before:**
- ❌ Confusing UI (duplicates)
- ❌ Incorrect inventory totals
- ❌ Can't track adjustments properly

**After:**
- ✅ Clean UI (single entry per batch)
- ✅ Accurate inventory tracking
- ✅ Full adjustment audit trail
- ✅ Works for both increase and decrease

---

## 📦 Files Modified

1. ✅ `src/lib/ledger.ts` - Fixed adjustment logic
2. ✅ `supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql` - Fixed DB function
3. 📝 This documentation file

---

## ⚠️ Important Notes

### Existing Duplicates

If you already have duplicate entries from before this fix:

**They will remain in the database** until you manually clean them up. The fix only prevents NEW duplicates.

To clean up old duplicates, you can:
1. Delete the duplicate ledger entries (keep only the original roast)
2. Or create a cleanup script to merge them

### Migration Safety

This migration:
- ✅ Only changes the database function (no data loss)
- ✅ Safe to run multiple times (idempotent)
- ✅ Doesn't affect existing data
- ✅ Backward compatible with old entries

---

## 🆘 Troubleshooting

**Problem:** Still seeing duplicates after fix

**Solutions:**
1. Clear browser cache and refresh
2. Verify the migration was applied:
   ```sql
   -- Check if function was updated
   SELECT pg_get_functiondef('calculate_roasted_inventory'::regproc);
   ```
3. Check that TypeScript changes are deployed (restart dev server)

**Problem:** Old duplicates still showing

**Solution:**
Those are from before the fix. You can either:
- Leave them (they won't affect new adjustments)
- Manually delete the duplicate ledger entries
- Create a data cleanup migration

---

## ✅ Commit Message

```bash
git add src/lib/ledger.ts
git add supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql
git commit -m "fix: prevent duplicate roasted coffee entries when adjusting inventory upward

- Changed roasted adjustments to use 'roasted_adjustment' action type instead of creating fake roast entries
- Updated calculate_roasted_inventory function to include adjustment transactions
- Now properly tracks inventory changes for both increases and decreases
- Fixes issue where editing roasted coffee created duplicate batches in UI"
```