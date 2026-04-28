import { RoastAnalysis } from '@/components/roasting/roast-analysis'
import { BrewingAnalytics } from '@/components/analytics/brewing-analytics'
import { History, TrendingUp } from 'lucide-react'

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">History & Analytics</h1>
          <p className="text-slate-300 mt-1">View your roasting and brewing history with insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-white">Analytics Dashboard</span>
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