'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory } from '@/lib/ledger'
import { getUserEquipment, type Equipment } from '@/lib/equipment'
import { supabase } from '@/lib/supabase'
import { Brain, Coffee, Zap, Thermometer, Scale, Clock, TrendingUp, Loader2, Sparkles, History, Save, Search, Droplets, Timer } from 'lucide-react'
import { BrewTimer } from '@/components/brewing/brew-timer'

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
  // Legacy fields for backward compatibility
  grind_recommendation?: string
  water_temp?: string
  brew_ratio?: number
  
  // New structured fields
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
  
  brewing_steps?: string[] | Array<{
    step_number: number
    time: string
    action: string
    visual_cues: string
    notes: string
  }>
  expected_flavor?: string | {
    taste_notes: string
    body: string
    mouthfeel: string
    optimal_serving_temp: string
  }
  troubleshooting?: string | {
    sour_under_extracted: string
    bitter_over_extracted: string
    weak_thin: string
    equipment_specific_issues: string
  }
  timing_targets?: {
    bloom_time?: string
    total_brew_time?: string
    stages?: string[]
  }
  degassing_note?: string
  coffee_age_notes?: string
  improvement_tips?: string
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
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedCoffee, setSelectedCoffee] = useState<string>('')
  const [brewMethod, setBrewMethod] = useState<string>('Hario V60')
  const [selectedGrinder, setSelectedGrinder] = useState<string>('')
  const [coffeeDose, setCoffeeDose] = useState<number>(20)
  const [brewRatio, setBrewRatio] = useState<number>(15)
  const [targetExtraction, setTargetExtraction] = useState<string>('balanced')
  const [recommendation, setRecommendation] = useState<BrewRecommendation | null>(null)
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSavedProfiles, setShowSavedProfiles] = useState(true)
  const [showBrewTimer, setShowBrewTimer] = useState(false)

  // Calculate water amount based on coffee dose and ratio
  const waterAmount = coffeeDose * brewRatio

  useEffect(() => {
    loadData()
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
    // Adjust brew ratio based on coffee age
    // Note: Water temperature is now handled by AI recommendations based on coffee characteristics
    if (daysOld <= 3) {
      setBrewRatio(16) // Weaker for fresh, potentially over-extractable coffee
    } else if (daysOld <= 14) {
      setBrewRatio(15) // Standard ratio
    } else {
      setBrewRatio(14) // Stronger for older coffee to compensate for flavor loss
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

  const loadData = async () => {
    try {
      // Load coffee inventory
      const inventory = await getCurrentInventory()
      const roasted = inventory.roasted as RoastedCoffee[]
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

  const loadSavedProfiles = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user) return

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .eq('recommendation_type', 'brew_recipe')
        .order('created_at', { ascending: false })

      if (error) throw error

      const profiles = data?.map((rec: any) => ({
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
    if (!selectedCoffee || !selectedGrinder) return

    const coffee = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
    const grinder = equipment.find(e => e.id === selectedGrinder)
    if (!coffee || !grinder) return

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

      // Map grinder brand/model to appropriate type
      const getGrinderType = (brand: string, model: string) => {
        const brandLower = brand.toLowerCase()
        const modelLower = model.toLowerCase()
        
        // Hand grinders
        if (brandLower.includes('commandante') || modelLower.includes('commandante') ||
            brandLower.includes('1zpresso') || modelLower.includes('hand')) {
          return 'burr_hand'
        }
        
        // Electric burr grinders
        if (brandLower.includes('baratza') || brandLower.includes('oxo') ||
            brandLower.includes('fellow') || brandLower.includes('breville')) {
          return 'burr_electric'
        }
        
        // Blade grinders
        if (modelLower.includes('blade') || brandLower.includes('krups')) {
          return 'blade'
        }
        
        // Default to electric burr for unknown grinders
        return 'burr_electric'
      }

      // Extract origin and processing info from coffee name if not available in data
      const extractCoffeeInfo = (coffeeName: string) => {
        const name = coffeeName.toLowerCase()
        
        // Extract origin
        let origin = coffee.origin || 'Unknown'
        if (origin === 'Unknown') {
          if (name.includes('brazil')) origin = 'Brazil'
          else if (name.includes('colombia') || name.includes('colombian')) origin = 'Colombia'
          else if (name.includes('ethiopia') || name.includes('ethiopian')) origin = 'Ethiopia'
          else if (name.includes('kenya') || name.includes('kenyan')) origin = 'Kenya'
          else if (name.includes('guatemala') || name.includes('guatemalan')) origin = 'Guatemala'
          else if (name.includes('costa rica')) origin = 'Costa Rica'
          else if (name.includes('panama') || name.includes('panamanian')) origin = 'Panama'
          else if (name.includes('jamaica')) origin = 'Jamaica'
          else if (name.includes('yemen')) origin = 'Yemen'
        }
        
        // Extract processing method
        let processing = coffee.process || 'Unknown'
        if (processing === 'Unknown') {
          if (name.includes('anaerobic')) processing = 'Anaerobic'
          else if (name.includes('natural')) processing = 'Natural'
          else if (name.includes('honey')) processing = 'Honey'
          else if (name.includes('washed')) processing = 'Washed'
          else if (name.includes('wet process')) processing = 'Washed'
          else if (name.includes('dry process')) processing = 'Natural'
          else processing = 'Washed' // Default assumption
        }
        
        return { origin, processing }
      }
      
      const { origin, processing } = extractCoffeeInfo(coffee.coffee_name)

      const requestBody = {
        coffee_name: coffee.coffee_name,
        coffee_origin: origin,
        roast_level: coffee.roast_level,
        roast_date: coffee.roast_date,
        processing_method: processing,
        brew_method: brewMethod,
        brew_equipment_brand: brewMethod.includes(' ') ? brewMethod.split(' ')[0] : brewMethod,
        brew_equipment_model: brewMethod.includes(' ') ? brewMethod.split(' ').slice(1).join(' ') : '',
        dose_grams: coffeeDose,
        grind_size: 'medium-fine', // Starting point for AI
        water_temp: 200, // Starting point for AI
        brew_ratio: brewRatio,
        target_extraction: targetExtraction,
        water_quality: 'filtered', // Default assumption
        grinder_type: getGrinderType(grinder.brand, grinder.model),
        grinder_brand: grinder.brand,
        grinder_model: grinder.model,
        previous_brews: [],
        user_experience_level: 'intermediate' // Could be made configurable
      }
      
      console.log('Sending brew recipe request:', requestBody)

      const response = await fetch('/api/ai/brew-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
          console.error('API Error Response:', response.status, errorData)
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError)
          const errorText = await response.text()
          console.error('Raw error response:', errorText)
          errorData = { error: `${response.status} ${response.statusText}` }
        }
        throw new Error(errorData.error || errorData.details || `API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('API Response:', data)
      
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

  const handleBrewComplete = (brewData: any) => {
    console.log('Brew completed:', brewData)
    setShowBrewTimer(false)
    // Could save brew log to database here
  }

  const startBrewTimer = () => {
    if (recommendation?.brewing_steps) {
      setShowBrewTimer(true)
    }
  }

  const selectedCoffeeData = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
  const selectedGrinderData = equipment.find(e => e.id === selectedGrinder)

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
                      <p><strong>Roast:</strong> {selectedCoffeeData.roast_level} • <strong>Batch:</strong> #{selectedCoffeeData.batch_number}</p>
                      {selectedCoffeeData.origin && <p><strong>Origin:</strong> {selectedCoffeeData.origin}</p>}
                      {selectedCoffeeData.variety && <p><strong>Variety:</strong> {selectedCoffeeData.variety}</p>}
                      {selectedCoffeeData.process && <p><strong>Process:</strong> {selectedCoffeeData.process}</p>}
                      <p><strong>Age:</strong> {selectedCoffeeData.days_since_roast} days old</p>
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
                      {recommendation.optimal_parameters?.brew_ratio 
                        ? `1:${recommendation.optimal_parameters.brew_ratio}`
                        : recommendation.brew_ratio 
                        ? `1:${recommendation.brew_ratio}`
                        : 'Not specified'
                      }
                    </div>
                  </div>
                </div>

                {/* Expected Flavor */}
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

                {/* Improvement Tips */}
                {recommendation.improvement_tips && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h5 className="font-medium text-indigo-900 mb-2">Improvement Tips</h5>
                    <p className="text-sm text-indigo-800">{recommendation.improvement_tips}</p>
                  </div>
                )}

                {/* Brew Timer Action */}
                {recommendation.brewing_steps && Array.isArray(recommendation.brewing_steps) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-green-900 mb-1">Ready to Brew?</h5>
                        <p className="text-sm text-green-700">Start the guided timer to follow your recipe step-by-step</p>
                      </div>
                      <button
                        onClick={startBrewTimer}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <Timer className="h-4 w-4" />
                        Start Timer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Brew Timer */}
          {showBrewTimer && recommendation?.brewing_steps && Array.isArray(recommendation.brewing_steps) && (
            <div className="mt-8">
              <BrewTimer 
                brewSteps={recommendation.brewing_steps.filter(step => typeof step === 'object') as any[]}
                onBrewComplete={handleBrewComplete}
                totalBrewTime={recommendation.timing_targets?.total_brew_time || undefined}
                coffeeName={selectedCoffee}
                brewMethod={brewMethod}
              />
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