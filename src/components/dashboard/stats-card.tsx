'use client'

import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  description?: string
  trend?: {
    value: number
    label: string
    positive: boolean
  }
  color?: 'amber' | 'green' | 'blue' | 'purple' | 'red'
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  color = 'amber' 
}: StatsCardProps) {
  const colorClasses = {
    amber: 'text-amber-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    red: 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`text-sm font-medium ${
                trend.positive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.positive ? '+' : ''}{trend.value}% {trend.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`h-12 w-12 ${colorClasses[color]} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}