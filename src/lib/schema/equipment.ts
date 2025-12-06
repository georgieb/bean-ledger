import { pgTable, uuid, text, boolean, timestamp, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull().$type<'grinder' | 'roaster' | 'brewer'>(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  settingsSchema: json('settings_schema').$type<Record<string, any>>().notNull().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const equipmentRelations = relations(equipment, ({ one }) => ({
  // Relations will be defined in index.ts to avoid circular imports
}));