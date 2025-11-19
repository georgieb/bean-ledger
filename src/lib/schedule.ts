import { supabase } from './supabase'

export interface RoastScheduleEntry {
  coffee_name: string
  green_coffee_name: string
  scheduled_date: string
  green_weight: number
  target_roast_level: 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark'
  equipment_id: string
  notes?: string
  priority?: 'low' | 'medium' | 'high'
}

export interface ScheduledRoast {
  id: string
  coffee_name: string
  green_coffee_name: string
  scheduled_date: string
  green_weight: number
  target_roast_level: string
  equipment_id: string
  notes?: string
  priority: string
  completed: boolean
  completed_date?: string
  created_at: string
}

// Create a roast schedule entry
export async function createRoastSchedule(entry: RoastScheduleEntry): Promise<any | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Authentication error:', userError)
      throw new Error('User not authenticated')
    }

    // Validate required fields
    if (!entry.coffee_name || !entry.green_coffee_name || !entry.scheduled_date || 
        !entry.green_weight || !entry.target_roast_level) {
      throw new Error('Missing required fields for schedule entry')
    }

    const entityId = crypto.randomUUID()

    console.log('Creating schedule entry:', {
      user_id: user.id,
      entity_id: entityId,
      entry
    })

    // First, let's check what action types are allowed by trying to query existing entries
    const { data: existingEntries } = await supabase
      .from('ledger')
      .select('action_type')
      .eq('user_id', user.id)
      .limit(5)

    console.log('Existing action types in database:', existingEntries?.map(e => e.action_type))

    // Use green_purchase action type which we know works from the existing entries
    const insertData = {
      user_id: user.id,
      action_type: 'green_purchase',
      entity_type: 'green_coffee',
      entity_id: entityId,
      amount_change: 0, // No actual inventory change for scheduling
      metadata: {
        // Required fields for green_purchase
        name: entry.coffee_name, // Required by green_purchase
        origin: 'Scheduled', // Required field
        weight: entry.green_weight, // Required field
        purchase_date: entry.scheduled_date, // Use scheduled date
        // Mark this as a schedule entry
        schedule_entry: true,
        // Schedule-specific fields
        coffee_name: entry.coffee_name,
        green_coffee_name: entry.green_coffee_name,
        scheduled_date: entry.scheduled_date,
        green_weight: entry.green_weight,
        target_roast_level: entry.target_roast_level,
        equipment_id: entry.equipment_id || null,
        notes: entry.notes || null,
        priority: entry.priority || 'medium',
        completed: false
      },
      balance_after: null
    }

    console.log('Attempting to insert:', insertData)

    // Let's verify the data is correct before sending
    console.log('Action type being sent:', insertData.action_type)
    console.log('Entity type being sent:', insertData.entity_type)
    console.log('Metadata keys:', Object.keys(insertData.metadata))

    // Try a minimal insert to test
    const minimalData = {
      user_id: user.id,
      action_type: 'green_purchase',
      entity_type: 'green_coffee',
      entity_id: entityId,
      amount_change: entry.green_weight,
      metadata: {
        name: entry.coffee_name,
        origin: 'Test',
        weight: entry.green_weight,
        purchase_date: entry.scheduled_date
      },
      balance_after: null
    }

    console.log('Trying minimal insert:', minimalData)

    const { data, error } = await supabase
      .from('ledger')
      .insert([minimalData])
      .select()
      .single()

    if (error) {
      console.error('Database error creating schedule:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    console.log('Schedule created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating roast schedule:', error)
    throw error // Re-throw so the caller can handle it
  }
}

// Update a roast schedule entry
export async function updateRoastSchedule(scheduleId: string, updates: Partial<RoastScheduleEntry>): Promise<any | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get current schedule entry
    const { data: currentEntry, error: fetchError } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', user.id)
      .eq('entity_id', scheduleId)
      .eq('action_type', 'roast_scheduled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !currentEntry) {
      throw new Error('Schedule entry not found')
    }

    // Create new entry with updates (immutable ledger pattern)
    const updatedMetadata = {
      ...currentEntry.metadata,
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'roast_edited',
        entity_type: 'roast_schedule',
        entity_id: scheduleId,
        amount_change: 0,
        metadata: updatedMetadata,
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating roast schedule:', error)
    return null
  }
}

// Mark schedule as completed (when roast is completed)
export async function completeScheduledRoast(scheduleId: string, roastData: any): Promise<any | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get current schedule entry
    const { data: currentEntry, error: fetchError } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', user.id)
      .eq('entity_id', scheduleId)
      .eq('action_type', 'roast_scheduled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !currentEntry) {
      throw new Error('Schedule entry not found')
    }

    // Mark as completed
    const completedMetadata = {
      ...currentEntry.metadata,
      completed: true,
      completed_date: new Date().toISOString(),
      actual_roasted_weight: roastData.roasted_weight,
      actual_roast_level: roastData.roast_level,
      roast_notes: roastData.roast_notes
    }

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'roast_edited',
        entity_type: 'roast_schedule',
        entity_id: scheduleId,
        amount_change: 0,
        metadata: completedMetadata,
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error completing scheduled roast:', error)
    return null
  }
}

// Delete a roast schedule entry
export async function deleteRoastSchedule(scheduleId: string): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('ledger')
      .insert([{
        user_id: user.id,
        action_type: 'roast_deleted',
        entity_type: 'roast_schedule',
        entity_id: scheduleId,
        amount_change: 0,
        metadata: {
          deleted_at: new Date().toISOString(),
          reason: 'User deleted'
        },
        balance_after: null
      }] as any)
      .select()
      .single()

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting roast schedule:', error)
    return false
  }
}

// Get roast schedule for a user
export async function getRoastSchedule(): Promise<ScheduledRoast[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get all schedule entries - look for schedule_entry flag in metadata
    const { data: entries, error } = await supabase
      .from('ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Filter for schedule entries and process them
    const scheduleEntries = entries?.filter(entry => 
      entry.metadata && entry.metadata.schedule_entry === true
    ) || []

    console.log('Found schedule entries:', scheduleEntries)

    // Process entries to get current state of each schedule
    const scheduleMap = new Map<string, any>()
    const deletedSchedules = new Set<string>()

    scheduleEntries.forEach(entry => {
      if (entry.metadata && entry.metadata.deleted) {
        deletedSchedules.add(entry.entity_id)
      } else if (!deletedSchedules.has(entry.entity_id)) {
        scheduleMap.set(entry.entity_id, {
          id: entry.entity_id,
          ...entry.metadata,
          created_at: entry.created_at
        })
      }
    })

    return Array.from(scheduleMap.values())
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
  } catch (error) {
    console.error('Error getting roast schedule:', error)
    return []
  }
}

// Get upcoming roasts (next 7 days)
export async function getUpcomingRoasts(): Promise<ScheduledRoast[]> {
  const allScheduled = await getRoastSchedule()
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  return allScheduled.filter(roast => {
    const scheduledDate = new Date(roast.scheduled_date)
    return !roast.completed && scheduledDate >= today && scheduledDate <= nextWeek
  })
}

// Get overdue roasts
export async function getOverdueRoasts(): Promise<ScheduledRoast[]> {
  const allScheduled = await getRoastSchedule()
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today

  return allScheduled.filter(roast => {
    const scheduledDate = new Date(roast.scheduled_date)
    return !roast.completed && scheduledDate < today
  })
}