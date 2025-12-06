import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, greenCoffees, roastBatches } from './coffee';

// Inventory transaction log (audit trail)
export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  transactionType: text('transaction_type').notNull().$type<'purchase' | 'roast' | 'consumption' | 'adjustment' | 'waste'>(),
  greenCoffeeId: uuid('green_coffee_id').references(() => greenCoffees.id),
  roastBatchId: uuid('roast_batch_id').references(() => roastBatches.id),
  amountChange: numeric('amount_change', { precision: 8, scale: 2 }).notNull(), // positive for increase, negative for decrease
  reason: text('reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  user: one(users, {
    fields: [inventoryTransactions.userId],
    references: [users.id]
  }),
  greenCoffee: one(greenCoffees, {
    fields: [inventoryTransactions.greenCoffeeId],
    references: [greenCoffees.id]
  }),
  roastBatch: one(roastBatches, {
    fields: [inventoryTransactions.roastBatchId],
    references: [roastBatches.id]
  })
}));