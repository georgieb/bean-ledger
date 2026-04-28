'use client'

import { useState, useEffect, useRef } from 'react'
import { RoastCompletionForm } from '@/components/roasting/roast-completion-form'
import { ConsumptionForm } from '@/components/consumption/consumption-form'
import { GreenCoffeeForm } from '@/components/inventory/green-coffee-form'
import { getCurrentInventory } from '@/lib/ledger'
import {
  Coffee, Package, ChevronDown, ChevronUp, Flame, X,
  Brain, Zap, Camera, Beaker, Clock,
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
  variety?: string
  process?: string
}

type ActiveModal = 'roast' | 'drink' | 'inventory' | null
type ExpandedCard = 'green' | 'roasted' | null

export default function DashboardPage() {
  const router = useRouter()
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showAIMenu, setShowAIMenu] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null)
  const [greenItems, setGreenItems] = useState<GreenCoffee[]>([])
  const [roastedItems, setRoastedItems] = useState<RoastedCoffee[]>([])
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
      setGreenItems(green)
      setRoastedItems(roasted)
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

  const toggleCard = (card: ExpandedCard) => {
    setExpandedCard(prev => prev === card ? null : card)
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-8 py-12">

      {/* Inventory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
        <InventoryCard
          label="Green Coffee"
          value={loading ? '—' : `${stats.totalGreen}g`}
          sub={loading ? '' : `${greenItems.length} origin${greenItems.length !== 1 ? 's' : ''}`}
          icon={<Package className="h-8 w-8 text-emerald-400" />}
          accent="emerald"
          expanded={expandedCard === 'green'}
          onClick={() => toggleCard('green')}
        />
        <InventoryCard
          label="Roasted Coffee"
          value={loading ? '—' : `${stats.totalRoasted}g`}
          sub={loading ? '' : `${roastedItems.length} batch${roastedItems.length !== 1 ? 'es' : ''}`}
          icon={<Coffee className="h-8 w-8 text-amber-400" />}
          accent="amber"
          expanded={expandedCard === 'roasted'}
          onClick={() => toggleCard('roasted')}
        />
      </div>

      {/* Inline inventory detail panel */}
      {expandedCard === 'green' && greenItems.length > 0 && (
        <div className="w-full max-w-xl">
          <GreenDetail items={greenItems} total={stats.totalGreen} />
        </div>
      )}
      {expandedCard === 'green' && greenItems.length === 0 && !loading && (
        <EmptyDetail message="No green coffee in inventory yet." />
      )}
      {expandedCard === 'roasted' && roastedItems.length > 0 && (
        <div className="w-full max-w-xl">
          <RoastedDetail items={roastedItems} total={stats.totalRoasted} />
        </div>
      )}
      {expandedCard === 'roasted' && roastedItems.length === 0 && !loading && (
        <EmptyDetail message="No roasted coffee in inventory yet." />
      )}

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
            <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-slate-600 text-white/60 rounded-xl shadow-2xl overflow-hidden z-20">
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

/* ─── Inventory detail panels ────────────────────────────────────────────── */

function GreenDetail({ items, total }: { items: GreenCoffee[]; total: number }) {
  return (
    <div className="bg-slate-800/80 border border-emerald-700/30 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Green Coffee — {total}g total</span>
      </div>
      <div className="divide-y divide-slate-700/40">
        {items.map((item, i) => {
          const pct = total > 0 ? Math.round((item.current_amount / total) * 100) : 0
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{item.coffee_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.origin && <Tag>{item.origin}</Tag>}
                    {item.variety && <Tag>{item.variety}</Tag>}
                    {item.process && <Tag accent="emerald">{item.process}</Tag>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-300">{item.current_amount}g</p>
                  <p className="text-xs text-slate-400">{pct}%</p>
                </div>
              </div>
              {/* Weight bar */}
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RoastedDetail({ items, total }: { items: RoastedCoffee[]; total: number }) {
  const roastLevelColor: Record<string, string> = {
    light: 'text-yellow-300',
    'medium-light': 'text-amber-300',
    medium: 'text-amber-400',
    'medium-dark': 'text-orange-400',
    dark: 'text-orange-500',
  }

  return (
    <div className="bg-slate-800/80 border border-amber-700/30 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700/60">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Roasted Coffee — {total}g total</span>
      </div>
      <div className="divide-y divide-slate-700/40">
        {items.map((item, i) => {
          const pct = total > 0 ? Math.round((item.current_amount / total) * 100) : 0
          const levelColor = roastLevelColor[item.roast_level] ?? 'text-amber-300'
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{item.coffee_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Tag accent="amber">{item.roast_level.replace('-', ' ')}</Tag>
                    <span className="flex items-center gap-1 text-xs text-slate-300">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {item.days_since_roast}d ago
                    </span>
                    <Tag>Batch #{item.batch_number}</Tag>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${levelColor}`}>{item.current_amount}g</p>
                  <p className="text-xs text-slate-400">{pct}%</p>
                </div>
              </div>
              {/* Weight bar */}
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-900/300 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyDetail({ message }: { message: string }) {
  return (
    <div className="w-full max-w-xl px-6 py-4 bg-slate-800/60 border border-slate-700/40 rounded-2xl text-center text-slate-300 text-sm">
      {message}
    </div>
  )
}

/* ─── Shared primitives ──────────────────────────────────────────────────── */

function Tag({ children, accent }: { children: React.ReactNode; accent?: 'emerald' | 'amber' }) {
  const cls = accent === 'emerald'
    ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40'
    : accent === 'amber'
    ? 'bg-amber-900/50 text-amber-300 border-amber-700/40'
    : 'bg-slate-700/70 text-slate-200 border-slate-600/40'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${cls} capitalize`}>
      {children}
    </span>
  )
}

function InventoryCard({
  label, value, sub, icon, accent, expanded, onClick,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: 'emerald' | 'amber'
  expanded: boolean
  onClick: () => void
}) {
  const border  = accent === 'emerald'
    ? expanded ? 'border-emerald-500/60' : 'border-emerald-700/40'
    : expanded ? 'border-amber-500/60'   : 'border-amber-700/40'
  const bg = accent === 'emerald'
    ? 'bg-gradient-to-br from-slate-800 to-emerald-950/60'
    : 'bg-gradient-to-br from-slate-800 to-amber-950/60'
  const shadow = accent === 'emerald' ? 'shadow-emerald-900/20' : 'shadow-amber-900/20'
  const chevronColor = accent === 'emerald' ? 'text-emerald-400' : 'text-amber-400'

  return (
    <button
      onClick={onClick}
      className={`${bg} border ${border} rounded-2xl p-6 shadow-xl ${shadow} w-full text-left flex items-center justify-between group transition-all hover:brightness-110`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-300 mt-1">{sub}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="opacity-80">{icon}</div>
        {expanded
          ? <ChevronUp className={`h-4 w-4 ${chevronColor}`} />
          : <ChevronDown className={`h-4 w-4 ${chevronColor} opacity-60 group-hover:opacity-100`} />
        }
      </div>
    </button>
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
        <span className="block text-sm font-semibold text-white">{label}</span>
        {sub && <span className="block text-xs text-slate-300 mt-0.5">{sub}</span>}
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
          <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
