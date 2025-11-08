'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory, createConsumptionEntry, type ConsumptionEntry } from '@/lib/ledger'
import { Coffee, Star, Clock, TrendingDown, Zap, ArrowRight } from 'lucide-react'

interface RoastedCoffee {
  coffee_name: string
  current_amount: number
  roast_date: string
  roast_level: string
  batch_number: number
  days_since_roast: number
}

interface RecommendationScore {
  coffee: RoastedCoffee
  score: number
  age: number
  daysRemaining: number
  status: 'PEAK' | 'SWEET SPOT' | 'DEGASSING' | 'AGING' | 'URGENT'
  statusColor: string
  reasoning: string[]
}

function daysSince(dateString: string): number {
  const roastDate = new Date(dateString)
  const today = new Date()
  const diffTime = today.getTime() - roastDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function DrinkRecommendation() {
  const [roastedCoffee, setRoastedCoffee] = useState<RoastedCoffee[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([])
  const [loading, setLoading] = useState(true)
  const [consuming, setConsuming] = useState<string | null>(null)

  // Default daily consumption (should come from user preferences)
  const dailyConsumption = 30 // grams per day

  useEffect(() => {
    loadRecommendations()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const inventory = await getCurrentInventory()
      setRoastedCoffee(inventory.roasted)
      
      // Calculate recommendations
      const scored = calculateDrinkRecommendations(inventory.roasted, dailyConsumption)
      setRecommendations(scored)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDrinkRecommendations = (coffees: RoastedCoffee[], dailyConsumption: number): RecommendationScore[] => {
    return coffees.map(coffee => {
      const age = coffee.days_since_roast
      const daysRemaining = Math.floor(coffee.current_amount / dailyConsumption)
      
      let score = 0
      let status: RecommendationScore['status'] = 'AGING'
      let statusColor = 'bg-gray-100 text-gray-800'
      const reasoning: string[] = []
      
      // Age scoring (peak = highest)
      if (age >= 8 && age <= 10) {
        score += 100
        status = 'PEAK'
        statusColor = 'bg-green-100 text-green-800'
        reasoning.push('Perfect age for optimal flavor development')
      } else if (age >= 7 && age <= 13) {
        score += 80
        status = 'SWEET SPOT'
        statusColor = 'bg-blue-100 text-blue-800'
        reasoning.push('In the sweet spot for excellent taste')
      } else if (age < 7) {
        score += 20
        status = 'DEGASSING'
        statusColor = 'bg-yellow-100 text-yellow-800'
        reasoning.push('Still degassing, but ready to drink')
      } else if (age <= 21) {
        score += 60
        status = 'AGING'
        statusColor = 'bg-amber-100 text-amber-800'
        reasoning.push('Aging but still good quality')
      } else {
        score += 30
        statusColor = 'bg-orange-100 text-orange-800'
        reasoning.push('Getting older, should use soon')
      }
      
      // Urgency scoring - critical if running out
      if (daysRemaining <= 1) {
        score += 200 // Override other factors
        status = 'URGENT'
        statusColor = 'bg-red-100 text-red-800'
        reasoning.unshift('Very low stock - urgent!')
      } else if (daysRemaining <= 3) {
        score += 50
        reasoning.push('Running low, should prioritize')
      }
      
      // Small preference for variety
      // TODO: Could check yesterday's consumption to avoid repeats
      
      return {
        coffee,
        score,
        age,
        daysRemaining,
        status,
        statusColor,
        reasoning
      }
    })
    .sort((a, b) => b.score - a.score) // Highest score first
    .slice(0, 3) // Top 3 recommendations
  }

  const handleQuickBrew = async (coffee: RoastedCoffee, amount: number) => {
    setConsuming(coffee.coffee_name)
    try {
      const consumptionEntry: ConsumptionEntry = {
        coffee_name: coffee.coffee_name,
        amount,
        consumption_type: 'brew',
        notes: `Quick brew from dashboard recommendation`
      }

      const result = await createConsumptionEntry(consumptionEntry)
      if (!result) throw new Error('Failed to log consumption')
      
      // Reload recommendations
      await loadRecommendations()
    } catch (error) {
      console.error('Error logging consumption:', error)
    } finally {
      setConsuming(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coffee className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">What to Drink Today</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coffee className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">What to Drink Today</h3>
        </div>
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No roasted coffee available</p>
          <p className="text-sm text-gray-400 mt-1">Complete a roast to get drinking recommendations</p>
        </div>
      </div>
    )
  }

  const topRecommendation = recommendations[0]
  const otherRecommendations = recommendations.slice(1)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">What to Drink Today</h3>
          </div>
          <button
            onClick={loadRecommendations}
            className="text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Top Recommendation */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-4 border border-amber-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-amber-500" />
                <h4 className="font-semibold text-gray-900">{topRecommendation.coffee.coffee_name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${topRecommendation.statusColor}`}>
                  {topRecommendation.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{topRecommendation.age} days old</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  <span>{topRecommendation.coffee.current_amount}g remaining</span>
                </div>
                <span>~{topRecommendation.daysRemaining} days left</span>
              </div>
              <div className="text-sm text-gray-700">
                {topRecommendation.reasoning.join(' • ')}
              </div>
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickBrew(topRecommendation.coffee, 20)}
              disabled={consuming === topRecommendation.coffee.coffee_name}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {consuming === topRecommendation.coffee.coffee_name ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Logging...
                </>
              ) : (
                <>
                  <Coffee className="h-4 w-4" />
                  Brew 20g
                </>
              )}
            </button>
            <button
              onClick={() => handleQuickBrew(topRecommendation.coffee, 30)}
              disabled={consuming === topRecommendation.coffee.coffee_name}
              className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Brew 30g
            </button>
          </div>
        </div>

        {/* Other Recommendations */}
        {otherRecommendations.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Other Options</h5>
            {otherRecommendations.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{rec.coffee.coffee_name}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${rec.statusColor}`}>
                      {rec.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{rec.age} days old</span>
                    <span>{rec.coffee.current_amount}g left</span>
                    <span>{rec.daysRemaining} days</span>
                  </div>
                </div>
                <button
                  onClick={() => handleQuickBrew(rec.coffee, 20)}
                  disabled={consuming === rec.coffee.coffee_name}
                  className="text-amber-600 hover:text-amber-700 p-1 rounded transition-colors"
                >
                  {consuming === rec.coffee.coffee_name ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}