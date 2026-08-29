'use client'

import { useState, useEffect, useRef } from 'react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RoastCompletionForm } from '@/components/roasting/roast-completion-form'
import { ConsumptionForm } from '@/components/consumption/consumption-form'
import { GreenCoffeeForm } from '@/components/inventory/green-coffee-form'
import { RoastedCoffeeForm } from '@/components/inventory/roasted-coffee-form'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { getCurrentInventory } from '@/lib/ledger'
import { Coffee, Package, ChevronDown, Flame, X } from 'lucide-react'

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

type ActiveModal = 'roast' | 'drink' | 'inventory' | 'roasted-inventory' | null

export default function DashboardPage() {
  const [showMenu, setShowMenu] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [stats, setStats] = useState({ totalRoasted: 0, totalGreen: 0 })
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const loadDashboardStats = async () => {
    try {
      const inventory = await getCurrentInventory()
      const roasted = inventory.roasted as RoastedCoffee[]
      const green = inventory.green as GreenCoffee[]
      setStats({
        totalRoasted: Math.round(roasted.reduce((sum, c) => sum + c.current_amount, 0) * 10) / 10,
        totalGreen: Math.round(green.reduce((sum, c) => sum + c.current_amount, 0) * 10) / 10,
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = () => {
    setActiveModal(null)
    loadDashboardStats()
  }

  const openModal = (modal: ActiveModal) => {
    setShowMenu(false)
    setActiveModal(modal)
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10">
      {/* Onboarding Checklist */}
      <OnboardingChecklist hasInventory={stats.totalGreen > 0 || stats.totalRoasted > 0} loading={loading} />

      {/* Inventory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <StatsCard
          title="Green Coffee"
          value={loading ? '...' : `${stats.totalGreen}g`}
          description="Ready to roast"
          icon={<Package className="h-12 w-12" />}
          color="green"
        />
        <StatsCard
          title="Roasted Coffee"
          value={loading ? '...' : `${stats.totalRoasted}g`}
          description="Current inventory"
          icon={<Coffee className="h-12 w-12" />}
          color="amber"
        />
      </div>

      {/* Action Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="inline-flex items-center gap-3 px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white text-lg font-semibold rounded-xl shadow-lg transition-colors"
        >
          What do you want to do today?
          <ChevronDown className={`h-5 w-5 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {showMenu && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-slate-800 rounded-xl shadow-xl border border-slate-700/50 overflow-hidden z-10">
            <button
              onClick={() => openModal('roast')}
              className="flex items-center gap-3 w-full px-5 py-4 text-left text-slate-100 hover:bg-slate-700/50 transition-colors"
            >
              <Flame className="h-5 w-5 text-amber-500 flex-shrink-0" />
              Roast Coffee
            </button>
            <button
              onClick={() => openModal('drink')}
              className="flex items-center gap-3 w-full px-5 py-4 text-left text-slate-100 hover:bg-slate-700/50 transition-colors border-t border-slate-700/50"
            >
              <Coffee className="h-5 w-5 text-amber-500 flex-shrink-0" />
              Drink Coffee
            </button>
            <button
              onClick={() => openModal('inventory')}
              className="flex items-center gap-3 w-full px-5 py-4 text-left text-slate-100 hover:bg-slate-700/50 transition-colors border-t border-slate-700/50"
            >
              <Package className="h-5 w-5 text-green-500 flex-shrink-0" />
              Add Green Coffee
            </button>
            <button
              onClick={() => openModal('roasted-inventory')}
              className="flex items-center gap-3 w-full px-5 py-4 text-left text-slate-100 hover:bg-slate-700/50 transition-colors border-t border-slate-700/50"
            >
              <Coffee className="h-5 w-5 text-amber-500 flex-shrink-0" />
              Add Roasted Coffee
            </button>
          </div>
        )}
      </div>

      {/* Modal: Roast Coffee */}
      {activeModal === 'roast' && (
        <Modal title="Complete Roast" onClose={() => setActiveModal(null)}>
          <RoastCompletionForm onSuccess={handleFormSuccess} />
        </Modal>
      )}

      {/* Modal: Drink Coffee */}
      {activeModal === 'drink' && (
        <Modal title="Log Consumption" onClose={() => setActiveModal(null)}>
          <ConsumptionForm onSuccess={handleFormSuccess} />
        </Modal>
      )}

      {/* Modal: Add Green Coffee */}
      {activeModal === 'inventory' && (
        <Modal title="Add Green Coffee Purchase" onClose={() => setActiveModal(null)}>
          <GreenCoffeeForm onSuccess={handleFormSuccess} />
        </Modal>
      )}

      {/* Modal: Add Roasted Coffee */}
      {activeModal === 'roasted-inventory' && (
        <Modal title="Add Purchased Roasted Coffee" onClose={() => setActiveModal(null)}>
          <RoastedCoffeeForm onSuccess={handleFormSuccess} />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/50">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-300 transition-colors p-2 hover:bg-slate-700/50 rounded-lg">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
