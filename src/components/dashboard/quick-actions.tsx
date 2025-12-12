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
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      onClick: onAddGreenCoffee
    },
    {
      label: 'Complete Roast',
      description: 'Finish a roast and update inventory',
      icon: <Coffee className="h-5 w-5" />,
      color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      onClick: onCompleteRoast
    },
    {
      label: 'Log Brew',
      description: 'Record coffee consumption',
      icon: <Coffee className="h-5 w-5" />,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      onClick: onLogBrew
    },
    {
      label: 'View Schedule',
      description: 'Check roasting schedule',
      icon: <Calendar className="h-5 w-5" />,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      onClick: onViewSchedule
    },
    {
      label: 'View History',
      description: 'Browse past activity',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      onClick: onViewHistory
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`p-4 rounded-lg text-left transition-colors ${action.color}`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex-shrink-0">
                  {action.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 whitespace-nowrap">{action.label}</h4>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}