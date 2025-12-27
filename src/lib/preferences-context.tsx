'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './auth-context'
import { supabase } from './supabase'
import type { TemperatureUnit } from './utils/temperature'

interface UserPreferences {
  temperature_unit: TemperatureUnit
  preferred_units: 'grams' | 'ounces'
  daily_consumption: number
  default_roast_size: number
  default_brew_ratio: number
  timezone: string
}

interface PreferencesContextType {
  preferences: UserPreferences
  loading: boolean
  refreshPreferences: () => Promise<void>
}

const defaultPreferences: UserPreferences = {
  temperature_unit: 'fahrenheit',
  preferred_units: 'grams',
  daily_consumption: 40,
  default_roast_size: 220,
  default_brew_ratio: 15,
  timezone: 'UTC'
}

const PreferencesContext = createContext<PreferencesContextType>({
  preferences: defaultPreferences,
  loading: true,
  refreshPreferences: async () => {}
})

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)

  const loadPreferences = async () => {
    if (!user) {
      setPreferences(defaultPreferences)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error)
        return
      }

      if (data) {
        setPreferences({
          temperature_unit: (data as any).temperature_unit || 'fahrenheit',
          preferred_units: (data as any).preferred_units || 'grams',
          daily_consumption: (data as any).daily_consumption || 40,
          default_roast_size: (data as any).default_roast_size || 220,
          default_brew_ratio: (data as any).default_brew_ratio || 15,
          timezone: (data as any).timezone || 'UTC'
        })
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreferences()
  }, [user?.id])

  return (
    <PreferencesContext.Provider value={{
      preferences,
      loading,
      refreshPreferences: loadPreferences
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}
