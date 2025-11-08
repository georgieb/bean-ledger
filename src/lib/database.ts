import { supabase } from './supabase';
import type { LedgerEntry, RoastedCoffee, GreenCoffee, BrewLog, Equipment, UserPreferences } from './types';

// Database utility functions for the Bean Ledger application

// Ledger operations
export async function createLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('ledger')
    .insert([entry])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getLedgerEntries(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// Roasted coffee inventory
export async function getRoastedInventory(userId: string): Promise<RoastedCoffee[]> {
  const { data, error } = await supabase
    .rpc('calculate_roasted_inventory', { p_user_id: userId });
  
  if (error) throw error;
  return data || [];
}

// Green coffee inventory
export async function getGreenInventory(userId: string): Promise<GreenCoffee[]> {
  const { data, error } = await supabase
    .rpc('calculate_green_inventory', { p_user_id: userId });
  
  if (error) throw error;
  return data || [];
}

// Brew history
export async function getBrewHistory(userId: string, limit = 50): Promise<BrewLog[]> {
  const { data, error } = await supabase
    .rpc('get_brew_history', { p_user_id: userId, p_limit: limit });
  
  if (error) throw error;
  return data || [];
}

// Equipment management
export async function getUserEquipment(userId: string): Promise<Equipment[]> {
  const { data, error } = await supabase
    .rpc('get_user_equipment', { p_user_id: userId });
  
  if (error) throw error;
  return data || [];
}

export async function addEquipment(equipment: Omit<Equipment, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('equipment')
    .insert([equipment])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// User preferences
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data;
}

export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert([{ user_id: userId, ...preferences }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Coffee operations
export async function logRoastCompletion({
  userId,
  coffeeName,
  roastDate,
  roastLevel,
  greenWeight,
  roastedWeight,
  roastProfile,
  notes
}: {
  userId: string;
  coffeeName: string;
  roastDate: string;
  roastLevel: string;
  greenWeight: number;
  roastedWeight: number;
  roastProfile?: any;
  notes?: string;
}) {
  const batchNumber = await getNextBatchNumber(userId);
  const weightLoss = greenWeight - roastedWeight;
  const weightLossPercentage = (weightLoss / greenWeight) * 100;
  
  // Create roasted coffee ledger entry (positive amount)
  await createLedgerEntry({
    user_id: userId,
    timestamp: new Date().toISOString(),
    action_type: 'roast_completed',
    entity_type: 'roasted_coffee',
    entity_id: crypto.randomUUID(),
    amount_change: roastedWeight,
    metadata: {
      name: coffeeName,
      roast_date: roastDate,
      roast_level: roastLevel,
      initial_amount: roastedWeight,
      green_weight: greenWeight,
      weight_loss: weightLoss,
      weight_loss_percentage: weightLossPercentage,
      batch_number: batchNumber,
      roast_profile: roastProfile,
      notes
    }
  });
  
  // Deduct from green coffee inventory (negative amount)
  await createLedgerEntry({
    user_id: userId,
    timestamp: new Date().toISOString(),
    action_type: 'roast_completed',
    entity_type: 'green_coffee',
    entity_id: crypto.randomUUID(),
    amount_change: -greenWeight,
    metadata: {
      name: coffeeName,
      roast_batch_number: batchNumber
    }
  });
}

export async function logConsumption({
  userId,
  coffeeName,
  amount,
  coffeeAgedays,
  brewMethod = 'Quick brew',
  grinderModel,
  grindSetting,
  waterTemp,
  brewTime,
  notes
}: {
  userId: string;
  coffeeName: string;
  amount: number;
  coffeeAgedays: number;
  brewMethod?: string;
  grinderModel?: string;
  grindSetting?: number;
  waterTemp?: number;
  brewTime?: string;
  notes?: string;
}) {
  return createLedgerEntry({
    user_id: userId,
    timestamp: new Date().toISOString(),
    action_type: 'consumption',
    entity_type: 'roasted_coffee',
    entity_id: crypto.randomUUID(),
    amount_change: -amount, // Negative because consuming
    metadata: {
      coffee_name: coffeeName,
      coffee_age_days: coffeeAgedays,
      brew_method: brewMethod,
      grinder_model: grinderModel,
      grind_setting: grindSetting,
      water_temp: waterTemp,
      brew_time: brewTime,
      notes
    }
  });
}

export async function addGreenCoffee({
  userId,
  name,
  amount,
  origin,
  processingMethod,
  varietal,
  farm,
  elevation
}: {
  userId: string;
  name: string;
  amount: number;
  origin?: string;
  processingMethod?: string;
  varietal?: string;
  farm?: string;
  elevation?: number;
}) {
  return createLedgerEntry({
    user_id: userId,
    timestamp: new Date().toISOString(),
    action_type: 'green_purchase',
    entity_type: 'green_coffee',
    entity_id: crypto.randomUUID(),
    amount_change: amount,
    metadata: {
      name,
      origin,
      processing_method: processingMethod,
      varietal,
      farm,
      elevation
    }
  });
}

// Utility functions
export async function getNextBatchNumber(userId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_next_batch_number', { p_user_id: userId });
  
  if (error) throw error;
  return data || 1;
}

export async function getConsumptionAnalytics(userId: string, days = 30) {
  const { data, error } = await supabase
    .rpc('get_consumption_analytics', { p_user_id: userId, p_days: days });
  
  if (error) throw error;
  return data || [];
}

// AI recommendations
export async function saveAIRecommendation({
  userId,
  recommendationType,
  inputContext,
  recommendation,
  wasHelpful,
  userFeedback
}: {
  userId: string;
  recommendationType: 'brew_recipe' | 'roast_profile' | 'extraction_troubleshoot' | 'batch_comparison';
  inputContext: any;
  recommendation: any;
  wasHelpful?: boolean;
  userFeedback?: string;
}) {
  const { data, error } = await supabase
    .from('ai_recommendations')
    .insert([{
      user_id: userId,
      recommendation_type: recommendationType,
      input_context: inputContext,
      recommendation,
      was_helpful: wasHelpful,
      user_feedback: userFeedback
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAIRecommendations(userId: string, type?: string, limit = 20) {
  let query = supabase
    .from('ai_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (type) {
    query = query.eq('recommendation_type', type);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}