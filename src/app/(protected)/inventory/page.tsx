'use client'

import { InventoryDashboard } from '@/components/inventory/inventory-dashboard'
import { GreenCoffeeForm } from '@/components/inventory/green-coffee-form'
import { Package } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Inventory Management
          </h1>
          <p className="text-slate-300 mt-1 text-lg">Manage your green and roasted coffee inventory</p>
        </div>
      </div>

      {/* Main Inventory Dashboard */}
      <InventoryDashboard />

      {/* Green Coffee Purchase Form */}
      <GreenCoffeeForm onSuccess={() => window.location.reload()} />
    </div>
  )
}