'use client'

import { InventoryDashboard } from '@/components/inventory/inventory-dashboard'
import { GreenCoffeeForm } from '@/components/inventory/green-coffee-form'
import { Package } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-6 w-6 text-amber-600" />
          <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
        </div>
        <p className="text-slate-300">Manage your green and roasted coffee inventory</p>
      </div>

      {/* Main Inventory Dashboard */}
      <InventoryDashboard />

      {/* Green Coffee Purchase Form */}
      <GreenCoffeeForm onSuccess={() => window.location.reload()} />
    </div>
  )
}