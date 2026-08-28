// Export all schema definitions and relations
export * from './coffee';
export * from './equipment';
export * from './equipment-profiles';
export * from './transactions';
export * from './brews';
export * from './preferences';
export * from './schedules';

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
  equipmentAiProfiles
} from './equipment-profiles';

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

import { 
  scheduledRoasts,
  scheduledRoastsRelations 
} from './schedules';

export const schema = {
  // Tables
  users,
  greenCoffees,
  roastBatches,
  greenInventory,
  roastedInventory,
  equipment,
  equipmentAiProfiles,
  inventoryTransactions,
  brewSessions,
  userPreferences,
  scheduledRoasts,
  
  // Relations
  greenCoffeesRelations,
  roastBatchesRelations,
  greenInventoryRelations,
  roastedInventoryRelations,
  equipmentRelations,
  inventoryTransactionsRelations,
  brewSessionsRelations,
  userPreferencesRelations,
  scheduledRoastsRelations
};