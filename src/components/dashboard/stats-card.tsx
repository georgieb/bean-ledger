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
    amber: 'from-amber-500 to-orange-600',
    green: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-violet-600',
    red: 'from-red-500 to-rose-600'
  }

  const bgClasses = {
    amber: 'from-slate-800/80 to-amber-900/20',
    green: 'from-slate-800/80 to-emerald-900/20',
    blue: 'from-slate-800/80 to-blue-900/20',
    purple: 'from-slate-800/80 to-purple-900/20',
    red: 'from-slate-800/80 to-red-900/20'
  }

  return (
    <div className={`bg-gradient-to-br ${bgClasses[color]} backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all duration-300 group`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-300 truncate tracking-wide uppercase">{title}</p>
          <div className="flex items-baseline gap-2 flex-wrap mt-2">
            <p className="text-2xl md:text-4xl font-bold text-slate-100 group-hover:text-white transition-colors">{value}</p>
            {trend && (
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                trend.positive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {trend.positive ? '+' : ''}{trend.value}% {trend.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-slate-400 mt-2 truncate">{description}</p>
          )}
        </div>
        <div className={`p-2.5 bg-gradient-to-br ${colorClasses[color]} rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <div className="h-4 w-4 md:h-5 md:w-5 text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}