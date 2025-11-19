import { RoastSchedule } from '@/components/schedule/roast-schedule'
import { BatchPlanner } from '@/components/schedule/batch-planner'
import { Calendar, Calculator } from 'lucide-react'

export default function SchedulePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roast Schedule</h1>
          <p className="text-gray-600 mt-1">Plan and track your roasting schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Active Schedule</span>
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