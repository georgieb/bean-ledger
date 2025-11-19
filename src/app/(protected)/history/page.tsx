import { RoastAnalysis } from '@/components/roasting/roast-analysis'
import { BrewingAnalytics } from '@/components/analytics/brewing-analytics'
import { History, TrendingUp } from 'lucide-react'

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">History & Analytics</h1>
          <p className="text-gray-600 mt-1">View your roasting and brewing history with insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Analytics Dashboard</span>
          </div>
        </div>
      </div>

      {/* Roast Analysis & History */}
      <RoastAnalysis />

      {/* Brewing Analytics */}
      <BrewingAnalytics />
    </div>
  )
}