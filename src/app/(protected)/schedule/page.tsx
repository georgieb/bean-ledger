import { RoastSchedule } from '@/components/schedule/roast-schedule'
import { BatchPlanner } from '@/components/schedule/batch-planner'
import { Calendar } from 'lucide-react'

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Roast Schedule
          </h1>
          <p className="text-slate-300 mt-1 text-lg">Plan and track your roasting schedule</p>
        </div>
      </div>

      {/* Roast Schedule Management */}
      <RoastSchedule />

      {/* Batch Planner */}
      <BatchPlanner />
    </div>
  )
}