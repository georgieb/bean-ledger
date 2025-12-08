'use client'

import { useState, useEffect } from 'react'
import { InventoryService, type InventorySnapshot } from '@/lib/services/inventory.service'
import { db } from '@/lib/db'
import { Coffee, Package, TrendingUp, Calendar, Minus, Edit3 } from 'lucide-react'

// Example of how the new ORM-based component would work
export function InventoryDashboardNew() {
  const [inventory, setInventory] = useState<InventorySnapshot>({ green: [], roasted: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const inventoryService = new InventoryService(db)

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get current user - in real app this would come from auth context
      const userId = 'current-user-id' // TODO: Get from auth
      
      const snapshot = await inventoryService.getCurrentInventory(userId)
      setInventory(snapshot)
    } catch (err) {
      console.error('Failed to load inventory:', err)
      setError('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  const handleConsumption = async (roastBatchId: string, amount: number) => {
    try {
      const userId = 'current-user-id' // TODO: Get from auth
      
      await inventoryService.consumeRoastedCoffee(
        userId,
        roastBatchId,
        amount,
        'Quick brew consumption',
        `Consumed ${amount}g for brewing`
      )
      
      // Reload inventory
      await loadInventory()
    } catch (err) {
      console.error('Failed to log consumption:', err)
      setError('Failed to log consumption')
    }
  }

  const handleGreenCoffeeAdjustment = async (
    greenCoffeeId: string,
    currentAmount: number,
    newAmount: number
  ) => {
    try {
      const userId = 'current-user-id' // TODO: Get from auth
      
      await inventoryService.adjustGreenInventory(
        userId,
        greenCoffeeId,
        currentAmount,
        newAmount,
        'Physical count adjustment',
        `Adjusted inventory from ${currentAmount}g to ${newAmount}g`
      )
      
      // Reload inventory
      await loadInventory()
    } catch (err) {
      console.error('Failed to adjust inventory:', err)
      setError('Failed to adjust inventory')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-900">Inventory Dashboard (New ORM)</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-900">Inventory Dashboard (New ORM)</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadInventory}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totalRoastedWeight = inventory.roasted.reduce((sum, coffee) => 
    sum + parseFloat(coffee.currentAmount), 0
  )
  const totalGreenWeight = inventory.green.reduce((sum, coffee) => 
    sum + parseFloat(coffee.currentAmount), 0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-900">Inventory Dashboard (New ORM)</h2>
          <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Type-Safe • Fast • Reliable
          </span>
        </div>
        <button
          onClick={loadInventory}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <Coffee className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Roasted Coffee</p>
              <p className="text-2xl font-bold text-gray-900">{totalRoastedWeight.toFixed(1)}g</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Green Coffee</p>
              <p className="text-2xl font-bold text-gray-900">{totalGreenWeight.toFixed(1)}g</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Roasted Batches</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.roasted.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Green Origins</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.green.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roasted Coffee Inventory */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Roasted Coffee</h3>
            <p className="text-sm text-gray-600">Type-safe inventory tracking</p>
          </div>
          <div className="p-6">
            {inventory.roasted.length === 0 ? (
              <div className="text-center py-8">
                <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No roasted coffee in inventory</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inventory.roasted.map((coffee) => (
                  <div key={coffee.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{coffee.name}</h4>
                      <span className="text-sm text-gray-500">#{coffee.batchNumber}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <p><span className="font-medium">Amount:</span> {parseFloat(coffee.currentAmount).toFixed(1)}g</p>
                        <p><span className="font-medium">Level:</span> {coffee.roastLevel}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Roasted:</span> {coffee.roastDate?.toLocaleDateString()}</p>
                        <p><span className="font-medium">Origin:</span> {coffee.greenCoffeeName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleConsumption(coffee.id, 20)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        disabled={parseFloat(coffee.currentAmount) < 20}
                      >
                        <Minus className="h-3 w-3" />
                        20g
                      </button>
                      <button
                        onClick={() => handleConsumption(coffee.id, 40)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        disabled={parseFloat(coffee.currentAmount) < 40}
                      >
                        <Minus className="h-3 w-3" />
                        40g
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Green Coffee Inventory */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Green Coffee</h3>
            <p className="text-sm text-gray-600">Raw coffee beans with full traceability</p>
          </div>
          <div className="p-6">
            {inventory.green.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No green coffee in inventory</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inventory.green.map((coffee) => (
                  <div key={coffee.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{coffee.name}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <p><span className="font-medium">Amount:</span> {parseFloat(coffee.currentAmount).toFixed(1)}g</p>
                        <p><span className="font-medium">Origin:</span> {coffee.origin}</p>
                      </div>
                      <div>
                        {coffee.variety && (
                          <p><span className="font-medium">Variety:</span> {coffee.variety}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const newAmount = prompt(`Current amount: ${coffee.currentAmount}g. Enter new amount:`)
                          if (newAmount && !isNaN(parseFloat(newAmount))) {
                            handleGreenCoffeeAdjustment(
                              coffee.id, 
                              parseFloat(coffee.currentAmount), 
                              parseFloat(newAmount)
                            )
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        Adjust
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}