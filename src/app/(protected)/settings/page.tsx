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
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl shadow-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">Settings</h1>
            <p className="text-slate-300 mt-1 text-lg">Configure your preferences and account settings</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-lg p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-slate-700/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl shadow-lg">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">Settings</h1>
          <p className="text-slate-300 mt-1 text-lg">Configure your preferences and account settings</p>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
            <User className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100">Account Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">Email</label>
            <div className="px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-200">
              {user?.email}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">Account Status</label>
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium">
              Active
            </div>
          </div>
        </div>
      </div>

      {/* Roasting Preferences */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100">Roasting Preferences</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">
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
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300"
            />
            <p className="text-xs text-slate-400 mt-2">Used to calculate days of supply remaining</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">
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
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300"
            />
            <p className="text-xs text-slate-400 mt-2">Default green coffee weight for new roasts</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">
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
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300"
            />
            <p className="text-xs text-slate-400 mt-2">Default coffee to water ratio for brewing</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">
              Preferred Units
            </label>
            <select
              value={preferences.preferred_units}
              onChange={(e) => setPreferences({
                ...preferences,
                preferred_units: e.target.value as 'grams' | 'ounces'
              })}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300"
            >
              <option value="grams">Grams</option>
              <option value="ounces">Ounces</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100">System Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide uppercase">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature Unit
              </div>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="temperature_unit"
                  value="celsius"
                  checked={preferences.temperature_unit === 'celsius'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    temperature_unit: e.target.value as TemperatureUnit
                  })}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500/50 focus:ring-2"
                />
                <span className="text-sm text-slate-200 group-hover:text-white transition-colors">Celsius (°C)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="temperature_unit"
                  value="fahrenheit"
                  checked={preferences.temperature_unit === 'fahrenheit'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    temperature_unit: e.target.value as TemperatureUnit
                  })}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500/50 focus:ring-2"
                />
                <span className="text-sm text-slate-200 group-hover:text-white transition-colors">Fahrenheit (°F)</span>
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-2">Temperature display for roasting profiles</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 tracking-wide uppercase">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences({
                ...preferences,
                timezone: e.target.value
              })}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
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
          className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 disabled:from-slate-500 disabled:to-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-xl backdrop-blur-sm border transition-all duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="font-medium">{message.text}</div>
        </div>
      )}
    </div>
  )
}