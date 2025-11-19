import { supabase } from './supabase'

export interface Equipment {
  id: string
  user_id: string
  type: 'grinder' | 'roaster' | 'brewer'
  brand: string
  model: string
  settings_schema: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface EquipmentEntry {
  type: 'grinder' | 'roaster' | 'brewer'
  brand: string
  model: string
  settings_schema?: Record<string, any>
  is_active?: boolean
}

// Default equipment configurations
export const DEFAULT_EQUIPMENT: EquipmentEntry[] = [
  {
    type: 'roaster',
    brand: 'Fresh Roast',
    model: 'SR800',
    settings_schema: {
      fan_range: { min: 1, max: 9, step: 1 },
      heat_range: { min: 1, max: 3, step: 1 },
      time_range: { min: 1, max: 10, step: 0.5, unit: 'minutes' },
      batch_capacity: { min: 120, max: 240, unit: 'grams' },
      descriptions: {
        fan: {
          '1-3': 'Low airflow - for delicate beans',
          '4-6': 'Medium airflow - standard roasting',
          '7-9': 'High airflow - for dense beans'
        },
        heat: {
          '1': 'Low heat - light roasts, slow development',
          '2': 'Medium heat - balanced roasting',
          '3': 'High heat - dark roasts, fast development'
        }
      }
    },
    is_active: true
  },
  {
    type: 'grinder',
    brand: 'OXO',
    model: '8717000',
    settings_schema: {
      dial_range: { min: 1, max: 15, step: 0.5 },
      descriptions: {
        '1-5.5': 'Fine (espresso to pour-over fine)',
        '5.5-10.5': 'Medium (standard pour-over)',
        '10.5-15': 'Coarse (French press to cold brew)'
      },
      recommendations: {
        'espresso': { setting: 3, description: 'Fine espresso grind' },
        'v60': { setting: 7, description: 'Medium-fine pour-over' },
        'chemex': { setting: 9, description: 'Medium-coarse filter' },
        'french_press': { setting: 13, description: 'Coarse immersion' }
      }
    },
    is_active: true
  },
  {
    type: 'brewer',
    brand: 'Hario',
    model: 'V60 Switch (Size 3)',
    settings_schema: {
      capacity: { max: 600, unit: 'ml' },
      modes: ['pour_over', 'immersion', 'hybrid'],
      recommended_ratios: {
        'standard': { coffee: 20, water: 300, ratio: '1:15' },
        'strong': { coffee: 25, water: 300, ratio: '1:12' },
        'light': { coffee: 18, water: 300, ratio: '1:17' }
      },
      brew_methods: {
        'pour_over': 'Traditional V60 pour-over technique',
        'immersion': 'Switch closed for full immersion',
        'hybrid': 'Combination of immersion and pour-over'
      }
    },
    is_active: true
  }
]

// Create equipment entry using ledger
export async function createEquipment(entry: EquipmentEntry): Promise<Equipment | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Insert directly into equipment table
    const { data, error } = await supabase
      .from('equipment')
      .insert([{
        user_id: user.id,
        type: entry.type,
        brand: entry.brand,
        model: entry.model,
        settings_schema: entry.settings_schema || {},
        is_active: entry.is_active !== false
      }])
      .select()
      .single()

    if (error) throw error

    console.log('Equipment created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating equipment:', error)
    return null
  }
}

// Update equipment
export async function updateEquipment(equipmentId: string, updates: Partial<EquipmentEntry>): Promise<Equipment | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', equipmentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating equipment:', error)
    return null
  }
}

// Delete equipment (soft delete by marking inactive)
export async function deleteEquipment(equipmentId: string): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('equipment')
      .update({ is_active: false })
      .eq('id', equipmentId)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return false
  }
}

// Get user equipment
export async function getUserEquipment(): Promise<Equipment[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('type', { ascending: true })
      .order('brand', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting user equipment:', error)
    return []
  }
}

// Get equipment by type
export async function getEquipmentByType(type: 'grinder' | 'roaster' | 'brewer'): Promise<Equipment[]> {
  try {
    const allEquipment = await getUserEquipment()
    return allEquipment.filter(eq => eq.type === type)
  } catch (error) {
    console.error('Error getting equipment by type:', error)
    return []
  }
}

// Initialize default equipment for new user
export async function initializeDefaultEquipment(): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Check if user already has equipment
    const existingEquipment = await getUserEquipment()
    if (existingEquipment.length > 0) {
      console.log('User already has equipment, skipping initialization')
      return true
    }

    // Create default equipment
    const promises = DEFAULT_EQUIPMENT.map(equipment => createEquipment(equipment))
    const results = await Promise.all(promises)

    const successCount = results.filter(result => result !== null).length
    console.log(`Initialized ${successCount}/${DEFAULT_EQUIPMENT.length} default equipment items`)

    return successCount === DEFAULT_EQUIPMENT.length
  } catch (error) {
    console.error('Error initializing default equipment:', error)
    return false
  }
}

// Get equipment settings helper
export function getEquipmentSettings(equipment: Equipment, settingKey: string): any {
  return equipment.settings_schema[settingKey] || null
}

// Get equipment recommendations
export function getEquipmentRecommendations(equipment: Equipment, brewMethod?: string): any {
  if (equipment.type !== 'grinder' || !brewMethod) return null
  
  const recommendations = equipment.settings_schema.recommendations
  return recommendations ? recommendations[brewMethod] : null
}

// Validate equipment setting value
export function validateEquipmentSetting(equipment: Equipment, settingKey: string, value: number): boolean {
  const setting = equipment.settings_schema[settingKey]
  if (!setting) return true

  if (setting.min !== undefined && value < setting.min) return false
  if (setting.max !== undefined && value > setting.max) return false

  return true
}

// Get default equipment for type
export function getDefaultEquipmentForType(type: 'grinder' | 'roaster' | 'brewer'): EquipmentEntry | null {
  return DEFAULT_EQUIPMENT.find(eq => eq.type === type) || null
}