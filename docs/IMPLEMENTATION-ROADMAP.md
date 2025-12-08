# Bean Ledger - Complete Implementation Roadmap

## 🎯 Executive Summary

This roadmap prioritizes features and technical improvements based on:
1. **User Impact** - Features users directly interact with
2. **Technical Debt** - Architecture improvements for stability
3. **Development Velocity** - Quick wins vs. long-term investments

---

## 📊 Priority Matrix

### **P0 - Critical (Do First)**
Features that are blocking or causing user frustration

### **P1 - High (Do Soon)**
Important features that significantly improve UX

### **P2 - Medium (Plan For)**
Nice-to-have features and optimizations

### **P3 - Low (Backlog)**
Future enhancements

---

## 🚀 Implementation Plan

## **WEEK 1-2: Quick Wins & Bug Fixes**

### P0 Tasks (Critical)

#### 1. ✅ Fix "Corrected" Display Issue
**Status:** Analysis complete, ready to implement
**Effort:** 1 hour
**Files:** `src/lib/ledger.ts:409-411`
```typescript
// Current issue: The regex isn't matching the actual pattern
// Fix: Update display_name logic to handle all "Corrected" variants
```

#### 2. Remove Debug Buttons Throughout
**Effort:** 2 hours
**Impact:** Cleaner UI, professional appearance
**Files to update:**
- `src/components/inventory/inventory-dashboard.tsx:312-318` (Remove debug button)
- `src/lib/debug-inventory.ts` (Can be moved to dev tools)
- Search for all `<Bug` icon imports and remove

**Action Items:**
```bash
# Find all debug button instances
grep -r "Debug" src/components/
grep -r "debug" src/components/ --include="*.tsx"
```

#### 3. Fix Duplicate Batch Planners Under Schedule
**Effort:** 3-4 hours
**Impact:** Prevents user confusion
**Files:** `src/components/schedule/` and `src/lib/schedule.ts`

**Investigation needed:**
- Check `roast-schedule.tsx` for duplicate component rendering
- Review schedule state management
- Look for multiple event listeners or useEffect loops

---

## **WEEK 3-4: User Experience Improvements**

### P1 Tasks (High Priority)

#### 4. Temperature Unit Selection (Fahrenheit/Celsius)
**Effort:** 4-5 hours
**Files to update:**
- `src/lib/schema/preferences.ts:15` - Already has `temperatureUnit` field! ✅
- Add temperature conversion utilities
- Update all temperature displays
- Add settings UI

**Implementation:**
```typescript
// src/lib/utils/temperature.ts
export function convertTemp(temp: number, from: 'C' | 'F', to: 'C' | 'F') {
  if (from === to) return temp;
  if (from === 'C' && to === 'F') return (temp * 9/5) + 32;
  if (from === 'F' && to === 'C') return (temp - 32) * 5/9;
  return temp;
}

export function formatTemp(temp: number, unit: 'celsius' | 'fahrenheit') {
  return unit === 'fahrenheit'
    ? `${convertTemp(temp, 'C', 'F').toFixed(1)}°F`
    : `${temp.toFixed(1)}°C`;
}
```

#### 5. Fine-Tune Brewing Measurements (10g option)
**Effort:** 2-3 hours
**Files:** Brew-related components
**Implementation:**
- Add adjustable consumption buttons (10g, 15g, 20g, 30g, 40g, custom)
- Make default 15g instead of 20g
- Add "+" and "-" buttons for custom amounts

#### 6. Manual Scheduling on Schedule Page
**Effort:** 5-6 hours
**Investigation:**
- Review existing schedule functionality
- Check if manual entry exists but is hidden
- Implement date picker + manual roast entry form

#### 7. Fix Scaling Issues on Computer
**Effort:** 3-4 hours
**Areas to check:**
- CSS responsive breakpoints
- Fixed width elements
- Font scaling
- Container max-widths

**Action:**
```bash
# Find fixed widths that might cause issues
grep -r "w-\[" src/components/
grep -r "width:" src/ --include="*.tsx" --include="*.css"
```

---

## **WEEK 5-6: Feature Enhancements**

### P1 Tasks Continued

#### 8. Remove Charge/Drop Temp Fields in Brewing
**Effort:** 1 hour
**Files:** Brewing components
**Action:** Search for `charge_temp` and `drop_temp` references and remove

#### 9. AI Picture Analysis for Coffee
**Effort:** 8-10 hours
**Tech Stack:**
- File upload component (React Dropzone)
- Anthropic Vision API
- Image storage (Supabase Storage)

**Implementation Steps:**
1. Add camera/upload button to brew logging
2. Upload to Supabase Storage
3. Send to Claude Vision API with coffee analysis prompt
4. Display analysis results (roast level, defects, uniformity)

**Example prompt:**
```typescript
const prompt = `Analyze this coffee beans image. Provide:
1. Roast level (light/medium/dark)
2. Roast uniformity (1-10 score)
3. Visible defects or issues
4. Recommendations for brewing`
```

#### 10. Brewing Buttons - Adjustable Default (15g)
**Effort:** 2 hours
**Implementation:**
- Create brew amount selector component
- Save preference to user settings
- Update quick-action buttons

---

## **WEEK 7-8: Design & Polish**

### P2 Tasks (Medium Priority)

#### 11. Update Design System
**Effort:** 10-15 hours
**Scope:**
- Create consistent color palette
- Standardize spacing/typography
- Component library documentation
- Dark mode support (optional)

**Suggested approach:**
1. Create design tokens file
2. Update Tailwind config
3. Create reusable UI components
4. Document in Storybook (optional)

#### 12. Improve Website Copy
**Effort:** 3-4 hours
**Areas:**
- Landing page
- Feature descriptions
- Help text and tooltips
- Error messages

#### 13. Update Help Center & FAQ
**Effort:** 4-5 hours
**Content needed:**
- Getting started guide
- Common workflows
- Troubleshooting
- Best practices

---

## **WEEK 9-12: Advanced Features**

### P1-P2 Tasks

#### 14. Integrate ChronoRoast Timers
**Effort:** 6-8 hours
**Research needed:** Understand ChronoRoast API/integration
**Implementation:**
- Timer component for roasting
- Progress tracking
- Sound/visual alerts
- Profile-based timing suggestions

#### 15. AI Brewing for Multiple Methods (V60, Switch, etc.)
**Effort:** 12-15 hours
**Implementation:**
1. Expand brew method database
2. Create method-specific prompts
3. Add equipment-specific variables
4. Build method selector UI

**Methods to add:**
- V60 (pour-over)
- Switch (immersion)
- Aeropress
- French Press
- Chemex
- Espresso

#### 16. Fix AI Prompts to be Scalable
**Effort:** 6-8 hours
**Current issue:** Prompts are hardcoded for specific equipment
**Solution:** Template-based prompt system

```typescript
// src/lib/ai/prompt-templates.ts
export const roastPromptTemplate = (equipment: Equipment, coffee: GreenCoffee) => `
You are a coffee roasting expert. The user has:
- Roaster: ${equipment.brand} ${equipment.model}
- Capacity: ${equipment.capacity}g
- Coffee: ${coffee.name} from ${coffee.origin}
- Process: ${coffee.process}
- Density: ${coffee.density || 'medium'}

Provide roast profile recommendations...
`
```

---

## **WEEK 13+: Infrastructure & Architecture**

### P0-P1 Technical Debt

#### 17. Implement Drizzle ORM Migration
**Effort:** 2-3 weeks
**Status:** Schema and migrations ready ✅
**Remaining work:**
1. Set up DATABASE_URL environment variable
2. Run migrations on Supabase
3. Create data migration script
4. Update components to use new services
5. Testing and validation
6. Gradual rollout

**Files ready:**
- ✅ Schema definitions (`src/lib/schema/`)
- ✅ Repositories (`src/lib/repositories/`)
- ✅ Services (`src/lib/services/`)
- ✅ Migration files (`drizzle/migrations/`)

**Next steps:**
```bash
# 1. Set environment variable
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 2. Apply migrations
npm run db:migrate

# 3. Test with example component
# Use InventoryDashboardNew component as reference

# 4. Migrate one feature at a time
# Start with inventory, then brewing, then roasting
```

#### 18. Add Testing Framework
**Effort:** 1-2 weeks
**Priority:** High for long-term stability

**Setup:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event vitest
```

**Test Coverage Goals:**
- 80%+ for service layer
- 60%+ for components
- 90%+ for repositories

**Example tests needed:**
- `inventory.service.test.ts`
- `coffee.repository.test.ts`
- `inventory-dashboard.test.tsx`

#### 19. Add Validation Layer (Zod)
**Effort:** 1 week
**Status:** Zod already installed ✅

**Implementation:**
```typescript
// src/lib/validations/coffee.ts
import { z } from 'zod';

export const greenCoffeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  origin: z.string().min(1, 'Origin is required'),
  weight: z.number().positive('Weight must be positive'),
  costPerKg: z.number().optional(),
});

export const roastBatchSchema = z.object({
  greenCoffeeId: z.string().uuid(),
  greenWeight: z.number().min(50).max(1000),
  roastedWeight: z.number().min(40).max(900),
  roastLevel: z.enum(['light', 'medium', 'dark']),
});
```

---

## 📅 Suggested Timeline

### Month 1: Quick Wins
- ✅ Week 1-2: Bug fixes (corrected display, debug buttons, duplicates)
- Week 3-4: UX improvements (temperature units, brewing measurements)

### Month 2: Features
- Week 5-6: Manual scheduling, picture analysis
- Week 7-8: Design updates, content improvements

### Month 3: Advanced Features
- Week 9-10: ChronoRoast, multi-method brewing
- Week 11-12: AI prompt refactoring

### Month 4+: Architecture
- Drizzle ORM migration (gradual rollout)
- Testing infrastructure
- Validation layer
- Performance optimization

---

## 🎯 Success Metrics

### User Experience
- [ ] All debug buttons removed
- [ ] No duplicate UI elements
- [ ] Temperature units user-selectable
- [ ] Flexible brewing amounts (10g option)
- [ ] Manual schedule entry working

### Technical Quality
- [ ] Type-safe database operations (ORM)
- [ ] 70%+ test coverage
- [ ] All inputs validated
- [ ] No console errors in production
- [ ] Page load < 2 seconds

### Feature Completeness
- [ ] Multi-method AI brewing
- [ ] Coffee picture analysis
- [ ] ChronoRoast integration
- [ ] Scalable equipment support
- [ ] Complete documentation

---

## 🛠️ Development Workflow

### For Each Feature:
1. **Plan** - Review requirements, check existing code
2. **Design** - Sketch UI/architecture
3. **Implement** - Write code, following patterns
4. **Test** - Manual + automated testing
5. **Review** - Code review, refactor
6. **Deploy** - Merge to main, deploy
7. **Monitor** - Check for errors, gather feedback

### Git Workflow:
```bash
# Feature branches
git checkout -b feature/temperature-units
git checkout -b fix/duplicate-batch-planners
git checkout -b feat/ai-picture-analysis

# Commit message format
git commit -m "feat: add temperature unit selection"
git commit -m "fix: remove duplicate batch planners"
git commit -m "refactor: migrate to Drizzle ORM"
```

---

## 🚦 Risk Assessment

### High Risk Items:
1. **Drizzle ORM Migration** - Potential data loss, requires careful testing
   - Mitigation: Run in parallel, thorough backups, gradual rollout

2. **AI Picture Analysis** - Cost concerns with API usage
   - Mitigation: Rate limiting, image compression, user quotas

3. **ChronoRoast Integration** - Unknown API/integration complexity
   - Mitigation: Research first, POC before full implementation

### Medium Risk:
- Design system overhaul (could break existing UI)
- Scaling issues (need performance testing)

### Low Risk:
- Button removals, text changes
- Temperature unit conversion
- UI tweaks

---

## 📝 Notes

- Keep the old ledger system running during ORM migration
- Back up database before major migrations
- Test thoroughly on staging before production
- Gather user feedback after each deployment
- Document all API integrations
- Keep dependencies up to date

---

## ✅ Completed Items
- [x] Drizzle ORM schema design
- [x] Repository pattern implementation
- [x] Service layer architecture
- [x] Migration files generated
- [x] Example component (InventoryDashboardNew)