'use client'

import { useState, useEffect } from 'react'
import { createRoastCompletedEntry, getCurrentInventory, type RoastCompletedEntry } from '@/lib/ledger'
import { getRoastSchedule, completeScheduledRoast } from '@/lib/schedule-local'
import { getEquipmentByType, type Equipment } from '@/lib/equipment'
import { Coffee, Scale, Thermometer, Clock, FileText, Save, Loader2, TrendingUp, Timer } from 'lucide-react'
import { inputStyles, selectStyles, textareaStyles } from '@/styles/input-styles'

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
  const [roastProfile, setRoastProfile] = useState({
    charge_temp: '',
    first_crack_start: '',
    first_crack_end: '',
    development_time: '',
    drop_temp: '',
    total_roast_time: '',
    environmental_temp: '',
    air_flow_settings: '',
    gas_pressure: '',
    drum_speed: '',
    bean_color_before: '',
    bean_color_after: '',
    aroma_notes: '',
    cupping_score: '',
    defects: ''
  })
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvancedProfile, setShowAdvancedProfile] = useState(false)
  const [scheduledRoasts, setScheduledRoasts] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load roaster equipment
      const roasterEquipment = await getEquipmentByType('roaster')
      setEquipment(roasterEquipment)

      // Load green coffee inventory
      const inventory = await getCurrentInventory()
      setGreenCoffee(inventory.green)

      // Load scheduled roasts
      const scheduled = await getRoastSchedule()
      setScheduledRoasts(scheduled.filter(r => !r.completed))
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

  const handleProfileChange = (field: string, value: string) => {
    setRoastProfile(prev => ({ ...prev, [field]: value }))
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

      // Compile roast profile data
      const profileData = {
        ...roastProfile,
        // Convert numeric fields
        charge_temp: roastProfile.charge_temp ? parseFloat(roastProfile.charge_temp) : null,
        first_crack_start: roastProfile.first_crack_start || null,
        first_crack_end: roastProfile.first_crack_end || null,
        development_time: roastProfile.development_time ? parseFloat(roastProfile.development_time) : null,
        drop_temp: roastProfile.drop_temp ? parseFloat(roastProfile.drop_temp) : null,
        total_roast_time: roastProfile.total_roast_time ? parseFloat(roastProfile.total_roast_time) : null,
        environmental_temp: roastProfile.environmental_temp ? parseFloat(roastProfile.environmental_temp) : null,
        cupping_score: roastProfile.cupping_score ? parseFloat(roastProfile.cupping_score) : null,
        // Filter out empty strings
        ...Object.fromEntries(
          Object.entries(roastProfile).filter(([key, value]) => 
            typeof value === 'string' && value.trim() !== ''
          )
        )
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
        roast_profile: profileData
      }

      const result = await createRoastCompletedEntry(roastEntry)
      
      if (!result) {
        throw new Error('Failed to create roast entry')
      }

      // Check if this matches any scheduled roasts and mark them as completed
      const matchingSchedule = scheduledRoasts.find(schedule => 
        schedule.green_coffee_name === roastEntry.green_coffee_name &&
        Math.abs(schedule.green_weight - roastEntry.green_weight) <= 5 && // Allow 5g variance
        schedule.target_roast_level === roastEntry.roast_level
      )

      if (matchingSchedule) {
        await completeScheduledRoast(matchingSchedule.id, {
          roasted_weight: roastEntry.roasted_weight,
          roast_level: roastEntry.roast_level,
          roast_notes: roastEntry.roast_notes
        })
      }

      // Reset form
      setFormData({
        roast_date: new Date().toISOString().split('T')[0],
        roast_level: 'medium'
      })
      setRoastProfile({
        charge_temp: '',
        first_crack_start: '',
        first_crack_end: '',
        development_time: '',
        drop_temp: '',
        total_roast_time: '',
        environmental_temp: '',
        air_flow_settings: '',
        gas_pressure: '',
        drum_speed: '',
        bean_color_before: '',
        bean_color_after: '',
        aroma_notes: '',
        cupping_score: '',
        defects: ''
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
              className={inputStyles}
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
              className={inputStyles}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Used *
            </label>
            <select
              value={formData.equipment_id || ''}
              onChange={(e) => handleInputChange('equipment_id', e.target.value)}
              className={selectStyles}
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
              className={inputStyles}
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
              className={inputStyles}
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
            className={textareaStyles}
            placeholder="Notes about the roast profile, development time, first crack timing, etc."
          />
        </div>

        {/* Roast Profile Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <h4 className="text-lg font-semibold text-gray-900">Roast Profile</h4>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedProfile(!showAdvancedProfile)}
              className="text-amber-600 hover:text-amber-700 text-sm font-medium"
            >
              {showAdvancedProfile ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          {/* Basic Profile Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Thermometer className="inline h-4 w-4 mr-1" />
                Charge Temp (°C)
              </label>
              <input
                type="number"
                step="1"
                value={roastProfile.charge_temp}
                onChange={(e) => handleProfileChange('charge_temp', e.target.value)}
                className={inputStyles}
                placeholder="200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Timer className="inline h-4 w-4 mr-1" />
                First Crack Start
              </label>
              <input
                type="text"
                value={roastProfile.first_crack_start}
                onChange={(e) => handleProfileChange('first_crack_start', e.target.value)}
                className={inputStyles}
                placeholder="8:30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Total Roast Time (min)
              </label>
              <input
                type="number"
                step="0.1"
                value={roastProfile.total_roast_time}
                onChange={(e) => handleProfileChange('total_roast_time', e.target.value)}
                className={inputStyles}
                placeholder="12.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Development Time (min)
              </label>
              <input
                type="number"
                step="0.1"
                value={roastProfile.development_time}
                onChange={(e) => handleProfileChange('development_time', e.target.value)}
                className={inputStyles}
                placeholder="3.2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drop Temperature (°C)
              </label>
              <input
                type="number"
                step="1"
                value={roastProfile.drop_temp}
                onChange={(e) => handleProfileChange('drop_temp', e.target.value)}
                className={inputStyles}
                placeholder="205"
              />
            </div>
          </div>

          {/* Advanced Profile Metrics */}
          {showAdvancedProfile && (
            <div className="mt-6 space-y-4">
              <h5 className="text-md font-medium text-gray-800 border-b border-gray-200 pb-2">Advanced Metrics</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Crack End
                  </label>
                  <input
                    type="text"
                    value={roastProfile.first_crack_end}
                    onChange={(e) => handleProfileChange('first_crack_end', e.target.value)}
                    className={inputStyles}
                    placeholder="9:45"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environmental Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={roastProfile.environmental_temp}
                    onChange={(e) => handleProfileChange('environmental_temp', e.target.value)}
                    className={inputStyles}
                    placeholder="23"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cupping Score
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={roastProfile.cupping_score}
                    onChange={(e) => handleProfileChange('cupping_score', e.target.value)}
                    className={inputStyles}
                    placeholder="85.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Air Flow Settings
                  </label>
                  <input
                    type="text"
                    value={roastProfile.air_flow_settings}
                    onChange={(e) => handleProfileChange('air_flow_settings', e.target.value)}
                    className={inputStyles}
                    placeholder="Medium, adjusted at 6 min"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gas Pressure
                  </label>
                  <input
                    type="text"
                    value={roastProfile.gas_pressure}
                    onChange={(e) => handleProfileChange('gas_pressure', e.target.value)}
                    className={inputStyles}
                    placeholder="2.5 bar, reduced to 2.0 at FC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bean Color Before
                  </label>
                  <input
                    type="text"
                    value={roastProfile.bean_color_before}
                    onChange={(e) => handleProfileChange('bean_color_before', e.target.value)}
                    className={inputStyles}
                    placeholder="Pale green, uniform"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bean Color After
                  </label>
                  <input
                    type="text"
                    value={roastProfile.bean_color_after}
                    onChange={(e) => handleProfileChange('bean_color_after', e.target.value)}
                    className={inputStyles}
                    placeholder="Medium brown, even"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aroma Notes
                </label>
                <textarea
                  value={roastProfile.aroma_notes}
                  onChange={(e) => handleProfileChange('aroma_notes', e.target.value)}
                  rows={2}
                  className={textareaStyles}
                  placeholder="Floral, fruity, caramel sweetness..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Defects & Quality Notes
                </label>
                <textarea
                  value={roastProfile.defects}
                  onChange={(e) => handleProfileChange('defects', e.target.value)}
                  rows={2}
                  className={textareaStyles}
                  placeholder="Any defects observed, uneven roasting, etc."
                />
              </div>
            </div>
          )}
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