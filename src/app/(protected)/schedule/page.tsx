import { RoastSchedule } from '@/components/schedule/roast-schedule'
import { BatchPlanner } from '@/components/schedule/batch-planner'
import { Calendar, Calculator } from 'lucide-react'

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Roast Schedule</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Plan and track your roasting schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-3 md:px-4 py-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            <span className="text-xs md:text-sm font-medium text-gray-900">Active Schedule</span>
          </div>
        </div>
      </div>

      {/* Roast Schedule Management */}
      <RoastSchedule />

      {/* Batch Planner */}
      <BatchPlanner />
    </div>
  )
}