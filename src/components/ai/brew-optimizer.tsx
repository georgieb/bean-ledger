'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory } from '@/lib/ledger'
import { getEquipmentByType, getEquipmentRecommendations } from '@/lib/equipment'
import { supabase } from '@/lib/supabase'
import { Brain, Coffee, Zap, Thermometer, Scale, Clock, TrendingUp, Loader2, Sparkles } from 'lucide-react'

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

export function BrewOptimizer() {
  const [roastedCoffee, setRoastedCoffee] = useState<RoastedCoffee[]>([])
  const [selectedCoffee, setSelectedCoffee] = useState<string>('')
  const [brewMethod, setBrewMethod] = useState<string>('v60')
  const [grindSize, setGrindSize] = useState<string>('')
  const [waterTemp, setWaterTemp] = useState<number>(200)
  const [brewRatio, setBrewRatio] = useState<number>(15)
  const [targetExtraction, setTargetExtraction] = useState<string>('balanced')
  const [recommendation, setRecommendation] = useState<BrewRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoastedCoffee()
  }, [])

  const loadRoastedCoffee = async () => {
    try {
      const inventory = await getCurrentInventory()
      const roasted = inventory.roasted as RoastedCoffee[]
      // Only show coffees with sufficient amount
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

  const getBrewRecommendation = async () => {
    if (!selectedCoffee) return

    const coffee = roastedCoffee.find(c => c.coffee_name === selectedCoffee)
    if (!coffee) return

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
                <p className="text-xs text-gray-500 mt-1">
                  {selectedCoffeeData.roast_level} roast • Batch #{selectedCoffeeData.batch_number}
                </p>
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