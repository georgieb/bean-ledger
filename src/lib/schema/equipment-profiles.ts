import { pgTable, uuid, text, json, timestamp, unique } from 'drizzle-orm/pg-core';

// Global cache of AI-researched equipment profiles, keyed by normalized
// brand+model. Populated once per unique piece of equipment the first time
// any user adds gear that isn't already hand-tuned in the AI prompt tables
// (see src/lib/equipment-ai-profile.ts). Shared across all users so the
// research call only ever runs once per model, not once per user.
export const equipmentAiProfiles = pgTable('equipment_ai_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull().$type<'grinder' | 'roaster' | 'brewer'>(),
  normalizedKey: text('normalized_key').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  // Structured profile: specs, control ranges, starting parameters,
  // recommended starting recipes — shape mirrors the hand-written
  // ROASTER_PROMPTS/BREWING_PROMPTS entries closely enough to drop into
  // the same system-prompt slot.
  profile: json('profile').$type<Record<string, any>>().notNull(),
  generatedByModel: text('generated_by_model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  typeKeyUnique: unique('equipment_ai_profiles_type_key_unique').on(table.type, table.normalizedKey)
}));
