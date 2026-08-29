'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUserEquipment } from '@/lib/equipment'
import { Wrench, Package, Check, X, Sparkles } from 'lucide-react'

const DISMISS_KEY = 'bean-ledger:onboarding-dismissed'

interface OnboardingChecklistProps {
  hasInventory: boolean
  loading?: boolean
}

/**
 * Dismissible setup checklist for new users. Never blocks anything — it's
 * a nudge, not a gate. Completion is derived from real data (equipment
 * rows, inventory totals), not a separate tracked "onboarding state", so
 * it's automatically accurate and self-healing. Auto-hides once both
 * steps are done; the user can also dismiss it manually at any time via
 * localStorage (per-browser, not synced — fine for a one-time nudge).
 */
export function OnboardingChecklist({ hasInventory, loading }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true) // default hidden until we know localStorage state, avoids a flash
  const [hasEquipment, setHasEquipment] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false) // localStorage unavailable — default to showing rather than hiding forever
    }
  }, [])

  useEffect(() => {
    getUserEquipment()
      .then(equipment => setHasEquipment(equipment.length > 0))
      .catch(() => setHasEquipment(null))
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore — worst case the checklist reappears next visit
    }
  }

  if (dismissed || loading || hasEquipment === null) return null
  if (hasEquipment && hasInventory) return null // both done — no need to keep nudging

  return (
    <div className="w-full max-w-lg bg-gradient-to-br from-emerald-900/40 to-slate-800/60 border border-emerald-700/40 rounded-xl p-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Dismiss setup checklist"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <h3 className="font-semibold text-slate-100">Finish setting up</h3>
      </div>

      <div className="space-y-2">
        <ChecklistItem
          done={hasEquipment}
          href="/equipment"
          icon={<Wrench className="h-4 w-4" />}
          label="Add your equipment"
          hint="Roaster, grinder, brewer — powers equipment-specific AI recommendations"
        />
        <ChecklistItem
          done={hasInventory}
          href="/inventory"
          icon={<Package className="h-4 w-4" />}
          label="Add your first inventory"
          hint="Green coffee to roast, or a bag you already bought roasted"
        />
      </div>
    </div>
  )
}

function ChecklistItem({
  done,
  href,
  icon,
  label,
  hint
}: {
  done: boolean
  href: '/equipment' | '/inventory'
  icon: React.ReactNode
  label: string
  hint: string
}) {
  const content = (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${done ? 'bg-emerald-900/20' : 'bg-slate-900/40 hover:bg-slate-900/60'}`}>
      <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${done ? 'bg-emerald-600' : 'bg-slate-700 text-slate-300'}`}>
        {done ? <Check className="h-4 w-4 text-white" /> : icon}
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-medium ${done ? 'text-emerald-300 line-through' : 'text-slate-100'}`}>{label}</div>
        <div className="text-xs text-slate-400 truncate">{hint}</div>
      </div>
    </div>
  )

  return done ? content : <Link href={href}>{content}</Link>
}
