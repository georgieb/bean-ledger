# Quick Start - Next 5 Tasks to Do Today

## 🎯 Today's Focus: Quick Wins

These are the highest-impact, lowest-effort tasks you can complete immediately to improve the app.

---

## Task 1: Remove Debug Buttons (15 minutes)

### Why: Unprofessional, clutters UI
### Files to Change:

**1. Remove from Inventory Dashboard**
```typescript
// src/components/inventory/inventory-dashboard.tsx

// DELETE lines 312-318:
<button
  onClick={() => debugGreenInventory(coffee.coffee_name)}
  className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
>
  <Bug className="h-3 w-3" />
  Debug
</button>
```

**2. Remove the import**
```typescript
// DELETE this import at the top:
import { debugGreenInventory } from '@/lib/debug-inventory'
import { Bug } from 'lucide-react'  // Remove Bug icon
```

**3. Optionally keep debug-inventory.ts for development**
- Move it to a `__dev__` folder if you want to keep it
- Or delete it entirely: `rm src/lib/debug-inventory.ts`

✅ **Done!** Test by viewing inventory page

---

## Task 2: Fix "Corrected" Display Issue (30 minutes)

### Why: Users see ugly "(Corrected 1234567890)" in names
### File: `src/lib/ledger.ts`

The issue is on lines 409-411. The display logic is there but may not be working correctly.

**Current code:**
```typescript
display_name: coffee.name.includes('(Corrected ')
  ? coffee.name.replace(/ \(Corrected \d+\)$/, '')
  : coffee.name
```

**Better fix - handle all cases:**
```typescript
display_name: coffee.name.replace(/ \(Corrected \d+\)$/, '').trim()
```

This will:
- Remove "(Corrected 123456789)" from the end
- Keep the original name if no pattern found
- Always trim whitespace

✅ **Test:** Adjust green coffee inventory and check if "Corrected" shows up

---

## Task 3: Add 10g Brewing Option (20 minutes)

### Why: Users want more flexibility in brewing amounts
### Files: Inventory and consumption components

**Update inventory-dashboard.tsx:**

Find the consumption buttons (around line 250-265) and add a 10g option:

```typescript
<div className="flex items-center gap-2">
  <button
    onClick={() => setAdjustmentModal({...})}
    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
  >
    <Edit3 className="h-3 w-3" />
    Edit
  </button>

  {/* ADD THIS NEW BUTTON */}
  <button
    onClick={() => handleConsumption(coffee.coffee_name, 10)}
    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
    disabled={coffee.current_amount < 10}
  >
    <Minus className="h-3 w-3" />
    10g
  </button>

  <button
    onClick={() => handleConsumption(coffee.coffee_name, 20)}
    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
    disabled={coffee.current_amount < 20}
  >
    <Minus className="h-3 w-3" />
    20g
  </button>

  <button
    onClick={() => handleConsumption(coffee.coffee_name, 40)}
    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
    disabled={coffee.current_amount < 40}
  >
    <Minus className="h-3 w-3" />
    40g
  </button>
</div>
```

✅ **Test:** Try brewing 10g of coffee from inventory

---

## Task 4: Temperature Unit Preference Setup (45 minutes)

### Why: Users want Fahrenheit option
### Note: Schema already supports this! Just need UI.

**Step 1: Create temperature utility**

Create new file: `src/lib/utils/temperature.ts`

```typescript
export type TempUnit = 'celsius' | 'fahrenheit';

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9/5) + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5/9;
}

export function formatTemperature(
  tempInCelsius: number,
  userPreference: TempUnit
): string {
  if (userPreference === 'fahrenheit') {
    return `${celsiusToFahrenheit(tempInCelsius).toFixed(1)}°F`;
  }
  return `${tempInCelsius.toFixed(1)}°C`;
}

export function parseTemperature(
  value: string,
  inputUnit: TempUnit
): number {
  const temp = parseFloat(value);
  if (isNaN(temp)) return 0;

  // Always store as Celsius in database
  return inputUnit === 'fahrenheit'
    ? fahrenheitToCelsius(temp)
    : temp;
}
```

**Step 2: Add to Settings Page**

Update `src/app/(protected)/settings/page.tsx`:

```typescript
'use client'
import { useState } from 'react'

export default function SettingsPage() {
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius')

  const handleSave = async () => {
    // TODO: Save to user_preferences table
    console.log('Saving temperature preference:', tempUnit)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Temperature Unit</h2>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tempUnit"
              value="celsius"
              checked={tempUnit === 'celsius'}
              onChange={(e) => setTempUnit('celsius')}
              className="w-4 h-4"
            />
            <span>Celsius (°C)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tempUnit"
              value="fahrenheit"
              checked={tempUnit === 'fahrenheit'}
              onChange={(e) => setTempUnit('fahrenheit')}
              className="w-4 h-4"
            />
            <span>Fahrenheit (°F)</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded"
        >
          Save Preferences
        </button>
      </div>
    </div>
  )
}
```

**Step 3: Use temperature formatting**

Anywhere you display temperature (brew logs, roast profiles), use:

```typescript
import { formatTemperature } from '@/lib/utils/temperature'

// In component:
const userTempPref = 'celsius' // TODO: Get from user preferences

// Display:
<p>Water Temp: {formatTemperature(waterTemp, userTempPref)}</p>
```

✅ **Test:** Change setting and verify temperatures display correctly

---

## Task 5: Find & Fix Duplicate Batch Planners (1 hour)

### Why: Confusing to see duplicates
### Investigation needed

**Step 1: Check schedule page**

```bash
# Search for duplicate components or renderings
grep -n "BatchPlanner\|batch-planner" src/components/schedule/*.tsx
grep -n "useEffect" src/components/schedule/roast-schedule.tsx
```

**Step 2: Look for the issue**

Common causes:
1. Component rendered twice in parent
2. Multiple useEffect calls creating duplicates
3. State not properly cleaning up
4. Key prop issues causing re-renders

**Check this file:** `src/components/schedule/roast-schedule.tsx`

Look for:
```typescript
// Is this being called multiple times?
useEffect(() => {
  loadSchedule()
}, [])

// Are there duplicate returns?
return (
  <>
    <BatchPlanner />
    <BatchPlanner /> {/* Duplicate? */}
  </>
)

// Are there missing keys in lists?
{schedules.map((schedule) => (
  <BatchPlanner key={schedule.id} /> // Need unique keys
))}
```

**Step 3: Fix**

Most likely fix:
```typescript
// Make sure there's only one BatchPlanner per schedule item
{schedules.map((schedule) => (
  <BatchPlanner
    key={schedule.id}  // Unique key prevents duplicates
    schedule={schedule}
  />
))}
```

✅ **Test:** Go to schedule page, verify only one planner per item

---

## 🎉 After Completing These 5 Tasks

You'll have:
- ✅ Cleaner, more professional UI (no debug buttons)
- ✅ Fixed display names (no ugly "Corrected" text)
- ✅ Better brewing flexibility (10g option)
- ✅ Temperature preference system (foundation)
- ✅ No duplicate components (cleaner UX)

**Total time:** ~3 hours
**Impact:** High - users will notice the improvement immediately

---

## Next Steps After Today

Once these are done, move on to:
1. Manual scheduling functionality
2. AI picture analysis for coffee
3. Drizzle ORM migration (bigger project)

See [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) for full details.

---

## Need Help?

If you get stuck on any of these:
1. Check the git history to see how similar features were implemented
2. Use `grep` to find where similar functionality exists
3. Test incrementally - don't change too much at once
4. Commit after each working task

Good luck! 🚀