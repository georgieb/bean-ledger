import { supabase } from './supabase'

// Function to manually set up a new user if database triggers don't work
export async function setupNewUser(userId: string) {
  try {
    // Create default user preferences
    const { error: prefsError } = await (supabase as any)
      .from('user_preferences')
      .insert([{
        user_id: userId,
        daily_consumption: 40,
        default_roast_size: 220,
        default_brew_ratio: 15,
        preferred_units: 'grams',
        timezone: 'UTC'
      }])
      .select()
      .single()

    if (prefsError && prefsError.code !== '23505') { // Ignore duplicate key errors
      console.error('Error creating user preferences:', prefsError)
    }

    // Create default equipment
    const defaultEquipment = [
      {
        user_id: userId,
        type: 'roaster',
        brand: 'Fresh Roast',
        model: 'SR800',
        settings_schema: {
          fan_range: { min: 1, max: 9 },
          heat_range: { min: 1, max: 3 },
          default_batch_size: 120
        },
        is_active: true
      },
      {
        user_id: userId,
        type: 'grinder',
        brand: 'OXO',
        model: '8717000',
        settings_schema: {
          dial_range: { min: 1, max: 15, step: 0.5 },
          descriptions: {
            "1-5.5": "Fine (espresso to pour-over fine)",
            "5.5-10.5": "Medium (standard pour-over)",
            "10.5-15": "Coarse (French press to cold brew)"
          }
        },
        is_active: true
      },
      {
        user_id: userId,
        type: 'brewer',
        brand: 'Hario',
        model: 'V60 Switch Size 3',
        settings_schema: {
          capacity_ml: 600,
          recommended_dose: "20g",
          recommended_ratio: 15
        },
        is_active: true
      }
    ]

    const { error: equipmentError } = await supabase
      .from('equipment')
      .insert(defaultEquipment as any)

    if (equipmentError && equipmentError.code !== '23505') { // Ignore duplicate key errors
      console.error('Error creating default equipment:', equipmentError)
    }

    return { success: true }
  } catch (error) {
    console.error('Error setting up new user:', error)
    return { success: false, error }
  }
}