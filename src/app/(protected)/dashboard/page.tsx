'use client'

import { useState, useEffect, useRef } from 'react'
import { RoastCompletionForm } from '@/components/roasting/roast-completion-form'
import { ConsumptionForm } from '@/components/consumption/consumption-form'
import { GreenCoffeeForm } from '@/components/inventory/green-coffee-form'
import { getCurrentInventory } from '@/lib/ledger'
import {
  Coffee, Package, ChevronDown, Flame, X,
  Brain, Zap, Camera, Beaker,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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
}

type ActiveModal = 'roast' | 'drink' | 'inventory' | null

export default function DashboardPage() {
  const router = useRouter()
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showAIMenu, setShowAIMenu] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [stats, setStats] = useState({ totalRoasted: 0, totalGreen: 0 })
  const [loading, setLoading] = useState(true)
  const actionRef = useRef<HTMLDivElement>(null)
  const aiRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadDashboardStats() }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setShowActionMenu(false)
      if (aiRef.current && !aiRef.current.contains(e.target as Node)) setShowAIMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadDashboardStats = async () => {
    try {
      const inventory = await getCurrentInventory()
      const roasted = inventory.roasted as RoastedCoffee[]
      const green = inventory.green as GreenCoffee[]
      setStats({
        totalRoasted: Math.round(roasted.reduce((s, c) => s + c.current_amount, 0) * 10) / 10,
        totalGreen: Math.round(green.reduce((s, c) => s + c.current_amount, 0) * 10) / 10,
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = () => {
    setActiveModal(null)
    loadDashboardStats()
  }

  const openModal = (modal: ActiveModal) => {
    setShowActionMenu(false)
    setActiveModal(modal)
  }

  const goToAI = (path: string) => {
    setShowAIMenu(false)
    router.push(path as any)
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-10 py-12">

      {/* Inventory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
        <InventoryCard
          label="Green Coffee"
          value={loading ? '—' : `${stats.totalGreen}g`}
          sub="Ready to roast"
          icon={<Package className="h-8 w-8 text-emerald-400" />}
          accent="emerald"
        />
        <InventoryCard
          label="Roasted Coffee"
          value={loading ? '—' : `${stats.totalRoasted}g`}
          sub="In stock"
          icon={<Coffee className="h-8 w-8 text-amber-400" />}
          accent="amber"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">

        {/* What do you want to do today */}
        <div className="relative flex-1" ref={actionRef}>
          <button
            onClick={() => { setShowActionMenu(!showActionMenu); setShowAIMenu(false) }}
            className="w-full inline-flex items-center justify-between gap-3 px-6 py-4 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-900/30 transition-all"
          >
            <span>What do you want to do today?</span>
            <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-transform ${showActionMenu ? 'rotate-180' : ''}`} />
          </button>

          {showActionMenu && (
            <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-600/60 rounded-xl shadow-2xl overflow-hidden z-20">
              <ActionItem icon={<Flame className="h-4 w-4 text-orange-400" />} label="Roast Coffee" onClick={() => openModal('roast')} />
              <ActionItem icon={<Coffee className="h-4 w-4 text-amber-400" />} label="Drink Coffee" onClick={() => openModal('drink')} divider />
              <ActionItem icon={<Package className="h-4 w-4 text-emerald-400" />} label="Add Inventory" onClick={() => openModal('inventory')} divider />
            </div>
          )}
        </div>

        {/* Use AI */}
        <div className="relative flex-1" ref={aiRef}>
          <button
            onClick={() => { setShowAIMenu(!showAIMenu); setShowActionMenu(false) }}
            className="w-full inline-flex items-center justify-between gap-3 px-6 py-4 bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-900/40 transition-all"
          >
            <span className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Use AI
            </span>
            <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-transform ${showAIMenu ? 'rotate-180' : ''}`} />
          </button>

          {showAIMenu && (
            <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-violet-600/30 rounded-xl shadow-2xl overflow-hidden z-20">
              <ActionItem
                icon={<Beaker className="h-4 w-4 text-cyan-400" />}
                label="AI Brewing"
                sub="Recipe + brew timer"
                onClick={() => goToAI('/ai-brewing')}
                accent="violet"
              />
              <ActionItem
                icon={<Zap className="h-4 w-4 text-violet-400" />}
                label="AI Roast Recipes"
                sub="Equipment-specific profiles"
                onClick={() => goToAI('/ai-roasting')}
                accent="violet"
                divider
              />
              <ActionItem
                icon={<Camera className="h-4 w-4 text-fuchsia-400" />}
                label="AI Roast Analysis"
                sub="Analyze bean photos"
                onClick={() => goToAI('/ai-roasting')}
                accent="violet"
                divider
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'roast' && (
        <Modal title="Complete Roast" onClose={() => setActiveModal(null)}>
          <RoastCompletionForm onSuccess={handleFormSuccess} />
        </Modal>
      )}
      {activeModal === 'drink' && (
        <Modal title="Log Consumption" onClose={() => setActiveModal(null)}>
          <ConsumptionForm onSuccess={handleFormSuccess} />
        </Modal>
      )}
      {activeModal === 'inventory' && (
        <Modal title="Add Green Coffee Purchase" onClose={() => setActiveModal(null)}>
          <GreenCoffeeForm onSuccess={handleFormSuccess} />
        </Modal>
      )}
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function InventoryCard({
  label, value, sub, icon, accent,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: 'emerald' | 'amber'
}) {
  const border = accent === 'emerald' ? 'border-emerald-700/40' : 'border-amber-700/40'
  const glow   = accent === 'emerald' ? 'shadow-emerald-900/20' : 'shadow-amber-900/20'
  const bg     = accent === 'emerald'
    ? 'bg-gradient-to-br from-slate-800 to-emerald-950/60'
    : 'bg-gradient-to-br from-slate-800 to-amber-950/60'

  return (
    <div className={`${bg} border ${border} rounded-2xl p-6 shadow-xl ${glow} flex items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </div>
      <div className="opacity-80">{icon}</div>
    </div>
  )
}

function ActionItem({
  icon, label, sub, onClick, divider, accent,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  onClick: () => void
  divider?: boolean
  accent?: 'violet'
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-5 py-3.5 text-left transition-colors
        ${divider ? 'border-t border-slate-700/60' : ''}
        ${accent === 'violet' ? 'hover:bg-violet-900/30' : 'hover:bg-slate-700/60'}
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        {sub && <span className="block text-xs text-slate-400 mt-0.5">{sub}</span>}
      </span>
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
