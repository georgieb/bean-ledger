'use client'

import { useState, useEffect } from 'react'
import { DrinkRecommendation } from '@/components/dashboard/drink-recommendation'
import { StatsCard } from '@/components/dashboard/stats-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { InventoryDashboard } from '@/components/inventory/inventory-dashboard'
import { RoastCompletionForm } from '@/components/roasting/roast-completion-form'
import { ConsumptionForm } from '@/components/consumption/consumption-form'
import { GreenCoffeeForm } from '@/components/inventory/green-coffee-form'
import { getCurrentInventory } from '@/lib/ledger'
import { BarChart3, Coffee, Package, TrendingUp, Calendar, Plus, X } from 'lucide-react'

interface RoastedCoffee {
  coffee_name: string
  current_amount: number
  roast_date: string
  roast_level: string
  batch_number: number
  days_since_roast: number
}

interface GreenCoffee {
  coffee_name: string
  current_amount: number
  origin: string
  variety?: string
  process?: string
}

export default function DashboardPage() {
  const [showRoastForm, setShowRoastForm] = useState(false)
  const [showConsumptionForm, setShowConsumptionForm] = useState(false)
  const [showGreenCoffeeForm, setShowGreenCoffeeForm] = useState(false)
  const [stats, setStats] = useState({
    totalRoasted: 0,
    totalGreen: 0,
    roastedBatches: 0,
    greenOrigins: 0,
    averageAge: 0,
    oldestBatch: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const inventory = await getCurrentInventory()
      
      const roasted = inventory.roasted as RoastedCoffee[]
      const green = inventory.green as GreenCoffee[]
      
      const totalRoasted = roasted.reduce((sum, coffee) => sum + coffee.current_amount, 0)
      const totalGreen = green.reduce((sum, coffee) => sum + coffee.current_amount, 0)
      
      const averageAge = roasted.length > 0 
        ? Math.round(roasted.reduce((sum, coffee) => sum + coffee.days_since_roast, 0) / roasted.length)
        : 0
      
      const oldestBatch = roasted.length > 0
        ? Math.max(...roasted.map(coffee => coffee.days_since_roast))
        : 0
      
      setStats({
        totalRoasted,
        totalGreen,
        roastedBatches: roasted.length,
        greenOrigins: green.length,
        averageAge,
        oldestBatch
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = () => {
    setShowRoastForm(false)
    setShowConsumptionForm(false)
    setShowGreenCoffeeForm(false)
    loadDashboardStats()
    window.location.reload() // Refresh all components
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your coffee roasting and brewing operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Live Tracking</span>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Roasted Coffee"
          value={`${stats.totalRoasted}g`}
          description="Current inventory"
          icon={<Coffee className="h-12 w-12" />}
          color="amber"
        />
        <StatsCard
          title="Green Coffee"
          value={`${stats.totalGreen}g`}
          description="Ready to roast"
          icon={<Package className="h-12 w-12" />}
          color="green"
        />
        <StatsCard
          title="Active Batches"
          value={stats.roastedBatches}
          description={`Avg age: ${stats.averageAge} days`}
          icon={<BarChart3 className="h-12 w-12" />}
          color="blue"
        />
        <StatsCard
          title="Origins"
          value={stats.greenOrigins}
          description={stats.oldestBatch > 0 ? `Oldest: ${stats.oldestBatch} days` : "No aged coffee"}
          icon={<Calendar className="h-12 w-12" />}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Drink Recommendation */}
        <div className="lg:col-span-2">
          <DrinkRecommendation />
        </div>
        
        {/* Quick Actions */}
        <div>
          <QuickActions
            onAddGreenCoffee={() => setShowGreenCoffeeForm(true)}
            onCompleteRoast={() => setShowRoastForm(true)}
            onLogBrew={() => setShowConsumptionForm(true)}
            onViewSchedule={() => window.location.href = '/schedule'}
            onViewHistory={() => window.location.href = '/history'}
          />
        </div>
      </div>

      {/* Full Inventory Dashboard */}
      <InventoryDashboard />

      {/* Modal Forms */}
      {showRoastForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Complete Roast</h2>
              <button
                onClick={() => setShowRoastForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <RoastCompletionForm onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}

      {showConsumptionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Log Consumption</h2>
              <button
                onClick={() => setShowConsumptionForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <ConsumptionForm onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}

      {showGreenCoffeeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Green Coffee Purchase</h2>
              <button
                onClick={() => setShowGreenCoffeeForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <GreenCoffeeForm onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}