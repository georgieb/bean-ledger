'use client'

import { useState } from 'react'
import { Plus, Coffee, Package, Calendar, BarChart3 } from 'lucide-react'

interface QuickActionsProps {
  onAddGreenCoffee?: () => void
  onCompleteRoast?: () => void
  onLogBrew?: () => void
  onViewSchedule?: () => void
  onViewHistory?: () => void
}

export function QuickActions({
  onAddGreenCoffee,
  onCompleteRoast,
  onLogBrew,
  onViewSchedule,
  onViewHistory
}: QuickActionsProps) {
  const actions = [
    {
      label: 'Add Green Coffee',
      description: 'Log a new green coffee purchase',
      icon: <Package className="h-5 w-5" />,
      iconBg: 'from-emerald-500 to-green-600',
      cardBg: 'from-slate-800/80 to-emerald-900/20',
      onClick: onAddGreenCoffee
    },
    {
      label: 'Complete Roast',
      description: 'Finish a roast and update inventory',
      icon: <Coffee className="h-5 w-5" />,
      iconBg: 'from-amber-500 to-orange-600',
      cardBg: 'from-slate-800/80 to-amber-900/20',
      onClick: onCompleteRoast
    },
    {
      label: 'Log Brew',
      description: 'Record coffee consumption',
      icon: <Coffee className="h-5 w-5" />,
      iconBg: 'from-cyan-500 to-blue-600',
      cardBg: 'from-slate-800/80 to-cyan-900/20',
      onClick: onLogBrew
    },
    {
      label: 'View Schedule',
      description: 'Check roasting schedule',
      icon: <Calendar className="h-5 w-5" />,
      iconBg: 'from-purple-500 to-violet-600',
      cardBg: 'from-slate-800/80 to-purple-900/20',
      onClick: onViewSchedule
    },
    {
      label: 'View History',
      description: 'Browse past activity',
      icon: <BarChart3 className="h-5 w-5" />,
      iconBg: 'from-indigo-500 to-blue-600',
      cardBg: 'from-slate-800/80 to-indigo-900/20',
      onClick: onViewHistory
    }
  ]

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-lg shadow-slate-900/20">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-lg">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-100 tracking-tight">Quick Actions</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`group p-5 bg-gradient-to-br ${action.cardBg} backdrop-blur-sm border border-slate-700/50 rounded-xl text-center transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-1 hover:border-slate-600/50`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 bg-gradient-to-br ${action.iconBg} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {action.icon}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 whitespace-nowrap group-hover:text-white transition-colors">{action.label}</h4>
                  <p className="text-xs text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}