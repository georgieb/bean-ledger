'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory } from '@/lib/ledger'
import { getEquipmentByType } from '@/lib/equipment'
import { supabase } from '@/lib/supabase'
import { Brain, Coffee, Zap, Thermometer, Scale, Clock, TrendingUp, Loader2, Sparkles, History, Save, Search } from 'lucide-react'

interface RoastedCoffee {
  coffee_name: string
  current_amount: number
  roast_date: string
  roast_level: string
  batch_number: number
  days_since_roast: number
}

interface BrewRecommendation {
  grind_recommendation: string
  water_temp: string
  brew_ratio: number
  brewing_steps: string[]
  expected_flavor: string
  troubleshooting: string
  degassing_note?: string
}

interface SavedProfile {
  id: string
  coffee_name: string
  roast_level: string
  coffee_age_range: string
  brew_method: string
  recommendation: BrewRecommendation
  created_at: string
  updated_at: string
}

export default function AIBrewingPage() {
  const [roastedCoffee, setRoastedCoffee] = useState<RoastedCoffee[]>([])
  const [selectedCoffee, setSelectedCoffee] = useState<string>('')
  const [brewMethod, setBrewMethod] = useState<string>('v60')
  const [grindSize, setGrindSize] = useState<string>('')
  const [waterTemp, setWaterTemp] = useState<number>(200)
  const [brewRatio, setBrewRatio] = useState<number>(15)
  const [targetExtraction, setTargetExtraction] = useState<string>('balanced')
  const [recommendation, setRecommendation] = useState<BrewRecommendation | null>(null)
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSavedProfiles, setShowSavedProfiles] = useState(true)

  useEffect(() => {
    loadRoastedCoffee()
    loadSavedProfiles()
  }, [])

  // Update brew parameters when coffee selection changes
  useEffect(() => {
    if (selectedCoffee) {
      const coffee = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
      if (coffee) {
        // Auto-adjust brewing parameters based on coffee age
        adjustParametersForAge(coffee.days_since_roast)
        
        // Check for existing profiles
        checkForExistingProfile(coffee)
      }
    }
  }, [selectedCoffee, roastedCoffee])

  const adjustParametersForAge = (daysOld: number) => {
    // Adjust water temperature based on coffee age
    if (daysOld <= 3) {
      // Fresh coffee - lower temp to avoid over-extraction
      setWaterTemp(185)
    } else if (daysOld <= 7) {
      // Peak flavor window
      setWaterTemp(200)
    } else if (daysOld <= 14) {
      // Starting to lose freshness
      setWaterTemp(205)
    } else {
      // Older coffee - higher temp to extract more
      setWaterTemp(210)
    }

    // Adjust brew ratio based on age
    if (daysOld <= 3) {
      setBrewRatio(16) // Weaker for fresh, potentially over-extractable coffee
    } else if (daysOld <= 14) {
      setBrewRatio(15) // Standard ratio
    } else {
      setBrewRatio(14) // Stronger for older coffee
    }
  }

  const checkForExistingProfile = (coffee: RoastedCoffee) => {
    const ageRange = getAgeRange(coffee.days_since_roast)
    const existingProfile = savedProfiles.find(profile => 
      profile.coffee_name === coffee.coffee_name &&
      profile.roast_level === coffee.roast_level &&
      profile.coffee_age_range === ageRange &&
      profile.brew_method === brewMethod
    )

    if (existingProfile) {
      setRecommendation(existingProfile.recommendation)
      setError(null)
    } else {
      setRecommendation(null)
    }
  }

  const getAgeRange = (daysOld: number): string => {
    if (daysOld <= 3) return '0-3'
    if (daysOld <= 7) return '4-7'
    if (daysOld <= 14) return '8-14'
    return '15+'
  }

  const loadRoastedCoffee = async () => {
    try {
      const inventory = await getCurrentInventory()
      const roasted = inventory.roasted as RoastedCoffee[]
      const availableCoffee = roasted.filter(coffee => coffee.current_amount >= 15)
      setRoastedCoffee(availableCoffee)
      
      if (availableCoffee.length > 0 && !selectedCoffee) {
        setSelectedCoffee(availableCoffee[0].coffee_name)
      }
    } catch (error) {
      console.error('Error loading roasted coffee:', error)
      setError('Failed to load coffee inventory')
    }
  }

  const loadSavedProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getSession()
      if (!user?.user) return

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('recommendation_type', 'brew_recipe')
        .order('created_at', { ascending: false })

      if (error) throw error

      const profiles = data?.map(rec => ({
        id: rec.id,
        coffee_name: rec.input_context.coffee_name,
        roast_level: rec.input_context.roast_level,
        coffee_age_range: getAgeRange(
          Math.floor((new Date().getTime() - new Date(rec.input_context.roast_date).getTime()) / (1000 * 60 * 60 * 24))
        ),
        brew_method: rec.input_context.brew_method,
        recommendation: rec.recommendation,
        created_at: rec.created_at,
        updated_at: rec.created_at
      })) || []

      setSavedProfiles(profiles)
    } catch (error) {
      console.error('Error loading saved profiles:', error)
    }
  }

  const getBrewRecommendation = async () => {
    if (!selectedCoffee) return

    const coffee = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
    if (!coffee) return

    // Check if we already have this profile
    const ageRange = getAgeRange(coffee.days_since_roast)
    const existingProfile = savedProfiles.find(profile => 
      profile.coffee_name === coffee.coffee_name &&
      profile.roast_level === coffee.roast_level &&
      profile.coffee_age_range === ageRange &&
      profile.brew_method === brewMethod
    )

    if (existingProfile) {
      setRecommendation(existingProfile.recommendation)
      setError('Using saved profile (no API call needed)')
      setTimeout(() => setError(null), 3000)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
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
          roast_level: coffee.roast_level,
          roast_date: coffee.roast_date,
          brew_method: brewMethod,
          grind_size: grindSize,
          water_temp: waterTemp,
          brew_ratio: brewRatio,
          target_extraction: targetExtraction
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setRecommendation(data.recommendation)
        // Reload saved profiles to include the new one
        await loadSavedProfiles()
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

  const applyProfile = (profile: SavedProfile) => {
    setRecommendation(profile.recommendation)
    setSelectedCoffee(profile.coffee_name)
    setBrewMethod(profile.brew_method)
    setError('Applied saved profile')
    setTimeout(() => setError(null), 2000)
  }

  const selectedCoffeeData = roastedCoffee.find(c => c.coffee_name === selectedCoffee)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Brewing Assistant</h1>
          <p className="text-gray-600 mt-1">Get Claude-powered brewing recommendations and save profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">AI Powered</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Brewing Parameters */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Brewing Parameters</h3>
            
            {roastedCoffee.length === 0 ? (
              <div className="text-center py-8">
                <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No roasted coffee available</p>
                <p className="text-sm text-gray-400 mt-1">Complete some roasts to get AI brewing recommendations</p>
              </div>
            ) : (
              <div className="space-y-4">
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
                      <p><strong>Roast:</strong> {selectedCoffeeData.roast_level} • <strong>Age:</strong> {selectedCoffeeData.days_since_roast} days</p>
                      <p><strong>Freshness Status:</strong> {
                        selectedCoffeeData.days_since_roast <= 3 ? '🔥 Very Fresh (needs degassing)' :
                        selectedCoffeeData.days_since_roast <= 7 ? '✨ Peak Freshness' :
                        selectedCoffeeData.days_since_roast <= 14 ? '👍 Good' : '⚠️ Past Prime'
                      }</p>
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
                    <option value="v60">Hario V60</option>
                    <option value="chemex">Chemex</option>
                    <option value="french_press">French Press</option>
                    <option value="aeropress">AeroPress</option>
                    <option value="espresso">Espresso</option>
                    <option value="cold_brew">Cold Brew</option>
                  </select>
                </div>

                {/* Current Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Grind</label>
                    <input
                      type="text"
                      value={grindSize}
                      onChange={(e) => setGrindSize(e.target.value)}
                      placeholder="e.g., medium-fine, 7/15"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Water Temp (°C)</label>
                    <input
                      type="number"
                      value={waterTemp}
                      onChange={(e) => setWaterTemp(Number(e.target.value))}
                      min="80"
                      max="100"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
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
                </div>

                <button
                  onClick={getBrewRecommendation}
                  disabled={isLoading || !selectedCoffee}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting AI Recommendation...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Get AI Recommendation
                    </>
                  )}
                </button>

                {error && (
                  <div className={`text-sm mt-2 p-3 rounded-lg ${
                    error.includes('saved profile') || error.includes('Applied') 
                      ? 'text-green-600 bg-green-50 border border-green-200'
                      : 'text-red-600 bg-red-50 border border-red-200'
                  }`}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Recommendations Display */}
          {recommendation && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">AI Brewing Recommendation</h3>
              </div>

              <div className="space-y-4">
                {/* Quick Settings */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <Scale className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-sm font-medium text-purple-900">Grind</div>
                    <div className="text-xs text-purple-700">{recommendation.grind_recommendation}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <Thermometer className="h-5 w-5 text-red-600 mx-auto mb-1" />
                    <div className="text-sm font-medium text-red-900">Water</div>
                    <div className="text-xs text-red-700">{recommendation.water_temp}°C</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-sm font-medium text-blue-900">Ratio</div>
                    <div className="text-xs text-blue-700">1:{recommendation.brew_ratio}</div>
                  </div>
                </div>

                {/* Expected Flavor */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h5 className="font-medium text-amber-900 mb-2">Expected Flavor</h5>
                  <p className="text-sm text-amber-800">{recommendation.expected_flavor}</p>
                </div>

                {/* Brewing Steps */}
                {recommendation.brewing_steps && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Brewing Steps
                    </h5>
                    <ol className="space-y-1 text-sm">
                      {recommendation.brewing_steps.map((step, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="bg-purple-100 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Troubleshooting */}
                {recommendation.troubleshooting && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Troubleshooting Tips</h5>
                    <p className="text-sm text-gray-700">{recommendation.troubleshooting}</p>
                  </div>
                )}

                {/* Degassing Note */}
                {recommendation.degassing_note && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 mb-2">Freshness Note</h5>
                    <p className="text-sm text-green-800">{recommendation.degassing_note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Saved Profiles Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Saved Profiles</h3>
              </div>
              <button
                onClick={() => setShowSavedProfiles(!showSavedProfiles)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showSavedProfiles ? 'Hide' : 'Show'}
              </button>
            </div>

            {showSavedProfiles && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedProfiles.length === 0 ? (
                  <p className="text-gray-500 text-sm">No saved profiles yet</p>
                ) : (
                  savedProfiles.slice(0, 10).map((profile) => (
                    <div 
                      key={profile.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => applyProfile(profile)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">{profile.coffee_name}</span>
                        <span className="text-xs text-gray-500">{profile.coffee_age_range}d</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Method:</strong> {profile.brew_method}</p>
                        <p><strong>Level:</strong> {profile.roast_level}</p>
                        <p className="text-green-600">Click to apply</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {savedProfiles.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Save className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Profile Benefits</span>
              </div>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Saves API credits by reusing recommendations</li>
                <li>• Instant access to proven recipes</li>
                <li>• Age-specific recommendations</li>
                <li>• {savedProfiles.length} profiles saved so far</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}