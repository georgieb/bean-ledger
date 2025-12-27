'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory } from '@/lib/ledger'
import { getUserEquipment, type Equipment } from '@/lib/equipment'
import { supabase } from '@/lib/supabase'
import { Brain, Coffee, Zap, Thermometer, Scale, Clock, TrendingUp, Loader2, Sparkles, Droplets } from 'lucide-react'

interface RoastedCoffee {
  coffee_name: string
  current_amount: number
  roast_date: string
  roast_level: string
  batch_number: number
  days_since_roast: number
  origin?: string
  process?: string
  variety?: string
}

interface BrewRecommendation {
  equipment_analysis?: {
    brewing_method: string
    equipment_specific_notes: string
    filter_type: string
    optimal_batch_size: string
  }
  optimal_parameters?: {
    grind_size: string
    dose_grams: number
    water_temp_celsius: number
    brew_ratio: number
    total_water_grams: number
    water_quality_notes: string
  }
  brewing_steps?: Array<{
    step_number: number
    time: string
    action: string
    visual_cues: string
    notes: string
  }>
  timing_targets?: {
    bloom_time: string
    total_brew_time: string
    stages: string[]
  }
  expected_flavor?: {
    taste_notes: string
    body: string
    mouthfeel: string
    optimal_serving_temp: string
  }
  troubleshooting?: {
    sour_under_extracted: string
    bitter_over_extracted: string
    weak_thin: string
    equipment_specific_issues: string
  }
  degassing_note?: string
  coffee_age_notes?: string
  improvement_tips?: string
  advanced_techniques?: string
  // Legacy fields for backward compatibility
  grind_recommendation?: string
  water_temp?: string
  brew_ratio?: number
}

export function BrewOptimizer() {
  const [roastedCoffee, setRoastedCoffee] = useState<RoastedCoffee[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedCoffee, setSelectedCoffee] = useState<string>('')
  const [brewMethod, setBrewMethod] = useState<string>('Hario V60')
  const [selectedGrinder, setSelectedGrinder] = useState<string>('')
  const [coffeeDose, setCoffeeDose] = useState<number>(20)
  const [brewRatio, setBrewRatio] = useState<number>(15)
  const [targetExtraction, setTargetExtraction] = useState<string>('balanced')
  const [recommendation, setRecommendation] = useState<BrewRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load coffee inventory
      const inventory = await getCurrentInventory()
      const roasted = inventory.roasted as RoastedCoffee[]
      // Only show coffees with sufficient amount
      const availableCoffee = roasted.filter(coffee => coffee.current_amount >= 15)
      setRoastedCoffee(availableCoffee)
      
      if (availableCoffee.length > 0 && !selectedCoffee) {
        setSelectedCoffee(availableCoffee[0].coffee_name)
      }

      // Load grinder equipment
      const userEquipment = await getUserEquipment()
      const grinders = userEquipment.filter(eq => eq.type === 'grinder')
      setEquipment(grinders)
      
      if (grinders.length > 0 && !selectedGrinder) {
        setSelectedGrinder(grinders[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load coffee inventory or equipment')
    }
  }

  // Calculate water amount based on coffee dose and ratio
  const waterAmount = coffeeDose * brewRatio

  const getBrewRecommendation = async () => {
    if (!selectedCoffee || !selectedGrinder) return

    const coffee = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
    const grinder = equipment.find(e => e.id === selectedGrinder)
    if (!coffee || !grinder) return

    setIsLoading(true)
    setError(null)

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/ai/brew-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          coffee_name: coffee.coffee_name,
          coffee_origin: coffee.origin || 'Unknown',
          roast_level: coffee.roast_level,
          roast_date: coffee.roast_date,
          processing_method: coffee.process || 'Unknown',
          brew_method: brewMethod,
          dose_grams: coffeeDose,
          brew_ratio: brewRatio,
          target_extraction: targetExtraction,
          grinder_type: grinder.type,
          grinder_brand: grinder.brand,
          grinder_model: grinder.model,
          user_experience_level: 'intermediate' // Could be made configurable
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setRecommendation(data.recommendation)
      } else {
        throw new Error(data.error || 'Failed to get recommendation')
      }
    } catch (error) {
      console.error('Error getting brew recommendation:', error)
      setError(error instanceof Error ? error.message : 'Failed to get recommendation')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCoffeeData = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
  const selectedGrinderData = equipment.find(e => e.id === selectedGrinder)

  if (roastedCoffee.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Brew Optimizer</h3>
        </div>
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No roasted coffee available</p>
          <p className="text-sm text-gray-400 mt-1">Complete some roasts to get AI-powered brewing recommendations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Brew Optimizer</h3>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </div>
        <p className="text-sm text-gray-600">Get Claude-powered brewing recommendations based on your coffee and equipment</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Parameters */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Brewing Parameters</h4>
            
            {/* Coffee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coffee</label>
              <select
                value={selectedCoffee}
                onChange={(e) => setSelectedCoffee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {roastedCoffee.map(coffee => (
                  <option key={coffee.coffee_name} value={coffee.coffee_name}>
                    {coffee.coffee_name} ({coffee.current_amount}g, {coffee.days_since_roast}d old)
                  </option>
                ))}
              </select>
              {selectedCoffeeData && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                  <p><strong>Roast:</strong> {selectedCoffeeData.roast_level} • <strong>Batch:</strong> #{selectedCoffeeData.batch_number}</p>
                  {selectedCoffeeData.origin && <p><strong>Origin:</strong> {selectedCoffeeData.origin}</p>}
                  {selectedCoffeeData.variety && <p><strong>Variety:</strong> {selectedCoffeeData.variety}</p>}
                  {selectedCoffeeData.process && <p><strong>Process:</strong> {selectedCoffeeData.process}</p>}
                  <p><strong>Age:</strong> {selectedCoffeeData.days_since_roast} days old</p>
                </div>
              )}
            </div>

            {/* Brew Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brew Method</label>
              <select
                value={brewMethod}
                onChange={(e) => setBrewMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="Hario V60">Hario V60</option>
                <option value="Hario Switch">Hario Switch</option>
                <option value="Kalita Wave">Kalita Wave</option>
                <option value="Chemex">Chemex</option>
                <option value="French Press">French Press</option>
                <option value="AeroPress">AeroPress</option>
                <option value="Espresso">Espresso</option>
                <option value="Moka Pot">Moka Pot</option>
              </select>
            </div>

            {/* Grinder Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grinder</label>
              <select
                value={selectedGrinder}
                onChange={(e) => setSelectedGrinder(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {equipment.map(grinder => (
                  <option key={grinder.id} value={grinder.id}>
                    {grinder.brand} {grinder.model}
                  </option>
                ))}
              </select>
              {equipment.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No grinders configured. Add equipment to get grinder-specific recommendations.</p>
              )}
              {selectedGrinderData && (
                <div className="mt-2 p-2 bg-orange-50 rounded text-xs space-y-1">
                  <p><strong>Type:</strong> {selectedGrinderData.type}</p>
                  <p><strong>Model:</strong> {selectedGrinderData.brand} {selectedGrinderData.model}</p>
                  {selectedGrinderData.settings_schema?.grind_range && (
                    <p><strong>Grind Range:</strong> {selectedGrinderData.settings_schema.grind_range.min}-{selectedGrinderData.settings_schema.grind_range.max}</p>
                  )}
                </div>
              )}
            </div>

            {/* Dosing Parameters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coffee Dose (g)</label>
                <input
                  type="number"
                  value={coffeeDose}
                  onChange={(e) => setCoffeeDose(Number(e.target.value))}
                  min="10"
                  max="60"
                  step="0.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ratio (1:X)</label>
                <input
                  type="number"
                  value={brewRatio}
                  onChange={(e) => setBrewRatio(Number(e.target.value))}
                  min="10"
                  max="20"
                  step="0.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                />
              </div>
            </div>

            {/* Water Amount Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Droplets className="h-4 w-4" />
                <span className="text-sm font-medium">Water Amount: {waterAmount}g</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {coffeeDose}g coffee × {brewRatio} ratio = {waterAmount}g water
              </p>
            </div>

            {/* Target Extraction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Profile</label>
              <select
                value={targetExtraction}
                onChange={(e) => setTargetExtraction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              >
                <option value="bright">Bright & Acidic</option>
                <option value="balanced">Balanced</option>
                <option value="sweet">Sweet & Rich</option>
                <option value="bold">Bold & Strong</option>
              </select>
            </div>

            <button
              onClick={getBrewRecommendation}
              disabled={isLoading || !selectedCoffee || !selectedGrinder}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Get AI Recommendation
                </>
              )}
            </button>

            {error && (
              <div className="text-red-600 text-sm mt-2 p-3 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Recommendations Display */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">AI Recommendations</h4>
            
            {recommendation ? (
              <div className="space-y-4">
                {/* Quick Settings */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <Scale className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-sm font-medium text-purple-900">Grind</div>
                    <div className="text-xs text-purple-700">
                      {recommendation.optimal_parameters?.grind_size || recommendation.grind_recommendation || 'Not specified'}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <Thermometer className="h-5 w-5 text-red-600 mx-auto mb-1" />
                    <div className="text-sm font-medium text-red-900">Water</div>
                    <div className="text-xs text-red-700">
                      {recommendation.optimal_parameters?.water_temp_celsius 
                        ? `${recommendation.optimal_parameters.water_temp_celsius}°C`
                        : recommendation.water_temp 
                        ? `${recommendation.water_temp}°C`
                        : 'Not specified'
                      }
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-sm font-medium text-blue-900">Ratio</div>
                    <div className="text-xs text-blue-700">
                      1:{recommendation.optimal_parameters?.brew_ratio || recommendation.brew_ratio || 'Not specified'}
                    </div>
                  </div>
                </div>

                {/* Expected Flavor */}
                {(recommendation.expected_flavor || typeof recommendation.expected_flavor === 'string') && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h5 className="font-medium text-amber-900 mb-2">Expected Flavor</h5>
                    {typeof recommendation.expected_flavor === 'object' && recommendation.expected_flavor ? (
                      <div className="space-y-2 text-sm text-amber-800">
                        <div><strong>Taste Notes:</strong> {recommendation.expected_flavor.taste_notes}</div>
                        <div><strong>Body:</strong> {recommendation.expected_flavor.body}</div>
                        <div><strong>Mouthfeel:</strong> {recommendation.expected_flavor.mouthfeel}</div>
                        <div><strong>Serving Temp:</strong> {recommendation.expected_flavor.optimal_serving_temp}</div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-800">{recommendation.expected_flavor as string}</p>
                    )}
                  </div>
                )}

                {/* Brewing Steps */}
                {recommendation.brewing_steps && Array.isArray(recommendation.brewing_steps) && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Brewing Steps
                    </h5>
                    <ol className="space-y-3 text-sm">
                      {recommendation.brewing_steps.map((step, index) => (
                        <li key={index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <span className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                              {typeof step === 'object' ? step.step_number : index + 1}
                            </span>
                            <div className="flex-1">
                              {typeof step === 'object' ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{step.action}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{step.time}</span>
                                  </div>
                                  {step.visual_cues && (
                                    <div className="text-xs text-blue-600">👁️ {step.visual_cues}</div>
                                  )}
                                  {step.notes && (
                                    <div className="text-xs text-gray-600">💡 {step.notes}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-700">{step}</span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Troubleshooting */}
                {recommendation.troubleshooting && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Troubleshooting Tips</h5>
                    {typeof recommendation.troubleshooting === 'object' ? (
                      <div className="space-y-2 text-sm text-gray-700">
                        {recommendation.troubleshooting.sour_under_extracted && (
                          <div><strong>If sour/under-extracted:</strong> {recommendation.troubleshooting.sour_under_extracted}</div>
                        )}
                        {recommendation.troubleshooting.bitter_over_extracted && (
                          <div><strong>If bitter/over-extracted:</strong> {recommendation.troubleshooting.bitter_over_extracted}</div>
                        )}
                        {recommendation.troubleshooting.weak_thin && (
                          <div><strong>If weak/thin:</strong> {recommendation.troubleshooting.weak_thin}</div>
                        )}
                        {recommendation.troubleshooting.equipment_specific_issues && (
                          <div><strong>Equipment-specific:</strong> {recommendation.troubleshooting.equipment_specific_issues}</div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">{recommendation.troubleshooting as string}</p>
                    )}
                  </div>
                )}

                {/* Coffee Age Notes */}
                {(recommendation.coffee_age_notes || recommendation.degassing_note) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 mb-2">Coffee Age & Freshness</h5>
                    <p className="text-sm text-green-800">
                      {recommendation.coffee_age_notes || recommendation.degassing_note}
                    </p>
                  </div>
                )}

                {/* Additional Sections for New Format */}
                {recommendation.timing_targets && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Timing Targets</h5>
                    <div className="space-y-1 text-sm text-blue-800">
                      {recommendation.timing_targets.bloom_time && (
                        <div><strong>Bloom:</strong> {recommendation.timing_targets.bloom_time}</div>
                      )}
                      {recommendation.timing_targets.total_brew_time && (
                        <div><strong>Total Time:</strong> {recommendation.timing_targets.total_brew_time}</div>
                      )}
                      {recommendation.timing_targets.stages && (
                        <div><strong>Stages:</strong> {recommendation.timing_targets.stages.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {recommendation.improvement_tips && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h5 className="font-medium text-indigo-900 mb-2">Improvement Tips</h5>
                    <p className="text-sm text-indigo-800">{recommendation.improvement_tips}</p>
                  </div>
                )}

                {recommendation.advanced_techniques && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                    <h5 className="font-medium text-violet-900 mb-2">Advanced Techniques</h5>
                    <p className="text-sm text-violet-800">{recommendation.advanced_techniques}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>Select your coffee and parameters, then get AI-powered brewing recommendations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}