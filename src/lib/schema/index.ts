// Export all schema definitions and relations
export * from './coffee';
export * from './equipment';
export * from './transactions';
export * from './brews';
export * from './preferences';

// Re-export for convenience
import { 
  greenCoffees, 
  roastBatches, 
  greenInventory, 
  roastedInventory, 
  users,
  greenCoffeesRelations,
  roastBatchesRelations,
  greenInventoryRelations,
  roastedInventoryRelations
} from './coffee';

import { 
  equipment,
  equipmentRelations 
} from './equipment';

import { 
  inventoryTransactions,
  inventoryTransactionsRelations 
} from './transactions';

import { 
  brewSessions,
  brewSessionsRelations 
} from './brews';

import { 
  userPreferences,
  userPreferencesRelations 
} from './preferences';

export const schema = {
  // Tables
  users,
  greenCoffees,
  roastBatches,
  greenInventory,
  roastedInventory,
  equipment,
  inventoryTransactions,
  brewSessions,
  userPreferences,
  
  // Relations
  greenCoffeesRelations,
  roastBatchesRelations,
  greenInventoryRelations,
  roastedInventoryRelations,
  equipmentRelations,
  inventoryTransactionsRelations,
  brewSessionsRelations,
  userPreferencesRelations
};