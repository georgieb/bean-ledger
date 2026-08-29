import { pgTable, uuid, text, numeric, timestamp, boolean, date, unique } from 'drizzle-orm/pg-core';

// Scheduled roasts table.
//
// user_id is a plain uuid (Supabase auth.users id), not a foreign key —
// matching every other currently-live table (equipment, ledger). It used
// to reference a legacy public.users mirror table that nothing keeps in
// sync with auth.users, which made every insert here fail with a foreign
// key violation (see migration 0005_drop_scheduled_roasts_user_fk).
export const scheduledRoasts = pgTable('scheduled_roasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  coffeeName: text('coffee_name').notNull(),
  greenCoffeeName: text('green_coffee_name').notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  greenWeight: numeric('green_weight', { precision: 8, scale: 2 }).notNull(),
  targetRoastLevel: text('target_roast_level').notNull(),
  equipmentId: uuid('equipment_id'),
  notes: text('notes'),
  priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high'
  completed: boolean('completed').notNull().default(false),
  completedDate: timestamp('completed_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Type definitions
export type ScheduledRoast = typeof scheduledRoasts.$inferSelect;
export type NewScheduledRoast = typeof scheduledRoasts.$inferInsert;