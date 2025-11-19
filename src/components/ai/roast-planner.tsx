'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory } from '@/lib/ledger'
import { getUserEquipment, type Equipment } from '@/lib/equipment'
import { supabase } from '@/lib/supabase'
import { Zap, Coffee, Settings, Thermometer, Clock, Target, Loader2, Sparkles, History, Save } from 'lucide-react'

interface GreenCoffee {
  coffee_name: string
  current_amount: number
  origin: string
  variety?: string
  process?: string
}

interface RoastStep {
  time: string
  settings: Record<string, any>
  temperature: string
  notes: string
}

interface RoastProfile {
  bean_analysis: string
  equipment_protocol: string
  roast_profile: RoastStep[]
  expected_flavor: string
  troubleshooting: string
  total_duration: string
  critical_timings: string[]
}

interface SavedPlan {
  id: string
  coffee_name: string
  roast_goal: string
  equipment_type: string
  batch_weight: number
  profile: RoastProfile
  created_at: string
}

export function RoastPlanner() {
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([])
  
  // Form state
  const [selectedCoffee, setSelectedCoffee] = useState<string>('')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('')
  const [batchWeight, setBatchWeight] = useState<number>(200)
  const [roastGoal, setRoastGoal] = useState<string>('balanced')
  const [roomTemp, setRoomTemp] = useState<number>(70)
  const [altitude, setAltitude] = useState<string>('')
  const [processingMethod, setProcessingMethod] = useState<string>('')
  
  const [profile, setProfile] = useState<RoastProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSavedPlans, setShowSavedPlans] = useState(true)

  useEffect(() => {
    loadData()
    loadSavedPlans()
  }, [])

  useEffect(() => {
    checkForExistingPlan()
  }, [selectedCoffee, selectedEquipment, roastGoal, batchWeight])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load green coffee inventory
      const inventory = await getCurrentInventory()
      setGreenCoffee(inventory.green)

      // Load roasting equipment
      const roasters = await getUserEquipment()
      const roastingEquipment = roasters.filter(eq => eq.type === 'roaster')
      setEquipment(roastingEquipment)

      // Set defaults
      if (inventory.green.length > 0 && !selectedCoffee) {
        setSelectedCoffee(inventory.green[0].coffee_name)
      }
      if (roastingEquipment.length > 0 && !selectedEquipment) {
        setSelectedEquipment(roastingEquipment[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadSavedPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getSession()
      if (!user?.user) return

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('recommendation_type', 'roast_planning')
        .order('created_at', { ascending: false })

      if (error) throw error

      const plans = data?.map(rec => ({
        id: rec.id,
        coffee_name: rec.input_context.green_coffee_name,
        roast_goal: rec.input_context.roast_goal,
        equipment_type: `${rec.input_context.equipment_brand} ${rec.input_context.equipment_model}`,
        batch_weight: rec.input_context.batch_weight,
        profile: rec.recommendation,
        created_at: rec.created_at
      })) || []

      setSavedPlans(plans)
    } catch (error) {
      console.error('Error loading saved plans:', error)
    }
  }

  const checkForExistingPlan = () => {
    if (!selectedCoffee || !selectedEquipment || !roastGoal) return

    const selectedEq = equipment.find(eq => eq.id === selectedEquipment)
    if (!selectedEq) return

    const equipmentType = `${selectedEq.brand} ${selectedEq.model}`
    const weightRange = getWeightRange(batchWeight)
    
    const existingPlan = savedPlans.find(plan => 
      plan.coffee_name === selectedCoffee &&
      plan.roast_goal === roastGoal &&
      plan.equipment_type === equipmentType &&
      getWeightRange(plan.batch_weight) === weightRange
    )

    if (existingPlan) {
      setProfile(existingPlan.profile)
      setError('Using saved roast plan (no API call needed)')
      setTimeout(() => setError(null), 3000)
    } else {
      setProfile(null)
    }
  }

  const getWeightRange = (weight: number): string => {
    if (weight < 150) return 'small'
    if (weight <= 200) return 'medium'
    if (weight <= 250) return 'large'
    return 'xlarge'
  }

  const generateRoastProfile = async () => {
    if (!selectedCoffee || !selectedEquipment) return

    const coffee = greenCoffee.find(c => c.coffee_name === selectedCoffee)
    const eq = equipment.find(e => e.id === selectedEquipment)
    if (!coffee || !eq) return

    setLoadingAI(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/ai/roast-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          green_coffee_name: coffee.coffee_name,
          green_coffee_origin: coffee.origin,
          processing_method: processingMethod || coffee.process || 'Unknown',
          altitude: altitude,
          batch_weight: batchWeight,
          roast_goal: roastGoal,
          equipment_brand: eq.brand,
          equipment_model: eq.model,
          equipment_settings: eq.settings_schema,
          room_temperature: roomTemp,
          has_extension_tube: eq.settings_schema?.has_extension_tube || false,
          user_preferences: {
            experience_level: 'intermediate',
            preferred_development: 'standard'
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setProfile(data.profile)
        await loadSavedPlans()
      } else {
        throw new Error(data.error || 'Failed to generate profile')
      }
    } catch (error) {
      console.error('Error generating roast profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate profile')
    } finally {
      setLoadingAI(false)
    }
  }

  const applyPlan = (savedPlan: SavedPlan) => {
    setProfile(savedPlan.profile)
    setSelectedCoffee(savedPlan.coffee_name)
    setRoastGoal(savedPlan.roast_goal)
    setBatchWeight(savedPlan.batch_weight)
    setError('Applied saved roast plan')
    setTimeout(() => setError(null), 2000)
  }

  const selectedCoffeeData = greenCoffee.find(c => c.coffee_name === selectedCoffee)
  const selectedEquipmentData = equipment.find(e => e.id === selectedEquipment)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Roast Planner</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (greenCoffee.length === 0 || equipment.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Roast Planner</h3>
        </div>
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {greenCoffee.length === 0 ? 'No green coffee available' : 'No roasting equipment configured'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {greenCoffee.length === 0 
              ? 'Purchase green coffee to start planning roasts'
              : 'Add roasting equipment to generate profiles'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Roast Planner</h1>
          <p className="text-gray-600 mt-1">Generate equipment-specific roast profiles with AI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-900">Profile Generator</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Planning Parameters */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Roast Planning Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coffee Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Green Coffee</label>
                <select
                  value={selectedCoffee}
                  onChange={(e) => setSelectedCoffee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {greenCoffee.map(coffee => (
                    <option key={coffee.coffee_name} value={coffee.coffee_name}>
                      {coffee.coffee_name} ({coffee.current_amount}g available)
                    </option>
                  ))}
                </select>
                {selectedCoffeeData && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                    <p><strong>Origin:</strong> {selectedCoffeeData.origin}</p>
                    {selectedCoffeeData.variety && <p><strong>Variety:</strong> {selectedCoffeeData.variety}</p>}
                    {selectedCoffeeData.process && <p><strong>Process:</strong> {selectedCoffeeData.process}</p>}
                  </div>
                )}
              </div>

              {/* Equipment Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Roasting Equipment</label>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {equipment.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.brand} {eq.model}
                    </option>
                  ))}
                </select>
                {selectedEquipmentData && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs space-y-1">
                    <p><strong>Type:</strong> {selectedEquipmentData.type}</p>
                    {selectedEquipmentData.settings_schema.batch_capacity && (
                      <p><strong>Capacity:</strong> {selectedEquipmentData.settings_schema.batch_capacity.min}-{selectedEquipmentData.settings_schema.batch_capacity.max}g</p>
                    )}
                  </div>
                )}
              </div>

              {/* Roast Parameters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Weight (g)</label>
                <input
                  type="number"
                  value={batchWeight}
                  onChange={(e) => setBatchWeight(Number(e.target.value))}
                  min="100"
                  max="500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roast Goal</label>
                <select
                  value={roastGoal}
                  onChange={(e) => setRoastGoal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="acidity-forward">Acidity-Forward</option>
                  <option value="balanced">Balanced</option>
                  <option value="chocolaty">Chocolaty</option>
                  <option value="smoky">Smoky/Full-Bodied</option>
                  <option value="light">Light Roast</option>
                  <option value="medium">Medium Roast</option>
                  <option value="dark">Dark Roast</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Temperature (°F)</label>
                <input
                  type="number"
                  value={roomTemp}
                  onChange={(e) => setRoomTemp(Number(e.target.value))}
                  min="50"
                  max="90"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Processing Method (Optional)</label>
                <select
                  value={processingMethod}
                  onChange={(e) => setProcessingMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Auto-detect</option>
                  <option value="washed">Washed</option>
                  <option value="natural">Natural</option>
                  <option value="honey">Honey Process</option>
                  <option value="semi-washed">Semi-Washed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Altitude (Optional)</label>
                <input
                  type="text"
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                  placeholder="e.g., 1200-1400m"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <button
              onClick={generateRoastProfile}
              disabled={loadingAI || !selectedCoffee || !selectedEquipment}
              className="w-full mt-6 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loadingAI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Roast Profile...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI Roast Profile
                </>
              )}
            </button>

            {error && (
              <div className={`text-sm mt-3 p-3 rounded-lg ${
                error.includes('saved plan') || error.includes('Applied') 
                  ? 'text-green-600 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}>
                {error}
              </div>
            )}
          </div>

          {/* Generated Profile Display */}
          {profile && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Generated Roast Profile</h3>
              </div>

              {/* Bean Analysis */}
              {profile.bean_analysis && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Bean Analysis</h4>
                  <p className="text-sm text-green-800">{profile.bean_analysis}</p>
                </div>
              )}

              {/* Equipment Protocol */}
              {profile.equipment_protocol && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Equipment Setup</h4>
                  <p className="text-sm text-orange-800">{profile.equipment_protocol}</p>
                </div>
              )}

              {/* Roast Profile Table */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Step-by-Step Profile
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left border-b">Time</th>
                        <th className="px-3 py-2 text-left border-b">Settings</th>
                        <th className="px-3 py-2 text-left border-b">Temperature</th>
                        <th className="px-3 py-2 text-left border-b">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.roast_profile && profile.roast_profile.length > 0 ? profile.roast_profile.map((step, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="px-3 py-2 font-medium">{step?.time || 'N/A'}</td>
                          <td className="px-3 py-2">
                            {step.settings && Object.entries(step.settings).map(([key, value]) => (
                              <span key={key} className="inline-block mr-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {key}: {value}
                              </span>
                            ))}
                          </td>
                          <td className="px-3 py-2">{step?.temperature || 'N/A'}</td>
                          <td className="px-3 py-2 text-gray-600">{step?.notes || ''}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                            No roast profile steps available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expected Flavor */}
              {profile.expected_flavor && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Expected Flavor Profile</h4>
                  <p className="text-sm text-purple-800">{profile.expected_flavor}</p>
                </div>
              )}

              {/* Critical Timings */}
              {profile.critical_timings && profile.critical_timings.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Critical Timings</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {profile.critical_timings.map((timing, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Target className="h-3 w-3" />
                        {timing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Troubleshooting */}
              {profile.troubleshooting && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Troubleshooting & Tips</h4>
                  <p className="text-sm text-yellow-800">{profile.troubleshooting}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Saved Plans Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Saved Plans</h3>
              </div>
              <button
                onClick={() => setShowSavedPlans(!showSavedPlans)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showSavedPlans ? 'Hide' : 'Show'}
              </button>
            </div>

            {showSavedPlans && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedPlans.length === 0 ? (
                  <p className="text-gray-500 text-sm">No saved plans yet</p>
                ) : (
                  savedPlans.slice(0, 10).map((plan) => (
                    <div 
                      key={plan.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => applyPlan(plan)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">{plan.coffee_name}</span>
                        <span className="text-xs text-gray-500">{plan.batch_weight}g</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Goal:</strong> {plan.roast_goal}</p>
                        <p><strong>Equipment:</strong> {plan.equipment_type}</p>
                        <p className="text-orange-600">Click to apply</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {savedPlans.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Save className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Planning Benefits</span>
              </div>
              <ul className="text-xs text-orange-800 space-y-1">
                <li>• Saves API credits with cached profiles</li>
                <li>• Equipment-specific settings optimization</li>
                <li>• Consistent results with proven recipes</li>
                <li>• {savedPlans.length} roast plans saved</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}