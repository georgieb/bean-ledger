'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory } from '@/lib/ledger'
import { createRoastSchedule, type RoastScheduleEntry } from '@/lib/schedule-local'
import { supabase } from '@/lib/supabase'
import { Calculator, Coffee, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

interface GreenCoffee {
  coffee_name: string
  current_amount: number
  origin: string
}

interface BatchPlan {
  coffee_name: string
  total_green: number
  roasts_possible: number
  roast_plans: {
    roast_level: string
    batches: number
    green_per_batch: number
    total_green: number
    expected_yield: number
  }[]
}

export function BatchPlanner() {
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [loading, setLoading] = useState(true)
  const [batchPlans, setBatchPlans] = useState<BatchPlan[]>([])
  const [selectedCoffee, setSelectedCoffee] = useState<string>('')

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    try {
      const inventory = await getCurrentInventory()
      setGreenCoffee(inventory.green)
      generateBatchPlans(inventory.green)
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateBatchPlans = (coffees: GreenCoffee[]) => {
    const plans = coffees.map(coffee => {
      const totalGreen = coffee.current_amount
      const standardBatchSize = 220 // grams
      const roastsPossible = Math.floor(totalGreen / standardBatchSize)

      // Suggested roast level distribution
      const roastPlans = [
        {
          roast_level: 'light',
          batches: Math.floor(roastsPossible * 0.3),
          green_per_batch: standardBatchSize,
          total_green: Math.floor(roastsPossible * 0.3) * standardBatchSize,
          expected_yield: Math.floor(roastsPossible * 0.3) * standardBatchSize * 0.85
        },
        {
          roast_level: 'medium',
          batches: Math.floor(roastsPossible * 0.5),
          green_per_batch: standardBatchSize,
          total_green: Math.floor(roastsPossible * 0.5) * standardBatchSize,
          expected_yield: Math.floor(roastsPossible * 0.5) * standardBatchSize * 0.83
        },
        {
          roast_level: 'medium-dark',
          batches: Math.floor(roastsPossible * 0.2),
          green_per_batch: standardBatchSize,
          total_green: Math.floor(roastsPossible * 0.2) * standardBatchSize,
          expected_yield: Math.floor(roastsPossible * 0.2) * standardBatchSize * 0.80
        }
      ].filter(plan => plan.batches > 0)

      return {
        coffee_name: coffee.coffee_name,
        total_green: totalGreen,
        roasts_possible: roastsPossible,
        roast_plans: roastPlans
      }
    }).filter(plan => plan.roasts_possible > 0)

    setBatchPlans(plans)
  }

  const scheduleAllBatches = async (plan: BatchPlan) => {
    try {
      const startDate = new Date()
      let schedulePromises: Promise<any>[] = []

      plan.roast_plans.forEach((roastPlan, planIndex) => {
        for (let batch = 0; batch < roastPlan.batches; batch++) {
          const scheduleDate = new Date(startDate)
          scheduleDate.setDate(startDate.getDate() + (planIndex * roastPlan.batches + batch) * 2) // Space roasts 2 days apart

          const scheduleEntry: RoastScheduleEntry = {
            coffee_name: `${plan.coffee_name} (${roastPlan.roast_level})`,
            green_coffee_name: plan.coffee_name,
            scheduled_date: scheduleDate.toISOString().split('T')[0],
            green_weight: roastPlan.green_per_batch,
            target_roast_level: roastPlan.roast_level as any,
            equipment_id: '', // Optional - can be set later
            notes: `Batch ${batch + 1}/${roastPlan.batches} - Auto-scheduled from batch planner`,
            priority: 'medium'
          }

          schedulePromises.push(createRoastSchedule(scheduleEntry))
        }
      })

      await Promise.all(schedulePromises)
      alert(`Successfully scheduled ${schedulePromises.length} roasts for ${plan.coffee_name}`)
    } catch (error) {
      console.error('Error scheduling batches:', error)
      alert(`Failed to schedule roasts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Batch Planner</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (batchPlans.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Batch Planner</h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No green coffee available</p>
          <p className="text-sm text-gray-400 mt-1">Purchase green coffee to start planning roasts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Batch Planner</h3>
        </div>
        <div className="text-sm text-gray-600">
          Plan roast batches from your green coffee inventory
        </div>
      </div>

      <div className="space-y-6">
        {batchPlans.map(plan => (
          <div key={plan.coffee_name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{plan.coffee_name}</h4>
                <p className="text-sm text-gray-600">
                  {plan.total_green}g available • {plan.roasts_possible} possible roasts
                </p>
              </div>
              <button
                onClick={() => scheduleAllBatches(plan)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                Schedule All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plan.roast_plans.map((roastPlan, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <span className="font-medium capitalize text-sm">
                      {roastPlan.roast_level.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Batches: {roastPlan.batches}</div>
                    <div>Green: {roastPlan.total_green}g</div>
                    <div>Expected yield: {Math.round(roastPlan.expected_yield)}g</div>
                  </div>
                  
                  {/* Yield visualization */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(roastPlan.expected_yield / roastPlan.total_green) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((1 - roastPlan.expected_yield / roastPlan.total_green) * 100)}% loss
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary stats */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total planned roasts:</span>
                <span className="font-medium">
                  {plan.roast_plans.reduce((sum, rp) => sum + rp.batches, 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Green coffee used:</span>
                <span className="font-medium">
                  {plan.roast_plans.reduce((sum, rp) => sum + rp.total_green, 0)}g
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expected total yield:</span>
                <span className="font-medium text-green-600">
                  {Math.round(plan.roast_plans.reduce((sum, rp) => sum + rp.expected_yield, 0))}g
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remaining green:</span>
                <span className="font-medium">
                  {plan.total_green - plan.roast_plans.reduce((sum, rp) => sum + rp.total_green, 0)}g
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Planning Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h5 className="text-sm font-semibold text-blue-800">Planning Tips</h5>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• Standard batch size: 220g (adjust based on your roaster capacity)</li>
              <li>• Suggested distribution: 30% light, 50% medium, 20% dark roasts</li>
              <li>• Space roasts 2-3 days apart for optimal workflow</li>
              <li>• Consider your consumption rate when planning quantities</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}