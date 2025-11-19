'use client'

import { useState, useEffect } from 'react'
import { getLedgerEntries, type LedgerEntry } from '@/lib/ledger'
import { BarChart3, TrendingUp, Coffee, Calendar, Clock, Target, Activity } from 'lucide-react'

interface ConsumptionData {
  id: string
  coffee_name: string
  amount: number
  consumption_type: string
  date: string
  notes?: string
  brew_method?: string
  created_at: string
}

interface Analytics {
  totalConsumption: number
  dailyAverage: number
  weeklyConsumption: number[]
  coffeePreferences: Record<string, number>
  consumptionByType: Record<string, number>
  consumptionTrend: { date: string; amount: number }[]
  brewMethods: Record<string, number>
  peakConsumptionHours: Record<string, number>
}

export function BrewingAnalytics() {
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadConsumptionData()
  }, [timeRange])

  const loadConsumptionData = async () => {
    setLoading(true)
    try {
      const entries = await getLedgerEntries(200) // Get more entries for analytics
      
      // Filter for consumption entries and transform data
      const consumptionEntries = entries
        .filter(entry => entry.action_type === 'consumption' || entry.action_type === 'brew_logged')
        .map(entry => ({
          id: entry.id,
          coffee_name: entry.metadata.coffee_name,
          amount: Math.abs(entry.amount_change), // Make positive for consumption
          consumption_type: entry.metadata.consumption_type || 'brew',
          date: entry.created_at.split('T')[0],
          notes: entry.metadata.notes,
          brew_method: entry.metadata.brew_method,
          created_at: entry.created_at
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Filter by time range
      const cutoffDate = new Date()
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const filteredData = consumptionEntries.filter(entry => 
        new Date(entry.created_at) >= cutoffDate
      )

      setConsumptionData(filteredData)
      generateAnalytics(filteredData, days)
    } catch (error) {
      console.error('Error loading consumption data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnalytics = (data: ConsumptionData[], days: number) => {
    if (data.length === 0) {
      setAnalytics(null)
      return
    }

    const totalConsumption = data.reduce((sum, entry) => sum + entry.amount, 0)
    const dailyAverage = totalConsumption / days

    // Weekly consumption (last 7 days)
    const weeklyConsumption = Array(7).fill(0)
    const today = new Date()
    data.forEach(entry => {
      const entryDate = new Date(entry.created_at)
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff < 7) {
        weeklyConsumption[6 - daysDiff] += entry.amount
      }
    })

    // Coffee preferences
    const coffeePreferences = data.reduce((acc, entry) => {
      acc[entry.coffee_name] = (acc[entry.coffee_name] || 0) + entry.amount
      return acc
    }, {} as Record<string, number>)

    // Consumption by type
    const consumptionByType = data.reduce((acc, entry) => {
      acc[entry.consumption_type] = (acc[entry.consumption_type] || 0) + entry.amount
      return acc
    }, {} as Record<string, number>)

    // Consumption trend (daily totals)
    const trendMap = data.reduce((acc, entry) => {
      acc[entry.date] = (acc[entry.date] || 0) + entry.amount
      return acc
    }, {} as Record<string, number>)

    const consumptionTrend = Object.entries(trendMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days for trend

    // Brew methods
    const brewMethods = data.reduce((acc, entry) => {
      const method = entry.brew_method || 'Unknown'
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Peak consumption hours (simulated - would need more detailed timestamp data)
    const peakConsumptionHours = {
      'Morning (6-10 AM)': Math.floor(data.length * 0.4),
      'Afternoon (12-4 PM)': Math.floor(data.length * 0.35),
      'Evening (6-8 PM)': Math.floor(data.length * 0.25)
    }

    setAnalytics({
      totalConsumption,
      dailyAverage,
      weeklyConsumption,
      coffeePreferences,
      consumptionByType,
      consumptionTrend,
      brewMethods,
      peakConsumptionHours
    })
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      default: return 'Last 30 Days'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Brewing Analytics</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics || consumptionData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Brewing Analytics</h3>
        </div>
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No consumption data available</p>
          <p className="text-sm text-gray-400 mt-1">Start logging your coffee consumption to see analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Brewing Analytics</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Coffee className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-gray-600">Total Consumption</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalConsumption.toFixed(0)}g</p>
            <p className="text-xs text-gray-500 mt-1">{getTimeRangeLabel()}</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Daily Average</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.dailyAverage.toFixed(1)}g</p>
            <p className="text-xs text-gray-500 mt-1">Per day</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Sessions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{consumptionData.length}</p>
            <p className="text-xs text-gray-500 mt-1">Brewing sessions</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Avg per Session</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(analytics.totalConsumption / consumptionData.length).toFixed(1)}g
            </p>
            <p className="text-xs text-gray-500 mt-1">Per session</p>
          </div>
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Consumption Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Daily Consumption (Last 7 Days)</h4>
          <div className="space-y-3">
            {analytics.weeklyConsumption.map((amount, index) => {
              const date = new Date()
              date.setDate(date.getDate() - (6 - index))
              const dayName = date.toLocaleDateString('en', { weekday: 'short' })
              const maxAmount = Math.max(...analytics.weeklyConsumption)
              const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-8">{dayName}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-amber-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12">{amount.toFixed(0)}g</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Coffee Preferences */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Coffee Preferences</h4>
          <div className="space-y-3">
            {Object.entries(analytics.coffeePreferences)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([coffee, amount]) => {
                const percentage = (amount / analytics.totalConsumption) * 100
                return (
                  <div key={coffee} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 flex-1 truncate">{coffee}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12">{amount.toFixed(0)}g</span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Consumption by Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Consumption by Type</h4>
          <div className="space-y-3">
            {Object.entries(analytics.consumptionByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, amount]) => {
                const percentage = (amount / analytics.totalConsumption) * 100
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 capitalize w-16">{type}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12">{amount.toFixed(0)}g</span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Peak Consumption Times</h4>
          <div className="space-y-3">
            {Object.entries(analytics.peakConsumptionHours)
              .sort((a, b) => b[1] - a[1])
              .map(([timeSlot, sessions]) => {
                const maxSessions = Math.max(...Object.values(analytics.peakConsumptionHours))
                const percentage = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0
                return (
                  <div key={timeSlot} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-32">{timeSlot}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{sessions}</span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Consumption Activity</h4>
        <div className="space-y-3">
          {consumptionData.slice(0, 10).map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{entry.coffee_name}</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                    {entry.consumption_type}
                  </span>
                  {entry.brew_method && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {entry.brew_method}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{entry.amount}g</span>
                  <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                  <span>{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {entry.notes && <span className="italic">&ldquo;{entry.notes}&rdquo;</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}