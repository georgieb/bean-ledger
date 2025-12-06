# Drizzle ORM Migration Plan

## Phase 1: Installation & Setup

### 1.1 Install Dependencies
```bash
npm install drizzle-orm drizzle-kit postgres
npm install -D @types/pg
```

### 1.2 Update package.json scripts
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push:pg"
  }
}
```

### 1.3 Create Drizzle Config
```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/schema/*',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## Phase 2: Schema Definition

### 2.1 Core Domain Entities
- Green Coffee management
- Roast Batch tracking
- Inventory snapshots
- Equipment profiles
- Brew sessions

### 2.2 Transaction & Audit System
- Inventory transactions
- Audit logs
- User preferences

## Phase 3: Service Layer

### 3.1 Repository Pattern
- CoffeeRepository
- InventoryRepository  
- BrewRepository
- EquipmentRepository

### 3.2 Domain Services
- InventoryService
- RoastingService
- BrewingService

## Phase 4: Data Migration

### 4.1 Migration Strategy
- Extract data from current ledger system
- Transform to new schema
- Preserve audit trail
- Validate data integrity

### 4.2 Rollback Plan
- Keep old system running in parallel
- Data validation checks
- Gradual feature migration

## Phase 5: Integration

### 5.1 Update Components
- Replace direct Supabase calls
- Use new service layer
- Update TypeScript interfaces

### 5.2 Testing
- Unit tests for repositories
- Integration tests for services
- End-to-end testing