'use client'

import { useState, useEffect } from 'react'
import { createRoastSchedule, updateRoastSchedule, type RoastScheduleEntry, type ScheduledRoast } from '@/lib/schedule-local'
import { getCurrentInventory } from '@/lib/ledger'
import { getEquipmentByType, type Equipment } from '@/lib/equipment'
import { Calendar, Coffee, Scale, Target, FileText, Save, Loader2, X } from 'lucide-react'
import { inputStyles, selectStyles, textareaStyles } from '@/styles/input-styles'

interface GreenCoffee {
  coffee_name: string
  current_amount: number
  origin: string
}

interface AddRoastModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingRoast?: ScheduledRoast | null
}

export function AddRoastModal({ isOpen, onClose, onSuccess, editingRoast }: AddRoastModalProps) {
  const [formData, setFormData] = useState<Partial<RoastScheduleEntry>>({
    scheduled_date: new Date().toISOString().split('T')[0],
    target_roast_level: 'medium',
    priority: 'medium',
    green_weight: 220
  })
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
      
      // If editing, populate form with existing data
      if (editingRoast) {
        setFormData({
          coffee_name: editingRoast.coffee_name,
          green_coffee_name: editingRoast.green_coffee_name,
          scheduled_date: editingRoast.scheduled_date,
          green_weight: editingRoast.green_weight,
          target_roast_level: editingRoast.target_roast_level as any,
          equipment_id: editingRoast.equipment_id,
          notes: editingRoast.notes,
          priority: editingRoast.priority as any
        })
      } else {
        // Reset form for new roast
        setFormData({
          scheduled_date: new Date().toISOString().split('T')[0],
          target_roast_level: 'medium',
          priority: 'medium',
          green_weight: 220
        })
      }
    }
  }, [isOpen, editingRoast])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load roaster equipment
      const roasterEquipment = await getEquipmentByType('roaster')
      setEquipment(roasterEquipment)

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

  const handleInputChange = (field: keyof RoastScheduleEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-generate coffee name if not editing
    if (!editingRoast && (field === 'green_coffee_name' || field === 'target_roast_level')) {
      const greenName = field === 'green_coffee_name' ? value : formData.green_coffee_name
      const roastLevel = field === 'target_roast_level' ? value : formData.target_roast_level
      
      if (greenName && roastLevel) {
        const levelName = roastLevel.replace('-', ' ')
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          coffee_name: `${greenName} (${levelName})`
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.coffee_name || !formData.green_coffee_name || !formData.scheduled_date ||
          !formData.green_weight) {
        throw new Error('Please fill in all required fields')
      }

      // Check if enough green coffee is available
      const selectedGreenCoffee = greenCoffee.find(c => c.coffee_name === formData.green_coffee_name)
      if (!selectedGreenCoffee || selectedGreenCoffee.current_amount < formData.green_weight!) {
        throw new Error('Not enough green coffee available for this roast')
      }

      const scheduleEntry: RoastScheduleEntry = {
        coffee_name: formData.coffee_name!,
        green_coffee_name: formData.green_coffee_name!,
        scheduled_date: formData.scheduled_date!,
        green_weight: Number(formData.green_weight),
        target_roast_level: formData.target_roast_level!,
        equipment_id: formData.equipment_id!,
        notes: formData.notes,
        priority: formData.priority
      }

      let result
      if (editingRoast) {
        result = await updateRoastSchedule(editingRoast.id, scheduleEntry)
      } else {
        result = await createRoastSchedule(scheduleEntry)
      }
      
      if (!result) {
        throw new Error(`Failed to ${editingRoast ? 'update' : 'create'} scheduled roast`)
      }

      // Reset form
      setFormData({
        scheduled_date: new Date().toISOString().split('T')[0],
        target_roast_level: 'medium',
        priority: 'medium',
        green_weight: 220
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAvailableAmount = (greenCoffeeName: string) => {
    const coffee = greenCoffee.find(c => c.coffee_name === greenCoffeeName)
    return coffee?.current_amount || 0
  }

  const getExpectedYield = (greenWeight: number) => {
    // Typical weight loss ranges: light 15%, medium 17%, dark 20%
    const weightLossMap = {
      'light': 0.15,
      'medium-light': 0.16,
      'medium': 0.17,
      'medium-dark': 0.18,
      'dark': 0.20
    }
    const weightLoss = weightLossMap[formData.target_roast_level as keyof typeof weightLossMap] || 0.17
    return Math.round(greenWeight * (1 - weightLoss))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingRoast ? 'Edit Scheduled Roast' : 'Schedule New Roast'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Coffee className="inline h-4 w-4 mr-1" />
                    Roast Name *
                  </label>
                  <input
                    type="text"
                    value={formData.coffee_name || ''}
                    onChange={(e) => handleInputChange('coffee_name', e.target.value)}
                    className={inputStyles}
                    placeholder="e.g., Ethiopian Single Origin (Medium)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date || ''}
                    onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                    className={inputStyles}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              {/* Green Coffee Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Green Coffee *
                  </label>
                  <select
                    value={formData.green_coffee_name || ''}
                    onChange={(e) => handleInputChange('green_coffee_name', e.target.value)}
                    className={selectStyles}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Target className="inline h-4 w-4 mr-1" />
                    Target Roast Level *
                  </label>
                  <select
                    value={formData.target_roast_level || 'medium'}
                    onChange={(e) => handleInputChange('target_roast_level', e.target.value)}
                    className={selectStyles}
                    required
                  >
                    <option value="light">Light</option>
                    <option value="medium-light">Medium-Light</option>
                    <option value="medium">Medium</option>
                    <option value="medium-dark">Medium-Dark</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              {/* Weight and Equipment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Scale className="inline h-4 w-4 mr-1" />
                    Green Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="50"
                    max={formData.green_coffee_name ? getAvailableAmount(formData.green_coffee_name) : 1000}
                    value={formData.green_weight || ''}
                    onChange={(e) => handleInputChange('green_weight', parseInt(e.target.value))}
                    className={inputStyles}
                    placeholder="220"
                    required
                  />
                  {formData.green_coffee_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {getAvailableAmount(formData.green_coffee_name)}g
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Yield
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                    {formData.green_weight ? getExpectedYield(formData.green_weight) : '—'}g
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className={selectStyles}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roaster Equipment
                </label>
                <select
                  value={formData.equipment_id || ''}
                  onChange={(e) => handleInputChange('equipment_id', e.target.value)}
                  className={selectStyles}
                >
                  <option value="">Select roaster (optional)...</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.brand} {eq.model}
                    </option>
                  ))}
                </select>
                {equipment.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No roasters configured. You can add equipment later in settings.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className={textareaStyles}
                  placeholder="Special considerations, goals, or reminders for this roast..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
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
                  {isSubmitting 
                    ? 'Saving...' 
                    : editingRoast 
                    ? 'Update Schedule' 
                    : 'Schedule Roast'
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}