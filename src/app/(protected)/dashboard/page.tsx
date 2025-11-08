'use client'

import { InventoryDashboard } from '@/components/inventory/inventory-dashboard'
import { RoastCompletionForm } from '@/components/roasting/roast-completion-form'
import { ConsumptionForm } from '@/components/consumption/consumption-form'
import { BarChart3, Coffee, Plus, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
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

      {/* Main Inventory Dashboard */}
      <InventoryDashboard />

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Roast Completion */}
        <RoastCompletionForm onSuccess={() => window.location.reload()} />
        
        {/* Consumption Logging */}
        <ConsumptionForm onSuccess={() => window.location.reload()} />
      </div>

      {/* Recent Activity Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <button className="text-amber-600 hover:text-amber-700 text-sm font-medium">
            View All →
          </button>
        </div>
        
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Recent ledger entries will appear here</p>
          <p className="text-sm text-gray-400 mt-1">Complete a roast or log consumption to see activity</p>
        </div>
      </div>
    </div>
  )
}