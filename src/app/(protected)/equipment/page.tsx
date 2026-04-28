import { EquipmentManager } from '@/components/equipment/equipment-manager'
import { Settings, Zap } from 'lucide-react'

export default function EquipmentPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Equipment Management</h1>
          <p className="text-slate-300 mt-1">Manage your roasting and brewing equipment</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-white">Equipment Settings</span>
          </div>
        </div>
      </div>

      {/* Equipment Management */}
      <EquipmentManager />
    </div>
  )
}