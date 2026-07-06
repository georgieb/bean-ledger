'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { DrinkRecommendation } from '@/components/dashboard/drink-recommendation'
import { StatsCard } from '@/components/dashboard/stats-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { InventoryDashboard } from '@/components/inventory/inventory-dashboard'
import { RoastCompletionForm } from '@/components/roasting/roast-completion-form'
import { RoastAnalysis } from '@/components/roasting/roast-analysis'
import { BrewingAnalytics } from '@/components/analytics/brewing-analytics'
import { RoastSchedule } from '@/components/schedule/roast-schedule'
import { EquipmentManager } from '@/components/equipment/equipment-manager'
import { BrewOptimizer } from '@/components/ai/brew-optimizer'
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
  const { user, loading: authLoading } = useAuth()
  const [showRoastForm, setShowRoastForm] = useState(false)
  const [showConsumptionForm, setShowConsumptionForm] = useState(false)
  const [showGreenCoffeeForm, setShowGreenCoffeeForm] = useState(false)
  const [stats, setStats] = useState({
    totalRoasted: 0,
    totalGreen: 0,
    roastedBatches: 0,
    greenOrigins: 0,
    averageAge: 0,
    oldestBatch: 0,
    daysSupply: 0,
    totalRoasts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardStats()
    }
  }, [authLoading, user])

  const loadDashboardStats = async () => {
    try {
      const inventory = await getCurrentInventory()
      
      const roasted = inventory.roasted as RoastedCoffee[]
      const green = inventory.green as GreenCoffee[]
      
      const totalRoasted = Math.round(roasted.reduce((sum, coffee) => sum + coffee.current_amount, 0) * 10) / 10
      const totalGreen = Math.round(green.reduce((sum, coffee) => sum + coffee.current_amount, 0) * 10) / 10
      
      const averageAge = roasted.length > 0 
        ? Math.round(roasted.reduce((sum, coffee) => sum + coffee.days_since_roast, 0) / roasted.length)
        : 0
      
      const oldestBatch = roasted.length > 0
        ? Math.max(...roasted.map(coffee => coffee.days_since_roast))
        : 0
      
      // Calculate days of supply based on daily consumption rate
      const dailyConsumption = 30 // Should come from user preferences
      const daysSupply = totalRoasted > 0 ? Math.floor(totalRoasted / dailyConsumption) : 0
      
      // Count total roasts from unique batches
      const totalRoasts = roasted.length
      
      setStats({
        totalRoasted,
        totalGreen,
        roastedBatches: roasted.length,
        greenOrigins: green.length,
        averageAge,
        oldestBatch,
        daysSupply,
        totalRoasts
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-300 mt-2 text-base md:text-lg">Monitor your coffee roasting and brewing operations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-slate-800/80 to-emerald-900/50 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3 border border-slate-700/50 shadow-lg shadow-slate-900/20">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-100">Live Tracking</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
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
          title="Days Supply"
          value={stats.daysSupply}
          description={stats.daysSupply > 0 ? `At 30g daily consumption` : "No coffee remaining"}
          icon={<Calendar className="h-12 w-12" />}
          color="purple"
        />
      </div>

      {/* Quick Actions - Full Width */}
      <QuickActions
        onAddGreenCoffee={() => setShowGreenCoffeeForm(true)}
        onCompleteRoast={() => setShowRoastForm(true)}
        onLogBrew={() => setShowConsumptionForm(true)}
        onViewSchedule={() => window.location.href = '/schedule'}
        onViewHistory={() => window.location.href = '/history'}
      />

      {/* Drink Recommendation */}
      <DrinkRecommendation />

      {/* Full Inventory Dashboard */}
      <InventoryDashboard />

      {/* Roast Analysis & Comparison */}
      <RoastAnalysis />

      {/* Roast Schedule Management */}
      <RoastSchedule />

      {/* Equipment Management */}
      <EquipmentManager />

      {/* AI-Powered Brew Optimization */}
      <BrewOptimizer />

      {/* Brewing Analytics & Patterns */}
      <BrewingAnalytics />

      {/* Modal Forms */}
      {showRoastForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/50">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-semibold text-slate-100">Complete Roast</h2>
              <button
                onClick={() => setShowRoastForm(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/50">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-semibold text-slate-100">Log Consumption</h2>
              <button
                onClick={() => setShowConsumptionForm(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/50">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-semibold text-slate-100">Add Green Coffee Purchase</h2>
              <button
                onClick={() => setShowGreenCoffeeForm(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
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