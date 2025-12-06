import { pgTable, uuid, text, numeric, timestamp, interval } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Brew sessions (coffee brewing logs)
export const brewSessions = pgTable('brew_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  roastBatchId: uuid('roast_batch_id').notNull(),
  brewMethod: text('brew_method').notNull(),
  coffeeAmount: numeric('coffee_amount', { precision: 8, scale: 2 }).notNull(),
  waterAmount: numeric('water_amount', { precision: 8, scale: 2 }).notNull(),
  grindSetting: text('grind_setting'),
  waterTemp: numeric('water_temp', { precision: 5, scale: 1 }),
  brewTime: interval('brew_time'),
  equipmentId: uuid('equipment_id'),
  rating: numeric('rating', { precision: 2, scale: 1 }),
  extractionQuality: text('extraction_quality').$type<'under' | 'good' | 'over'>(),
  tasteNotes: text('taste_notes'),
  notes: text('notes'),
  brewedAt: timestamp('brewed_at').defaultNow().notNull()
});

export const brewSessionsRelations = relations(brewSessions, ({ one }) => ({
  // Relations defined in index.ts
}));