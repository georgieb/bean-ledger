import { pgTable, uuid, text, numeric, timestamp, boolean, integer, date, unique, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Green coffee beans (raw, unroasted)
export const greenCoffees = pgTable('green_coffees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  origin: text('origin').notNull(),
  farm: text('farm'),
  variety: text('variety'),
  process: text('process'),
  purchaseDate: date('purchase_date'),
  supplier: text('supplier'),
  costPerKg: numeric('cost_per_kg', { precision: 10, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqueUserName: unique('green_coffees_user_name_unique').on(table.userId, table.name)
}));

// Roast batches (specific roasting sessions)
export const roastBatches = pgTable('roast_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  greenCoffeeId: uuid('green_coffee_id').notNull().references(() => greenCoffees.id),
  batchNumber: integer('batch_number').notNull(),
  name: text('name').notNull(),
  roastDate: date('roast_date').notNull(),
  roastLevel: text('roast_level').notNull(),
  greenWeight: numeric('green_weight', { precision: 8, scale: 2 }).notNull(),
  roastedWeight: numeric('roasted_weight', { precision: 8, scale: 2 }).notNull(),
  equipmentId: uuid('equipment_id'),
  roastProfile: json('roast_profile').$type<RoastProfile>(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqueUserBatch: unique('roast_batches_user_batch_unique').on(table.userId, table.batchNumber)
}));

// Current inventory snapshots (materialized view for performance)
export const greenInventory = pgTable('green_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  greenCoffeeId: uuid('green_coffee_id').notNull().references(() => greenCoffees.id),
  currentAmount: numeric('current_amount', { precision: 8, scale: 2 }).notNull().default('0'),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull()
}, (table) => ({
  uniqueUserCoffee: unique('green_inventory_user_coffee_unique').on(table.userId, table.greenCoffeeId)
}));

export const roastedInventory = pgTable('roasted_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  roastBatchId: uuid('roast_batch_id').notNull().references(() => roastBatches.id),
  currentAmount: numeric('current_amount', { precision: 8, scale: 2 }).notNull().default('0'),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull()
}, (table) => ({
  uniqueUserBatch: unique('roasted_inventory_user_batch_unique').on(table.userId, table.roastBatchId)
}));

// User reference table (extends Supabase auth.users)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Forward reference for equipment
const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey()
});

// Type definitions for JSON fields
export interface RoastProfile {
  equipment?: string;
  startTemp?: number;
  firstCrackTime?: string;
  firstCrackTemp?: number;
  endTemp?: number;
  totalTime: string;
  fanSettings?: string;
  heatSettings?: string;
  detailedProgression?: string;
}

// Relations
export const greenCoffeesRelations = relations(greenCoffees, ({ many, one }) => ({
  roastBatches: many(roastBatches),
  inventory: one(greenInventory, {
    fields: [greenCoffees.id],
    references: [greenInventory.greenCoffeeId]
  }),
  user: one(users, {
    fields: [greenCoffees.userId],
    references: [users.id]
  })
}));

export const roastBatchesRelations = relations(roastBatches, ({ one }) => ({
  greenCoffee: one(greenCoffees, {
    fields: [roastBatches.greenCoffeeId],
    references: [greenCoffees.id]
  }),
  inventory: one(roastedInventory, {
    fields: [roastBatches.id],
    references: [roastedInventory.roastBatchId]
  }),
  user: one(users, {
    fields: [roastBatches.userId],
    references: [users.id]
  })
}));

export const greenInventoryRelations = relations(greenInventory, ({ one }) => ({
  greenCoffee: one(greenCoffees, {
    fields: [greenInventory.greenCoffeeId],
    references: [greenCoffees.id]
  }),
  user: one(users, {
    fields: [greenInventory.userId],
    references: [users.id]
  })
}));

export const roastedInventoryRelations = relations(roastedInventory, ({ one }) => ({
  roastBatch: one(roastBatches, {
    fields: [roastedInventory.roastBatchId],
    references: [roastBatches.id]
  }),
  user: one(users, {
    fields: [roastedInventory.userId],
    references: [users.id]
  })
}));