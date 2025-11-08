'use client'

import { useState, useEffect } from 'react'
import { createRoastCompletedEntry, getCurrentInventory, type RoastCompletedEntry } from '@/lib/ledger'
import { Coffee, Scale, Thermometer, Clock, FileText, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Equipment {
  id: string
  type: string
  brand: string
  model: string
}

interface GreenCoffee {
  coffee_name: string
  current_amount: number
  origin: string
}

export function RoastCompletionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState<Partial<RoastCompletedEntry>>({
    roast_date: new Date().toISOString().split('T')[0],
    roast_level: 'medium'
  })
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load equipment
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: equipmentData } = await supabase
          .rpc('get_user_equipment', { p_user_id: user.id })
        
        if (equipmentData) {
          setEquipment(equipmentData.filter((eq: any) => eq.type === 'roaster'))
        }
      }

      // Load green coffee inventory
      const inventory = await getCurrentInventory()
      setGreenCoffee(inventory.green)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load equipment and inventory')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof RoastCompletedEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Calculate weight loss when both weights are available
    if (field === 'green_weight' || field === 'roasted_weight') {
      const greenWeight = field === 'green_weight' ? value : formData.green_weight
      const roastedWeight = field === 'roasted_weight' ? value : formData.roasted_weight
      
      if (greenWeight && roastedWeight && greenWeight > 0) {
        const weightLoss = ((greenWeight - roastedWeight) / greenWeight * 100).toFixed(2)
        console.log(`Weight loss: ${weightLoss}%`)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.green_coffee_name || !formData.green_weight || 
          !formData.roasted_weight || !formData.equipment_id) {
        throw new Error('Please fill in all required fields')
      }

      const roastEntry: RoastCompletedEntry = {
        name: formData.name!,
        green_coffee_name: formData.green_coffee_name!,
        roast_date: formData.roast_date!,
        roast_level: formData.roast_level!,
        green_weight: Number(formData.green_weight),
        roasted_weight: Number(formData.roasted_weight),
        batch_number: formData.batch_number || 0, // Will be auto-generated if 0
        roast_notes: formData.roast_notes,
        equipment_id: formData.equipment_id!,
        roast_profile: formData.roast_profile
      }

      const result = await createRoastCompletedEntry(roastEntry)
      
      if (!result) {
        throw new Error('Failed to create roast entry')
      }

      // Reset form
      setFormData({
        roast_date: new Date().toISOString().split('T')[0],
        roast_level: 'medium'
      })

      onSuccess?.()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const weightLossPercentage = formData.green_weight && formData.roasted_weight 
    ? ((formData.green_weight - formData.roasted_weight) / formData.green_weight * 100).toFixed(2)
    : null

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coffee className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Complete Roast</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Coffee className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-gray-900">Complete Roast</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roast Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="e.g., Ethiopian Single Origin #1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Green Coffee Used *
            </label>
            <select
              value={formData.green_coffee_name || ''}
              onChange={(e) => handleInputChange('green_coffee_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            >
              <option value="">Select green coffee...</option>
              {greenCoffee.map((coffee, index) => (
                <option key={index} value={coffee.coffee_name}>
                  {coffee.coffee_name} ({coffee.current_amount}g available)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Roast Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roast Date *
            </label>
            <input
              type="date"
              value={formData.roast_date || ''}
              onChange={(e) => handleInputChange('roast_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roast Level *
            </label>
            <select
              value={formData.roast_level || 'medium'}
              onChange={(e) => handleInputChange('roast_level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            >
              <option value="light">Light</option>
              <option value="medium-light">Medium-Light</option>
              <option value="medium">Medium</option>
              <option value="medium-dark">Medium-Dark</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Used *
            </label>
            <select
              value={formData.equipment_id || ''}
              onChange={(e) => handleInputChange('equipment_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            >
              <option value="">Select roaster...</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.brand} {eq.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Weight Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Scale className="inline h-4 w-4 mr-1" />
              Green Weight (g) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={formData.green_weight || ''}
              onChange={(e) => handleInputChange('green_weight', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="220"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Scale className="inline h-4 w-4 mr-1" />
              Roasted Weight (g) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={formData.roasted_weight || ''}
              onChange={(e) => handleInputChange('roasted_weight', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="185"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight Loss
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {weightLossPercentage ? `${weightLossPercentage}%` : '—'}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Roast Notes
          </label>
          <textarea
            value={formData.roast_notes || ''}
            onChange={(e) => handleInputChange('roast_notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Notes about the roast profile, development time, first crack timing, etc."
          />
        </div>

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
            {isSubmitting ? 'Saving...' : 'Complete Roast'}
          </button>
        </div>
      </form>
    </div>
  )
}