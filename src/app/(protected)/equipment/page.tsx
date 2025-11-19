import { EquipmentManager } from '@/components/equipment/equipment-manager'
import { Settings, Zap } from 'lucide-react'

export default function EquipmentPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-gray-600 mt-1">Manage your roasting and brewing equipment</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-gray-900">Equipment Settings</span>
          </div>
        </div>
      </div>

      {/* Equipment Management */}
      <EquipmentManager />
    </div>
  )
}