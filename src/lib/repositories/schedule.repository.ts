import { supabase } from '@/lib/supabase'

export interface RoastScheduleEntry {
  coffee_name: string
  green_coffee_name: string
  scheduled_date: string
  green_weight: number
  target_roast_level: 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark'
  equipment_id?: string
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
  equipment_id?: string
  notes?: string
  priority: string
  completed: boolean
  completed_date?: string
  created_at: string
  updated_at?: string
}

// Helper function to get auth header
async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No authentication token')
  }
  return `Bearer ${session.access_token}`
}

// Create a roast schedule entry
export async function createRoastSchedule(entry: RoastScheduleEntry): Promise<ScheduledRoast> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch('/api/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(entry)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create scheduled roast')
  }

  return response.json()
}

// Update a roast schedule entry
export async function updateRoastSchedule(scheduleId: string, updates: Partial<RoastScheduleEntry>): Promise<ScheduledRoast> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch(`/api/schedule/${scheduleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update scheduled roast')
  }

  return response.json()
}

// Mark schedule as completed (when roast is completed)
export async function completeScheduledRoast(scheduleId: string, roastData?: any): Promise<ScheduledRoast> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch(`/api/schedule/${scheduleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({ roastData })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to complete scheduled roast')
  }

  return response.json()
}

// Delete a roast schedule entry
export async function deleteRoastSchedule(scheduleId: string): Promise<void> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch(`/api/schedule/${scheduleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete scheduled roast')
  }
}

// Get roast schedule for a user
export async function getRoastSchedule(): Promise<ScheduledRoast[]> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch('/api/schedule', {
    headers: {
      'Authorization': authHeader
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch scheduled roasts')
  }

  return response.json()
}

// Get upcoming roasts (next 7 days)
export async function getUpcomingRoasts(): Promise<ScheduledRoast[]> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch('/api/schedule?filter=upcoming', {
    headers: {
      'Authorization': authHeader
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch upcoming roasts')
  }

  return response.json()
}

// Get overdue roasts
export async function getOverdueRoasts(): Promise<ScheduledRoast[]> {
  const authHeader = await getAuthHeader()
  
  const response = await fetch('/api/schedule?filter=overdue', {
    headers: {
      'Authorization': authHeader
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch overdue roasts')
  }

  return response.json()
}