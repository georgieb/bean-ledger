'use client'

import { useState, useEffect } from 'react'
import { createConsumptionEntry, createBrewLogEntry, getCurrentInventory, type ConsumptionEntry, type BrewLogEntry } from '@/lib/ledger'
import { Coffee, Scale, Clock, Thermometer, Star, FileText, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RoastedCoffee {
  coffee_name: string
  current_amount: number
  roast_date: string
  roast_level: string
}

interface Equipment {
  id: string
  type: string
  brand: string
  model: string
}

export function ConsumptionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<'simple' | 'brew'>('simple')
  const [formData, setFormData] = useState<Partial<ConsumptionEntry>>({
    consumption_type: 'brew'
  })
  const [brewData, setBrewData] = useState<Partial<BrewLogEntry>>({
    brew_method: 'pour-over'
  })
  const [roastedCoffee, setRoastedCoffee] = useState<RoastedCoffee[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load roasted coffee inventory
      const inventory = await getCurrentInventory()
      setRoastedCoffee(inventory.roasted)

      // Load brewing equipment
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: equipmentData } = await supabase
          .rpc('get_user_equipment', { p_user_id: user.id })
        
        if (equipmentData) {
          setEquipment(equipmentData.filter((eq: any) => 
            eq.type === 'grinder' || eq.type === 'brewer'
          ))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load inventory and equipment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'simple') {
        // Simple consumption logging
        if (!formData.coffee_name || !formData.amount) {
          throw new Error('Please fill in all required fields')
        }

        const consumptionEntry: ConsumptionEntry = {
          coffee_name: formData.coffee_name!,
          amount: Number(formData.amount),
          consumption_type: formData.consumption_type!,
          notes: formData.notes
        }

        const result = await createConsumptionEntry(consumptionEntry)
        if (!result) throw new Error('Failed to create consumption entry')
        
      } else {
        // Detailed brew logging
        if (!brewData.coffee_name || !brewData.coffee_amount || !brewData.water_amount || !brewData.brew_method) {
          throw new Error('Please fill in all required fields')
        }

        const brewEntry: BrewLogEntry = {
          coffee_name: brewData.coffee_name!,
          brew_method: brewData.brew_method!,
          coffee_amount: Number(brewData.coffee_amount),
          water_amount: Number(brewData.water_amount),
          grind_setting: brewData.grind_setting,
          brew_time: brewData.brew_time ? Number(brewData.brew_time) : undefined,
          water_temp: brewData.water_temp ? Number(brewData.water_temp) : undefined,
          rating: brewData.rating ? Number(brewData.rating) : undefined,
          notes: brewData.notes,
          equipment_id: brewData.equipment_id
        }

        const result = await createBrewLogEntry(brewEntry)
        if (!result) throw new Error('Failed to create brew log entry')
      }

      // Reset forms
      setFormData({ consumption_type: 'brew' })
      setBrewData({ brew_method: 'pour-over' })
      onSuccess?.()

    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const brewRatio = brewData.coffee_amount && brewData.water_amount 
    ? (brewData.water_amount / brewData.coffee_amount).toFixed(1)
    : null

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Log Consumption</h3>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              mode === 'simple' 
                ? 'bg-white text-amber-600 shadow' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setMode('brew')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              mode === 'brew' 
                ? 'bg-white text-amber-600 shadow' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Brew Log
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'simple' ? (
          // Simple Consumption Form
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coffee *
                </label>
                <select
                  value={formData.coffee_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, coffee_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="">Select coffee...</option>
                  {roastedCoffee.map((coffee, index) => (
                    <option key={index} value={coffee.coffee_name}>
                      {coffee.coffee_name} ({coffee.current_amount}g available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Scale className="inline h-4 w-4 mr-1" />
                  Amount (g) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consumption Type
              </label>
              <select
                value={formData.consumption_type || 'brew'}
                onChange={(e) => setFormData(prev => ({ ...prev, consumption_type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="brew">Brew</option>
                <option value="gift">Gift</option>
                <option value="sample">Sample</option>
                <option value="waste">Waste</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Optional notes about this consumption"
              />
            </div>
          </>
        ) : (
          // Detailed Brew Log Form
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coffee *
                </label>
                <select
                  value={brewData.coffee_name || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, coffee_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="">Select coffee...</option>
                  {roastedCoffee.map((coffee, index) => (
                    <option key={index} value={coffee.coffee_name}>
                      {coffee.coffee_name} ({coffee.current_amount}g available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brew Method *
                </label>
                <select
                  value={brewData.brew_method || 'pour-over'}
                  onChange={(e) => setBrewData(prev => ({ ...prev, brew_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="pour-over">Pour Over</option>
                  <option value="espresso">Espresso</option>
                  <option value="french-press">French Press</option>
                  <option value="aeropress">AeroPress</option>
                  <option value="cold-brew">Cold Brew</option>
                  <option value="drip">Drip</option>
                  <option value="chemex">Chemex</option>
                  <option value="v60">V60</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Scale className="inline h-4 w-4 mr-1" />
                  Coffee (g) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={brewData.coffee_amount || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, coffee_amount: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Water (g) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={brewData.water_amount || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, water_amount: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ratio
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {brewRatio ? `1:${brewRatio}` : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grind Setting
                </label>
                <input
                  type="text"
                  value={brewData.grind_setting || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, grind_setting: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., 7.5, Medium-Fine"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Brew Time (sec)
                </label>
                <input
                  type="number"
                  min="0"
                  value={brewData.brew_time || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, brew_time: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="240"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Thermometer className="inline h-4 w-4 mr-1" />
                  Water Temp (°C)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={brewData.water_temp || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, water_temp: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="94"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Star className="inline h-4 w-4 mr-1" />
                  Rating (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={brewData.rating || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="8"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment
                </label>
                <select
                  value={brewData.equipment_id || ''}
                  onChange={(e) => setBrewData(prev => ({ ...prev, equipment_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select equipment...</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.brand} {eq.model} ({eq.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Brew Notes
              </label>
              <textarea
                value={brewData.notes || ''}
                onChange={(e) => setBrewData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Taste notes, brewing observations, adjustments to make next time..."
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Saving...' : mode === 'simple' ? 'Log Consumption' : 'Log Brew'}
          </button>
        </div>
      </form>
    </div>
  )
}