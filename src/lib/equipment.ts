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

// Grinder-specific configurations
export const GRINDER_CONFIGURATIONS: Record<string, any> = {
  'Commandante C40': {
    grind_range: { min: 5, max: 40, step: 1, unit: 'clicks' },
    descriptions: {
      '5-15': 'Espresso range - very fine',
      '15-25': 'Pour-over range - medium-fine to medium',
      '25-35': 'French press range - coarse',
      '35-40': 'Cold brew range - very coarse'
    },
    recommendations: {
      'Espresso': { setting: 10, description: 'Fine espresso grind' },
      'Hario V60': { setting: 20, description: 'Medium-fine pour-over' },
      'Hario Switch': { setting: 22, description: 'Medium for hybrid brewing' },
      'Kalita Wave': { setting: 24, description: 'Medium for flat-bottom dripper' },
      'Chemex': { setting: 28, description: 'Medium-coarse for thick filters' },
      'French Press': { setting: 32, description: 'Coarse for immersion' },
      'AeroPress': { setting: 18, description: 'Medium-fine for pressure brewing' },
      'Moka Pot': { setting: 16, description: 'Fine for stovetop espresso' }
    }
  },
  'Baratza Encore': {
    grind_range: { min: 1, max: 40, step: 1, unit: 'setting' },
    descriptions: {
      '1-14': 'Fine - espresso to fine drip',
      '15-25': 'Medium - standard drip coffee',
      '26-40': 'Coarse - French press to cold brew'
    },
    recommendations: {
      'Espresso': { setting: 8, description: 'Fine espresso grind' },
      'Hario V60': { setting: 15, description: 'Medium-fine pour-over' },
      'Hario Switch': { setting: 18, description: 'Medium for hybrid brewing' },
      'Kalita Wave': { setting: 20, description: 'Medium for flat-bottom dripper' },
      'Chemex': { setting: 25, description: 'Medium-coarse for thick filters' },
      'French Press': { setting: 30, description: 'Coarse for immersion' },
      'AeroPress': { setting: 12, description: 'Fine for pressure brewing' },
      'Moka Pot': { setting: 10, description: 'Fine for stovetop espresso' }
    }
  },
  'Baratza Virtuoso+': {
    grind_range: { min: 1, max: 40, step: 1, unit: 'setting' },
    descriptions: {
      '1-12': 'Fine - espresso to fine drip',
      '13-22': 'Medium - standard drip coffee',
      '23-40': 'Coarse - French press to cold brew'
    },
    recommendations: {
      'Espresso': { setting: 6, description: 'Fine espresso grind' },
      'Hario V60': { setting: 14, description: 'Medium-fine pour-over' },
      'Hario Switch': { setting: 16, description: 'Medium for hybrid brewing' },
      'Kalita Wave': { setting: 18, description: 'Medium for flat-bottom dripper' },
      'Chemex': { setting: 22, description: 'Medium-coarse for thick filters' },
      'French Press': { setting: 28, description: 'Coarse for immersion' },
      'AeroPress': { setting: 10, description: 'Fine for pressure brewing' },
      'Moka Pot': { setting: 8, description: 'Fine for stovetop espresso' }
    }
  },
  'OXO Brew Conical Burr Grinder': {
    grind_range: { min: 1, max: 15, step: 0.5, unit: 'setting' },
    descriptions: {
      '1-5.5': 'Fine - espresso to pour-over fine',
      '5.5-10.5': 'Medium - standard pour-over',
      '10.5-15': 'Coarse - French press to cold brew'
    },
    recommendations: {
      'Espresso': { setting: 3, description: 'Fine espresso grind' },
      'Hario V60': { setting: 7, description: 'Medium-fine pour-over' },
      'Hario Switch': { setting: 8, description: 'Medium for hybrid brewing' },
      'Kalita Wave': { setting: 8.5, description: 'Medium for flat-bottom dripper' },
      'Chemex': { setting: 10, description: 'Medium-coarse for thick filters' },
      'French Press': { setting: 13, description: 'Coarse for immersion' },
      'AeroPress': { setting: 5, description: 'Fine for pressure brewing' },
      'Moka Pot': { setting: 4, description: 'Fine for stovetop espresso' }
    }
  },
  'Generic Hand Grinder': {
    grind_range: { min: 1, max: 20, step: 1, unit: 'clicks/setting' },
    descriptions: {
      '1-7': 'Fine - espresso to fine drip',
      '8-14': 'Medium - standard drip coffee',
      '15-20': 'Coarse - French press to cold brew'
    },
    recommendations: {
      'Espresso': { setting: 4, description: 'Fine espresso grind' },
      'Hario V60': { setting: 10, description: 'Medium-fine pour-over' },
      'Hario Switch': { setting: 11, description: 'Medium for hybrid brewing' },
      'Kalita Wave': { setting: 12, description: 'Medium for flat-bottom dripper' },
      'Chemex': { setting: 14, description: 'Medium-coarse for thick filters' },
      'French Press': { setting: 17, description: 'Coarse for immersion' },
      'AeroPress': { setting: 8, description: 'Fine for pressure brewing' },
      'Moka Pot': { setting: 6, description: 'Fine for stovetop espresso' }
    }
  }
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
    brand: 'Baratza',
    model: 'Encore',
    settings_schema: GRINDER_CONFIGURATIONS['Baratza Encore'],
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
    const { data, error } = await (supabase
      .from('equipment')
      .insert as any)([{
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

    const { data, error } = await (supabase
      .from('equipment')
      .update as any)(updates)
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

    const { error } = await (supabase
      .from('equipment')
      .update as any)({ is_active: false })
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

// Get grinder configuration by brand/model
export function getGrinderConfiguration(brand: string, model: string): any {
  // Try exact match first
  const fullName = `${brand} ${model}`
  if (GRINDER_CONFIGURATIONS[fullName]) {
    return GRINDER_CONFIGURATIONS[fullName]
  }

  // Try model match
  if (GRINDER_CONFIGURATIONS[model]) {
    return GRINDER_CONFIGURATIONS[model]
  }

  // Try brand-specific matches
  const brandMatches = Object.keys(GRINDER_CONFIGURATIONS).filter(key => 
    key.toLowerCase().includes(brand.toLowerCase())
  )
  
  if (brandMatches.length > 0) {
    return GRINDER_CONFIGURATIONS[brandMatches[0]]
  }

  // Default to generic configuration
  return GRINDER_CONFIGURATIONS['Generic Hand Grinder']
}

// Get default equipment for type
export function getDefaultEquipmentForType(type: 'grinder' | 'roaster' | 'brewer', brand?: string, model?: string): EquipmentEntry | null {
  if (type === 'grinder' && brand && model) {
    return {
      type: 'grinder',
      brand,
      model,
      settings_schema: getGrinderConfiguration(brand, model),
      is_active: true
    }
  }
  
  return DEFAULT_EQUIPMENT.find(eq => eq.type === type) || null
}