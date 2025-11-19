// Temporary local storage-based schedule system
// This works around database constraint issues while we debug

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

const STORAGE_KEY = 'bean-ledger-schedule'

// Get schedules from localStorage
function getStoredSchedules(): ScheduledRoast[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading schedules from localStorage:', error)
    return []
  }
}

// Save schedules to localStorage
function saveSchedules(schedules: ScheduledRoast[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
  } catch (error) {
    console.error('Error saving schedules to localStorage:', error)
  }
}

// Create a roast schedule entry
export async function createRoastSchedule(entry: RoastScheduleEntry): Promise<any | null> {
  try {
    const schedules = getStoredSchedules()
    
    const newSchedule: ScheduledRoast = {
      id: crypto.randomUUID(),
      coffee_name: entry.coffee_name,
      green_coffee_name: entry.green_coffee_name,
      scheduled_date: entry.scheduled_date,
      green_weight: entry.green_weight,
      target_roast_level: entry.target_roast_level,
      equipment_id: entry.equipment_id,
      notes: entry.notes,
      priority: entry.priority || 'medium',
      completed: false,
      created_at: new Date().toISOString()
    }

    schedules.push(newSchedule)
    saveSchedules(schedules)

    console.log('Schedule created successfully (localStorage):', newSchedule)
    return newSchedule
  } catch (error) {
    console.error('Error creating roast schedule:', error)
    throw error
  }
}

// Update a roast schedule entry
export async function updateRoastSchedule(scheduleId: string, updates: Partial<RoastScheduleEntry>): Promise<any | null> {
  try {
    const schedules = getStoredSchedules()
    const index = schedules.findIndex(s => s.id === scheduleId)
    
    if (index === -1) {
      throw new Error('Schedule entry not found')
    }

    schedules[index] = {
      ...schedules[index],
      ...updates
    }

    saveSchedules(schedules)
    return schedules[index]
  } catch (error) {
    console.error('Error updating roast schedule:', error)
    return null
  }
}

// Mark schedule as completed
export async function completeScheduledRoast(scheduleId: string, roastData: any): Promise<any | null> {
  try {
    const schedules = getStoredSchedules()
    const index = schedules.findIndex(s => s.id === scheduleId)
    
    if (index === -1) {
      throw new Error('Schedule entry not found')
    }

    schedules[index] = {
      ...schedules[index],
      completed: true,
      completed_date: new Date().toISOString()
    }

    saveSchedules(schedules)
    return schedules[index]
  } catch (error) {
    console.error('Error completing scheduled roast:', error)
    return null
  }
}

// Delete a roast schedule entry
export async function deleteRoastSchedule(scheduleId: string): Promise<boolean> {
  try {
    const schedules = getStoredSchedules()
    const filteredSchedules = schedules.filter(s => s.id !== scheduleId)
    
    if (filteredSchedules.length === schedules.length) {
      throw new Error('Schedule entry not found')
    }

    saveSchedules(filteredSchedules)
    return true
  } catch (error) {
    console.error('Error deleting roast schedule:', error)
    return false
  }
}

// Get roast schedule for a user
export async function getRoastSchedule(): Promise<ScheduledRoast[]> {
  try {
    const schedules = getStoredSchedules()
    return schedules.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
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