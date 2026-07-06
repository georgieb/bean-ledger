'use client'

import { useState, useEffect } from 'react'
import { getCurrentInventory, createConsumptionEntry, type ConsumptionEntry } from '@/lib/ledger'
import { InventoryAdjustment } from './inventory-adjustment'
import { Coffee, Package, TrendingUp, Calendar, Minus, Edit3 } from 'lucide-react'

interface RoastedCoffee {
  coffee_name: string
  display_name?: string
  current_amount: number
  roast_date: string
  roast_level: string
  batch_number: number
  days_since_roast: number
}

interface GreenCoffee {
  coffee_name: string
  display_name?: string
  current_amount: number
  origin: string
  variety?: string
  process?: string
}

export function InventoryDashboard() {
  const [roastedCoffee, setRoastedCoffee] = useState<RoastedCoffee[]>([])
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustmentModal, setAdjustmentModal] = useState<{
    type: 'green' | 'roasted'
    coffeeName: string
    currentAmount: number
  } | null>(null)

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    try {
      const inventory = await getCurrentInventory()
      setRoastedCoffee(inventory.roasted)
      setGreenCoffee(inventory.green)
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConsumption = async (coffeeName: string, amount: number) => {
    try {
      console.log('🔄 Attempting consumption:', { coffeeName, amount })
      
      const consumptionEntry: ConsumptionEntry = {
        coffee_name: coffeeName,
        amount: amount,
        consumption_type: 'brew',
        notes: `Quick consumption: ${amount}g`
      }
      
      console.log('📝 Consumption entry:', consumptionEntry)
      
      const result = await createConsumptionEntry(consumptionEntry)
      console.log('✅ Consumption result:', result)
      
      // Reload inventory to reflect changes
      await loadInventory()
    } catch (error) {
      console.error('❌ Error logging consumption:', error)
      alert('Failed to log consumption. Please try again.')
    }
  }

  const handleAdjustmentSuccess = async () => {
    setAdjustmentModal(null)
    await loadInventory()
  }

  const getFreshnessStatus = (daysSinceRoast: number) => {
    if (daysSinceRoast <= 6) return { status: 'Degassing', color: 'bg-yellow-900/40 text-yellow-200' }
    if (daysSinceRoast >= 8 && daysSinceRoast <= 10) return { status: 'Peak', color: 'bg-emerald-900/40 text-emerald-200' }
    if (daysSinceRoast === 7 || (daysSinceRoast >= 11 && daysSinceRoast <= 13)) return { status: 'Sweet Spot', color: 'bg-blue-900/40 text-blue-200' }
    return { status: 'Aging', color: 'bg-slate-700 text-slate-100' }
  }

  const getStockLevel = (amount: number) => {
    if (amount <= 20) return { level: 'Low', color: 'bg-red-900/40 text-red-200' }
    if (amount <= 100) return { level: 'Medium', color: 'bg-amber-900/40 text-amber-200' }
    return { level: 'High', color: 'bg-emerald-900/40 text-emerald-200' }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-white">Inventory Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-600/60 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-600/60 rounded"></div>
                  <div className="h-3 bg-slate-600/60 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const totalRoastedWeight = Math.round(roastedCoffee.reduce((sum, coffee) => sum + coffee.current_amount, 0) * 10) / 10
  const totalGreenWeight = Math.round(greenCoffee.reduce((sum, coffee) => sum + coffee.current_amount, 0) * 10) / 10

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
          <h2 className="text-xl md:text-2xl font-bold text-white">Inventory Dashboard</h2>
        </div>
        <button
          onClick={loadInventory}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start sm:self-auto"
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-800 rounded-lg shadow p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Coffee className="h-6 w-6 md:h-8 md:w-8 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-slate-300 truncate">Roasted Coffee</p>
              <p className="text-lg md:text-2xl font-bold text-white">{Math.round(totalRoastedWeight * 10) / 10}g</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Package className="h-6 w-6 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-slate-300 truncate">Green Coffee</p>
              <p className="text-lg md:text-2xl font-bold text-white">{Math.round(totalGreenWeight * 10) / 10}g</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-slate-300 truncate">Roasted Batches</p>
              <p className="text-lg md:text-2xl font-bold text-white">{roastedCoffee.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg shadow p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-purple-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-slate-300 truncate">Green Origins</p>
              <p className="text-lg md:text-2xl font-bold text-white">{greenCoffee.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roasted Coffee Inventory */}
        <div className="bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Roasted Coffee</h3>
            <p className="text-sm text-slate-300">Current roasted coffee inventory with freshness tracking</p>
          </div>
          <div className="p-6">
            {roastedCoffee.length === 0 ? (
              <div className="text-center py-8">
                <Coffee className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No roasted coffee in inventory</p>
                <p className="text-sm text-slate-500 mt-1">Complete a roast to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {roastedCoffee.map((coffee, index) => {
                  const freshness = getFreshnessStatus(coffee.days_since_roast)
                  const stock = getStockLevel(coffee.current_amount)
                  
                  return (
                    <div key={index} className="border border-slate-700 rounded-lg p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <h4 className="font-medium text-sm md:text-base text-white break-words">{coffee.display_name || coffee.coffee_name}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${freshness.color}`}>
                            {freshness.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${stock.color}`}>
                            {stock.level}
                          </span>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <span>Remaining: {Math.round(coffee.current_amount * 10) / 10}g</span>
                        </div>
                        <div className="w-full bg-slate-600/60 rounded-full h-2">
                          <div 
                            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.max(0, Math.min(100, (coffee.current_amount / 200) * 100))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                        <div>
                          <p><span className="font-medium">Amount:</span> {Math.round(coffee.current_amount * 10) / 10}g</p>
                          <p><span className="font-medium">Batch:</span> #{coffee.batch_number}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Roasted:</span> {coffee.roast_date}</p>
                          <p><span className="font-medium">Level:</span> {coffee.roast_level}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-slate-400">{coffee.days_since_roast} days since roast</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setAdjustmentModal({
                              type: 'roasted',
                              coffeeName: coffee.coffee_name,
                              currentAmount: coffee.current_amount
                            })}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleConsumption(coffee.coffee_name, 10)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                            disabled={coffee.current_amount < 10}
                          >
                            <Minus className="h-3 w-3" />
                            10g
                          </button>
                          <button
                            onClick={() => handleConsumption(coffee.coffee_name, 20)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                            disabled={coffee.current_amount < 20}
                          >
                            <Minus className="h-3 w-3" />
                            20g
                          </button>
                          <button
                            onClick={() => handleConsumption(coffee.coffee_name, 40)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                            disabled={coffee.current_amount < 40}
                          >
                            <Minus className="h-3 w-3" />
                            40g
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Green Coffee Inventory */}
        <div className="bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Green Coffee</h3>
            <p className="text-sm text-slate-300">Unroasted coffee beans ready for roasting</p>
          </div>
          <div className="p-6">
            {greenCoffee.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No green coffee in inventory</p>
                <p className="text-sm text-slate-500 mt-1">Add a green coffee purchase to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {greenCoffee.map((coffee, index) => {
                  const stock = getStockLevel(coffee.current_amount)
                  
                  return (
                    <div key={index} className="border border-slate-700 rounded-lg p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <h4 className="font-medium text-sm md:text-base text-white break-words">{coffee.display_name || coffee.coffee_name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${stock.color} self-start sm:self-auto`}>
                          {stock.level}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                        <div>
                          <p><span className="font-medium">Amount:</span> {Math.round(coffee.current_amount * 10) / 10}g</p>
                          <p><span className="font-medium">Origin:</span> {coffee.origin}</p>
                        </div>
                        <div>
                          {coffee.variety && <p><span className="font-medium">Variety:</span> {coffee.variety}</p>}
                          {coffee.process && <p><span className="font-medium">Process:</span> {coffee.process}</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => setAdjustmentModal({
                            type: 'green',
                            coffeeName: coffee.coffee_name,
                            currentAmount: coffee.current_amount
                          })}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Adjustment Modal */}
      {adjustmentModal && (
        <InventoryAdjustment
          type={adjustmentModal.type}
          coffeeName={adjustmentModal.coffeeName}
          currentAmount={adjustmentModal.currentAmount}
          onSuccess={handleAdjustmentSuccess}
          onCancel={() => setAdjustmentModal(null)}
        />
      )}
    </div>
  )
}