import { pgTable, uuid, text, numeric, timestamp, boolean, date, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './coffee';

// Scheduled roasts table
export const scheduledRoasts = pgTable('scheduled_roasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
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

// Relations
export const scheduledRoastsRelations = relations(scheduledRoasts, ({ one }) => ({
  user: one(users, {
    fields: [scheduledRoasts.userId],
    references: [users.id]
  })
}));

// Type definitions
export type ScheduledRoast = typeof scheduledRoasts.$inferSelect;
export type NewScheduledRoast = typeof scheduledRoasts.$inferInsert;