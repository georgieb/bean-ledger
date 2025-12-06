import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './coffee';

// User preferences and settings
export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  dailyConsumption: numeric('daily_consumption', { precision: 6, scale: 2 }).default('40').notNull(),
  defaultRoastSize: numeric('default_roast_size', { precision: 6, scale: 2 }).default('220').notNull(),
  defaultBrewRatio: numeric('default_brew_ratio', { precision: 4, scale: 1 }).default('15').notNull(),
  preferredUnits: text('preferred_units').default('grams').$type<'grams' | 'ounces'>().notNull(),
  temperatureUnit: text('temperature_unit').default('celsius').$type<'celsius' | 'fahrenheit'>().notNull(),
  timezone: text('timezone').default('UTC').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id]
  })
}));