# How to Apply the Database Migration

## ⚠️ You're seeing this error:
```
Error creating roasted adjustment entry: Object
```

This is happening because:
1. ✅ The TypeScript code is updated to use `roasted_adjustment`
2. ❌ The database function still needs to be updated
3. The adjustment is being created, but it's not showing up in the inventory view

## 🚀 Fix: Apply the SQL Migration

### Option 1: Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the Migration**
   - Open: `supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql`
   - Copy ALL the contents (lines 1-87)

4. **Paste and Run**
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - You should see: "Success. No rows returned"

5. **Verify**
   - Run this query to confirm:
   ```sql
   SELECT pg_get_functiondef('calculate_roasted_inventory'::regproc);
   ```
   - You should see the updated function with `'roasted_adjustment'` in the action_type list

### Option 2: Using Supabase CLI

If you have the CLI set up:

```bash
# Make sure you're linked to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push

# Or run the specific file
npx supabase db execute --file supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql
```

### Option 3: Direct PostgreSQL Connection

If you have the database URL:

```bash
# Using psql
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f supabase/migrations/020_fix_roasted_inventory_with_adjustments.sql
```

---

## ✅ After Applying Migration

1. **Refresh your browser** (clear cache if needed)
2. **Try the adjustment again**
3. **Verify:** Should see single entry with updated amount

---

## 🐛 If Still Having Issues

### Check if Migration Applied

Run this in SQL Editor:

```sql
-- Check the function definition
SELECT pg_get_functiondef('calculate_roasted_inventory'::regproc);
```

Look for this line in the output:
```sql
AND l.action_type IN ('roast_completed', 'consumption', 'roasted_adjustment')
```

If you see it → Migration applied successfully ✅
If you don't → Migration didn't apply, try again

### Check Recent Adjustments

```sql
-- See recent adjustment entries
SELECT
    action_type,
    amount_change,
    metadata->>'name' as coffee_name,
    created_at
FROM ledger
WHERE action_type = 'roasted_adjustment'
ORDER BY created_at DESC
LIMIT 10;
```

Should show your recent adjustments.

### Check Current Inventory

```sql
-- See what inventory function returns
SELECT * FROM calculate_roasted_inventory('YOUR_USER_ID_HERE');
```

Replace `YOUR_USER_ID_HERE` with your actual user ID from Supabase Auth.

---

## 🆘 Still Not Working?

If you're still seeing duplicates or errors:

1. **Check browser console** for specific error messages
2. **Check Supabase logs** in Dashboard → Logs
3. **Verify user_id** is correct
4. **Try clearing browser cache** completely

### Temporary Workaround

If you need to use the app before fixing:
- Only **decrease** inventory (works fine)
- Don't increase for now
- Or manually delete duplicate entries after increasing

---

## 📝 Quick Test Script

Paste this in SQL Editor to test the whole flow:

```sql
-- 1. Check function includes adjustments
SELECT pg_get_functiondef('calculate_roasted_inventory'::regproc);

-- 2. See all action types in use
SELECT DISTINCT action_type
FROM ledger
WHERE entity_type = 'roasted_coffee'
ORDER BY action_type;

-- 3. Count entries by type
SELECT
    action_type,
    COUNT(*) as count
FROM ledger
WHERE entity_type = 'roasted_coffee'
GROUP BY action_type
ORDER BY count DESC;

-- 4. See recent roasted adjustments
SELECT
    metadata->>'name' as coffee_name,
    amount_change,
    created_at
FROM ledger
WHERE action_type = 'roasted_adjustment'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Success Checklist

- [ ] SQL migration applied in Supabase
- [ ] Function definition includes 'roasted_adjustment'
- [ ] Browser refreshed / cache cleared
- [ ] Adjustment no longer creates duplicates
- [ ] Inventory shows correct amount after adjustment

---

## 🎯 Expected Behavior After Fix

**Before:**
1. Edit roasted coffee, increase by 5g
2. Save
3. See TWO entries (original + duplicate with 5g)

**After:**
1. Edit roasted coffee, increase by 5g
2. Save
3. See ONE entry with updated amount
4. Adjustment recorded in ledger as `roasted_adjustment`