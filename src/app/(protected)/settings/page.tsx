'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePreferences } from '@/lib/preferences-context'
import { supabase } from '@/lib/supabase'
import { Settings, User, Coffee, Scale, Clock, Save, Loader2, Thermometer } from 'lucide-react'
import type { TemperatureUnit } from '@/lib/utils/temperature'

interface UserPreferences {
  daily_consumption: number
  default_roast_size: number
  default_brew_ratio: number
  preferred_units: 'grams' | 'ounces'
  temperature_unit: TemperatureUnit
  timezone: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { refreshPreferences } = usePreferences()
  const [preferences, setPreferences] = useState<UserPreferences>({
    daily_consumption: 40,
    default_roast_size: 220,
    default_brew_ratio: 15,
    preferred_units: 'grams',
    temperature_unit: 'fahrenheit',
    timezone: 'UTC'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setPreferences({
          daily_consumption: (data as any).daily_consumption,
          default_roast_size: (data as any).default_roast_size,
          default_brew_ratio: (data as any).default_brew_ratio,
          preferred_units: (data as any).preferred_units,
          temperature_unit: (data as any).temperature_unit || 'fahrenheit',
          timezone: (data as any).timezone
        })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      setMessage({ type: 'error', text: 'Failed to load preferences' })
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = (await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        } as any))

      if (error) throw error

      // Refresh the global preferences context
      await refreshPreferences()

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Configure your preferences and account settings</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your preferences and account settings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">User Preferences</span>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-6 w-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
              {user?.email}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
            <div className="px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-green-800">
              Active
            </div>
          </div>
        </div>
      </div>

      {/* Roasting Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Coffee className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Roasting Preferences</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Coffee Consumption (grams)
            </label>
            <input
              type="number"
              value={preferences.daily_consumption}
              onChange={(e) => setPreferences({
                ...preferences,
                daily_consumption: Number(e.target.value)
              })}
              min="10"
              max="200"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used to calculate days of supply remaining</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Roast Size (grams)
            </label>
            <input
              type="number"
              value={preferences.default_roast_size}
              onChange={(e) => setPreferences({
                ...preferences,
                default_roast_size: Number(e.target.value)
              })}
              min="100"
              max="500"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Default green coffee weight for new roasts</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Brew Ratio (1:X)
            </label>
            <input
              type="number"
              value={preferences.default_brew_ratio}
              onChange={(e) => setPreferences({
                ...preferences,
                default_brew_ratio: Number(e.target.value)
              })}
              min="10"
              max="20"
              step="0.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Default coffee to water ratio for brewing</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Units
            </label>
            <select
              value={preferences.preferred_units}
              onChange={(e) => setPreferences({
                ...preferences,
                preferred_units: e.target.value as 'grams' | 'ounces'
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="grams">Grams</option>
              <option value="ounces">Ounces</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature Unit
              </div>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="temperature_unit"
                  value="celsius"
                  checked={preferences.temperature_unit === 'celsius'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    temperature_unit: e.target.value as TemperatureUnit
                  })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Celsius (°C)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="temperature_unit"
                  value="fahrenheit"
                  checked={preferences.temperature_unit === 'fahrenheit'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    temperature_unit: e.target.value as TemperatureUnit
                  })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Fahrenheit (°F)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Temperature display for roasting profiles</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({
                ...preferences,
                timezone: e.target.value
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}