import { supabase } from './supabase'

export interface LedgerEntry {
  id: string
  user_id: string
  timestamp: string
  action_type: 'green_purchase' | 'roast_completed' | 'consumption' | 'brew_logged' | 'green_adjustment' | 'roasted_adjustment'
  entity_type: 'green_coffee' | 'roasted_coffee' | 'equipment' | 'brew_session'
  entity_id: string
  amount_change: number
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

export interface GreenAdjustmentEntry {
  coffee_name: string
  old_amount: number
  new_amount: number
  reason: 'physical_count' | 'spillage' | 'shrinkage' | 'found' | 'other'
  notes?: string
}

export interface RoastedAdjustmentEntry {
  coffee_name: string
  old_amount: number
  new_amount: number
  reason: 'physical_count' | 'spillage' | 'stale' | 'found' | 'other'
  notes?: string
}

// Generate unique entity ID for coffee batches using crypto
function generateCoffeeEntityId(userId: string, name: string, batchNumber: number): string {
  return crypto.randomUUID()
}

// Generate unique entity ID for green coffee using crypto
function generateGreenCoffeeEntityId(userId: string, name: string): string {
  return crypto.randomUUID()
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
      const { data: nextBatch, error: batchError } = await (supabase as any)
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
        amount_change: entry.roasted_weight,
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

    // Find the entity_id for this roasted coffee by looking up the roast_completed entry
    const { data: roastEntry, error: roastError } = await supabase
      .from('ledger')
      .select('entity_id')
      .eq('user_id', user.id)
      .eq('action_type', 'roast_completed')
      .eq('entity_type', 'roasted_coffee')
      .ilike('metadata->>name', entry.coffee_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (roastError || !roastEntry) {
      throw new Error(`Could not find roasted coffee "${entry.coffee_name}" to consume from`)
    }

    const entityId = roastEntry.entity_id

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'consumption',
        entity_type: 'roasted_coffee',
        entity_id: entityId,
        amount_change: -entry.amount, // Negative for consumption
        metadata: {
          name: entry.coffee_name,
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
        amount_change: -entry.amount, // Negative for consumption
        metadata: {
          name: entry.coffee_name,
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
        amount_change: entry.weight,
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

    const entityId = crypto.randomUUID()

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'brew_logged',
        entity_type: 'brew_session',
        entity_id: entityId,
        amount_change: entry.coffee_amount,
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

    const { data: roasted, error: roastedError } = await (supabase as any)
      .rpc('calculate_roasted_inventory', { p_user_id: user.id })

    // Use manual calculation instead of broken database function
    const { data: greenEntries, error: greenError } = await supabase
      .from('ledger')
      .select('metadata, amount_change')
      .eq('user_id', user.id)
      .eq('entity_type', 'green_coffee')
      .in('action_type', ['green_purchase', 'consumption'])
      .order('created_at', { ascending: true })
    
    const greenMap = new Map()
    greenEntries?.forEach(entry => {
      const name = entry.metadata?.name
      if (name) {
        const current = greenMap.get(name) || { current_amount: 0, ...entry.metadata }
        current.current_amount += entry.amount_change || 0
        greenMap.set(name, current)
      }
    })
    
    const green = Array.from(greenMap.values()).filter(coffee => coffee.current_amount > 0)

    if (roastedError) throw roastedError
    if (greenError) throw greenError

    // Transform roasted coffee data to match expected interface
    const transformedRoasted = (roasted || []).map((coffee: any) => ({
      ...coffee,
      coffee_name: coffee.name,
      display_name: coffee.name,
      days_since_roast: coffee.roast_date 
        ? Math.floor((Date.now() - new Date(coffee.roast_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    }))

    // Transform green coffee data to match expected interface  
    const transformedGreen = (green || []).map((coffee: any) => ({
      ...coffee,
      coffee_name: coffee.name,
      display_name: coffee.name.includes('(Corrected ') 
        ? coffee.name.replace(/ \(Corrected \d+\)$/, '')
        : coffee.name
    }))

    // Filter out superseded coffee entries - only show the latest version of each coffee
    const coffeeGroups = transformedGreen.reduce((groups: any, coffee: any) => {
      let baseName: string
      let timestamp = 0
      
      if (coffee.coffee_name.includes('(Corrected ')) {
        // Extract base name and timestamp from corrected coffee
        const match = coffee.coffee_name.match(/^(.+) \(Corrected (\d+)\)$/)
        if (match) {
          baseName = match[1]
          timestamp = parseInt(match[2])
        } else {
          baseName = coffee.coffee_name
        }
      } else {
        baseName = coffee.coffee_name
      }
      
      if (!groups[baseName] || timestamp > groups[baseName].timestamp) {
        groups[baseName] = { coffee, timestamp }
      }
      
      return groups
    }, {})
    
    const filteredGreen = Object.values(coffeeGroups).map((group: any) => group.coffee)

    return {
      roasted: transformedRoasted,
      green: filteredGreen
    }
  } catch (error) {
    console.error('Error getting current inventory:', error)
    return { roasted: [], green: [] }
  }
}

// Create a green coffee inventory adjustment entry
export async function createGreenAdjustmentEntry(entry: GreenAdjustmentEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const amountDiff = entry.new_amount - entry.old_amount

    console.log('🔧 Creating green adjustment entry:', {
      coffee_name: entry.coffee_name,
      old_amount: entry.old_amount,
      new_amount: entry.new_amount,
      amountDiff
    })

    if (amountDiff > 0) {
      // Positive adjustment - add more green coffee (use same entity ID as original)
      const entityId = generateGreenCoffeeEntityId(user.id, entry.coffee_name)
      
      const { data, error } = await supabase
        .from('ledger')
        .insert([{
          user_id: user.id,
          action_type: 'green_purchase',
          entity_type: 'green_coffee',
          entity_id: entityId,
          amount_change: amountDiff,
          metadata: {
            name: entry.coffee_name,
            origin: entry.coffee_name.includes('Kenya') ? 'Kenya' : 
                   entry.coffee_name.includes('Honduras') ? 'Honduras' : 
                   entry.coffee_name.includes('Colombia') ? 'Colombia' : 'Unknown',
            weight: amountDiff,
            purchase_date: new Date().toISOString().split('T')[0],
            supplier: 'Inventory Adjustment',
            notes: `${entry.reason}: Found ${amountDiff}g more than expected`,
            adjustment_type: 'inventory_adjustment',
            old_amount: entry.old_amount,
            new_amount: entry.new_amount,
            reason: entry.reason
          },
          balance_after: null
        }] as any)
        .select()
        .single()

      if (error) {
        console.error('❌ Database error (positive):', error)
        throw error
      }
      
      console.log('✅ Green adjustment entry created (positive):', data)
      return data

    } else {
      // SOLUTION: Since database ignores negative amounts, create a NEW coffee with a different name
      // that represents the corrected amount, and mark the old one as "superseded"
      
      console.log(`💡 SOLUTION: Database ignores negative amounts. Creating replacement coffee.`)
      
      // Get original coffee metadata to preserve origin info
      const baseCoffeeName = entry.coffee_name.replace(/ \(Corrected \d+\)$/, '')
      console.log(`🔍 Looking for original coffee: "${baseCoffeeName}"`)
      
      const { data: originalCoffee, error: origError } = await supabase
        .from('ledger')
        .select('metadata')
        .eq('user_id', user.id)
        .eq('entity_type', 'green_coffee')
        .eq('action_type', 'green_purchase')
        .eq('metadata->>name', baseCoffeeName)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      
      if (origError) {
        console.warn('⚠️ Could not find original coffee:', origError)
      }
      
      console.log(`📝 Found original coffee metadata:`, originalCoffee?.metadata)
      
      const originalOrigin = originalCoffee?.metadata?.origin || baseCoffeeName.split(' ')[0] || 'Unknown'
      const originalFarm = originalCoffee?.metadata?.farm || null
      const originalVariety = originalCoffee?.metadata?.variety || null
      const originalProcess = originalCoffee?.metadata?.process || null
      
      console.log(`🌍 Using origin: "${originalOrigin}"`)
      
      // Check if this is already a corrected coffee
      const isAlreadyCorrected = entry.coffee_name.includes('(Corrected ')
      
      let newCoffeeName: string
      let entityId: string
      
      if (isAlreadyCorrected) {
        // If adjusting an already corrected coffee, reuse the same name and entity
        newCoffeeName = entry.coffee_name
        entityId = generateGreenCoffeeEntityId(user.id, newCoffeeName)
        console.log(`🔄 Updating existing corrected coffee: ${newCoffeeName}`)
      } else {
        // First time correction - create new corrected coffee
        const timestamp = Date.now()
        newCoffeeName = `${entry.coffee_name} (Corrected ${timestamp})`
        entityId = generateGreenCoffeeEntityId(user.id, newCoffeeName)
        console.log(`🆕 Creating new corrected coffee: ${newCoffeeName}`)
      }
      
      // Create new coffee with correct amount
      const { data, error } = await supabase
        .from('ledger')
        .insert([{
          user_id: user.id,
          action_type: 'green_purchase',
          entity_type: 'green_coffee',
          entity_id: entityId,
          amount_change: entry.new_amount, // Exact target amount
          metadata: {
            name: newCoffeeName,
            origin: originalOrigin,
            farm: originalFarm,
            variety: originalVariety,
            process: originalProcess,
            weight: entry.new_amount,
            cost: null,
            purchase_date: new Date().toISOString().split('T')[0],
            supplier: 'Inventory Correction',
            notes: `Corrected amount via ${entry.reason} - Physical count shows ${entry.new_amount}g (was ${entry.old_amount}g)`,
            original_coffee: entry.coffee_name,
            correction_type: 'replacement',
            adjustment_reason: entry.reason
          },
          balance_after: null
        }] as any)
        .select()
        .single()

      if (error) {
        console.error('❌ Database error (replacement):', error)
        throw error
      }
      
      // Mark original coffee as superseded by creating a note entry
      const noteEntityId = generateGreenCoffeeEntityId(user.id, `${entry.coffee_name}_superseded_${timestamp}`)
      await supabase
        .from('ledger')
        .insert([{
          user_id: user.id,
          action_type: 'green_purchase',
          entity_type: 'green_coffee',
          entity_id: noteEntityId,
          amount_change: 0, // Zero amount note
          metadata: {
            name: `${entry.coffee_name} (SUPERSEDED)`,
            origin: 'Superseded Notice',
            weight: 0,
            purchase_date: new Date().toISOString().split('T')[0],
            supplier: 'System',
            notes: `This coffee has been superseded by "${newCoffeeName}" due to physical count adjustment`,
            superseded: true,
            replacement_coffee: newCoffeeName
          },
          balance_after: null
        }] as any)

      console.log(`✅ Created replacement coffee: "${newCoffeeName}" with ${entry.new_amount}g`)
      console.log(`📝 Original coffee "${entry.coffee_name}" marked as superseded`)
      
      return data
    }
  } catch (error) {
    console.error('Error creating green adjustment entry:', error)
    return null
  }
}

// Create a roasted coffee inventory adjustment entry
export async function createRoastedAdjustmentEntry(entry: RoastedAdjustmentEntry): Promise<LedgerEntry | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const amountDiff = entry.new_amount - entry.old_amount

    console.log('🔧 Creating roasted adjustment entry:', {
      coffee_name: entry.coffee_name,
      old_amount: entry.old_amount,
      new_amount: entry.new_amount,
      amountDiff,
      isIncrease: amountDiff > 0
    })

    if (amountDiff > 0) {
      // Positive adjustment - create a new roast entry
      const entityId = crypto.randomUUID()
      const { data, error } = await supabase
        .from('ledger')
        .insert([{
          user_id: user.id,
          action_type: 'roast_completed',
          entity_type: 'roasted_coffee',
          entity_id: entityId,
          amount_change: amountDiff,
          metadata: {
            name: entry.coffee_name,
            green_coffee_name: entry.coffee_name.replace(' (Adjustment)', ''),
            roast_date: new Date().toISOString().split('T')[0],
            roast_level: 'medium',
            green_weight: Math.round(amountDiff * 1.2), // Fake green weight
            roasted_weight: amountDiff,
            batch_number: 99999, // Special batch number for adjustments
            roast_notes: `Physical count adjustment - ${entry.reason}`,
            equipment_id: 'adjustment',
            adjustment_type: 'inventory_adjustment',
            old_amount: entry.old_amount,
            new_amount: entry.new_amount,
            reason: entry.reason,
            notes: entry.notes
          },
          balance_after: null
        }] as any)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Negative adjustment - find existing roast and create consumption
      const { data: roastEntry, error: roastError } = await supabase
        .from('ledger')
        .select('entity_id')
        .eq('user_id', user.id)
        .eq('action_type', 'roast_completed')
        .eq('entity_type', 'roasted_coffee')
        .ilike('metadata->>name', entry.coffee_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (roastError || !roastEntry) {
        throw new Error(`Could not find roasted coffee "${entry.coffee_name}" to adjust`)
      }

      const entityId = roastEntry.entity_id
      const { data, error } = await supabase
        .from('ledger')
        .insert([{
          user_id: user.id,
          action_type: 'consumption',
          entity_type: 'roasted_coffee',
          entity_id: entityId,
          amount_change: amountDiff, // This will be negative
          metadata: {
            coffee_name: entry.coffee_name,
            amount: Math.abs(amountDiff),
            consumption_type: 'adjustment',
            notes: `Physical count adjustment - ${entry.reason}: ${entry.notes || `Decrease of ${Math.abs(amountDiff)}g`}`,
            adjustment_type: 'inventory_adjustment',
            old_amount: entry.old_amount,
            new_amount: entry.new_amount,
            reason: entry.reason
          },
          balance_after: null
        }] as any)
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (error) {
    console.error('Error creating roasted adjustment entry:', error)
    return null
  }
}