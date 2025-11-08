import { supabase } from './supabase'

export interface LedgerEntry {
  id: string
  user_id: string
  timestamp: string
  action_type: 'green_purchase' | 'roast_completed' | 'consumption' | 'brew_logged' | 'inventory_adjustment'
  entity_type: 'green_coffee' | 'roasted_coffee' | 'equipment' | 'brew_session'
  entity_id: string
  quantity: number
  unit: string
  metadata: Record<string, any>
  balance_after: number | null
  created_at: string
}

export interface RoastCompletedEntry {
  name: string
  green_coffee_name: string
  roast_date: string
  roast_level: 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark'
  green_weight: number
  roasted_weight: number
  batch_number: number
  roast_notes?: string
  equipment_id: string
  roast_profile?: Record<string, any>
}

export interface ConsumptionEntry {
  coffee_name: string
  amount: number
  consumption_type: 'brew' | 'gift' | 'sample' | 'waste'
  notes?: string
}

export interface GreenPurchaseEntry {
  name: string
  origin: string
  farm?: string
  variety?: string
  process?: string
  weight: number
  cost?: number
  purchase_date: string
  supplier?: string
  notes?: string
}

export interface BrewLogEntry {
  coffee_name: string
  brew_method: string
  coffee_amount: number
  water_amount: number
  grind_setting?: string
  brew_time?: number
  water_temp?: number
  rating?: number
  notes?: string
  equipment_id?: string
}

// Generate unique entity ID for coffee batches
function generateCoffeeEntityId(userId: string, name: string, batchNumber: number): string {
  return `${userId}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_batch_${batchNumber}`
}

// Generate unique entity ID for green coffee
function generateGreenCoffeeEntityId(userId: string, name: string): string {
  return `${userId}_green_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
}

// Create a roast completion ledger entry
export async function createRoastCompletedEntry(entry: RoastCompletedEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get next batch number if not provided
    let batchNumber = entry.batch_number
    if (!batchNumber) {
      const { data: nextBatch, error: batchError } = await supabase
        .rpc('get_next_batch_number', { p_user_id: user.id })
      
      if (batchError) throw batchError
      batchNumber = nextBatch || 1
    }

    const entityId = generateCoffeeEntityId(user.id, entry.name, batchNumber)

    // Create the ledger entry
    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'roast_completed',
        entity_type: 'roasted_coffee',
        entity_id: entityId,
        quantity: entry.roasted_weight,
        unit: 'grams',
        metadata: {
          name: entry.name,
          green_coffee_name: entry.green_coffee_name,
          roast_date: entry.roast_date,
          roast_level: entry.roast_level,
          green_weight: entry.green_weight,
          roasted_weight: entry.roasted_weight,
          batch_number: batchNumber,
          roast_notes: entry.roast_notes,
          equipment_id: entry.equipment_id,
          roast_profile: entry.roast_profile,
          weight_loss_pct: ((entry.green_weight - entry.roasted_weight) / entry.green_weight * 100).toFixed(2)
        },
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error

    // Also create a consumption entry for the green coffee used
    await createGreenCoffeeConsumptionEntry({
      coffee_name: entry.green_coffee_name,
      amount: entry.green_weight,
      consumption_type: 'brew',
      notes: `Used for roasting ${entry.name} batch ${batchNumber}`
    })

    return data
  } catch (error) {
    console.error('Error creating roast completed entry:', error)
    return null
  }
}

// Create a consumption ledger entry
export async function createConsumptionEntry(entry: ConsumptionEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const entityId = `${user.id}_${entry.coffee_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_consumption`

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'consumption',
        entity_type: 'roasted_coffee',
        entity_id: entityId,
        quantity: -entry.amount, // Negative for consumption
        unit: 'grams',
        metadata: {
          coffee_name: entry.coffee_name,
          consumption_type: entry.consumption_type,
          notes: entry.notes
        },
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating consumption entry:', error)
    return null
  }
}

// Create a green coffee consumption entry (for roasting)
async function createGreenCoffeeConsumptionEntry(entry: ConsumptionEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const entityId = generateGreenCoffeeEntityId(user.id, entry.coffee_name)

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'consumption',
        entity_type: 'green_coffee',
        entity_id: entityId,
        quantity: -entry.amount, // Negative for consumption
        unit: 'grams',
        metadata: {
          coffee_name: entry.coffee_name,
          consumption_type: entry.consumption_type,
          notes: entry.notes
        },
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating green coffee consumption entry:', error)
    return null
  }
}

// Create a green coffee purchase ledger entry
export async function createGreenPurchaseEntry(entry: GreenPurchaseEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const entityId = generateGreenCoffeeEntityId(user.id, entry.name)

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'green_purchase',
        entity_type: 'green_coffee',
        entity_id: entityId,
        quantity: entry.weight,
        unit: 'grams',
        metadata: {
          name: entry.name,
          origin: entry.origin,
          farm: entry.farm,
          variety: entry.variety,
          process: entry.process,
          cost: entry.cost,
          purchase_date: entry.purchase_date,
          supplier: entry.supplier,
          notes: entry.notes
        },
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating green purchase entry:', error)
    return null
  }
}

// Create a brew log ledger entry
export async function createBrewLogEntry(entry: BrewLogEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const entityId = `${user.id}_brew_${Date.now()}`

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'brew_logged',
        entity_type: 'brew_session',
        entity_id: entityId,
        quantity: entry.coffee_amount,
        unit: 'grams',
        metadata: {
          coffee_name: entry.coffee_name,
          brew_method: entry.brew_method,
          coffee_amount: entry.coffee_amount,
          water_amount: entry.water_amount,
          grind_setting: entry.grind_setting,
          brew_time: entry.brew_time,
          water_temp: entry.water_temp,
          rating: entry.rating,
          notes: entry.notes,
          equipment_id: entry.equipment_id,
          brew_ratio: (entry.water_amount / entry.coffee_amount).toFixed(1)
        },
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error

    // Also create a consumption entry for the coffee used
    await createConsumptionEntry({
      coffee_name: entry.coffee_name,
      amount: entry.coffee_amount,
      consumption_type: 'brew',
      notes: `${entry.brew_method} brew`
    })

    return data
  } catch (error) {
    console.error('Error creating brew log entry:', error)
    return null
  }
}

// Get ledger entries for a user
export async function getLedgerEntries(limit: number = 50, offset: number = 0): Promise<LedgerEntry[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting ledger entries:', error)
    return []
  }
}

// Get current inventory using the database function
export async function getCurrentInventory() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: roasted, error: roastedError } = await supabase
      .rpc('calculate_roasted_inventory', { p_user_id: user.id })

    const { data: green, error: greenError } = await supabase
      .rpc('calculate_green_inventory', { p_user_id: user.id })

    if (roastedError) throw roastedError
    if (greenError) throw greenError

    return {
      roasted: roasted || [],
      green: green || []
    }
  } catch (error) {
    console.error('Error getting current inventory:', error)
    return { roasted: [], green: [] }
  }
}