'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getUserEquipment, deleteEquipment, initializeDefaultEquipment, type Equipment } from '@/lib/equipment'
import { EquipmentForm } from './equipment-form'
import { Settings, Plus, Edit3, Trash2, Coffee, Zap, Package, ChevronDown, ChevronRight } from 'lucide-react'

export function EquipmentManager() {
  const { user, loading: authLoading } = useAuth()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && user) {
      loadEquipment()
    }
  }, [authLoading, user])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      let equipmentList = await getUserEquipment()
      
      // If no equipment, initialize defaults
      if (equipmentList.length === 0) {
        const success = await initializeDefaultEquipment()
        if (success) {
          equipmentList = await getUserEquipment()
        }
      }
      
      setEquipment(equipmentList)
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = () => {
    loadEquipment()
    setShowAddForm(false)
    setEditingEquipment(null)
  }

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm('Are you sure you want to remove this equipment?')) return
    
    const success = await deleteEquipment(equipmentId)
    if (success) {
      await loadEquipment()
    }
  }

  const toggleSettings = (equipmentId: string) => {
    const newExpanded = new Set(expandedSettings)
    if (newExpanded.has(equipmentId)) {
      newExpanded.delete(equipmentId)
    } else {
      newExpanded.add(equipmentId)
    }
    setExpandedSettings(newExpanded)
  }

  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'roaster': return <Coffee className="h-5 w-5 text-orange-600" />
      case 'grinder': return <Zap className="h-5 w-5 text-blue-600" />
      case 'brewer': return <Package className="h-5 w-5 text-green-600" />
      default: return <Settings className="h-5 w-5 text-slate-300" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'roaster': return 'bg-orange-900/40 text-orange-200'
      case 'grinder': return 'bg-blue-900/40 text-blue-200'
      case 'brewer': return 'bg-emerald-900/40 text-emerald-200'
      default: return 'bg-slate-700 text-slate-100'
    }
  }

  const renderSettingsSchema = (schema: Record<string, any>) => {
    return (
      <div className="space-y-3">
        {Object.entries(schema).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if (key.includes('range')) {
              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                  <span className="text-slate-300">
                    {value.min}-{value.max}{value.step ? ` (step ${value.step})` : ''}{value.unit ? ` ${value.unit}` : ''}
                  </span>
                </div>
              )
            } else if (key === 'descriptions') {
              return (
                <div key={key} className="space-y-2">
                  <span className="font-medium text-sm">Settings Guide:</span>
                  {Object.entries(value).map(([descKey, descValue]) => (
                    <div key={descKey} className="ml-4 text-xs text-slate-300">
                      <span className="font-medium">{descKey}:</span>{' '}
                      {typeof descValue === 'object' 
                        ? Object.entries(descValue || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : String(descValue)
                      }
                    </div>
                  ))}
                </div>
              )
            } else if (key === 'recommendations') {
              return (
                <div key={key} className="space-y-2">
                  <span className="font-medium text-sm">Recommendations:</span>
                  {Object.entries(value).map(([method, rec]) => (
                    <div key={method} className="ml-4 text-xs text-slate-300">
                      <span className="font-medium capitalize">{method.replace('_', ' ')}:</span>{' '}
                      {typeof rec === 'object' && rec && (rec as any).setting && (rec as any).description
                        ? `Setting ${(rec as any).setting} - ${(rec as any).description}`
                        : String(rec)
                      }
                    </div>
                  ))}
                </div>
              )
            }
          }
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
              <span className="text-slate-300">{String(value)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Equipment Management</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-600/60 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-white">Equipment Management</h3>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Equipment
          </button>
        </div>
        <p className="text-sm text-slate-300 mt-2">Manage your coffee equipment and settings</p>
      </div>

      <div className="p-6">
        {equipment.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No equipment configured</p>
            <p className="text-sm text-slate-500 mt-1">Add your first piece of equipment to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {equipment.map(item => (
              <div key={item.id} className="border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getEquipmentIcon(item.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white">{item.brand} {item.model}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-300">
                        {item.type === 'roaster' && item.settings_schema.batch_capacity && (
                          <span>Capacity: {item.settings_schema.batch_capacity.min}-{item.settings_schema.batch_capacity.max}g</span>
                        )}
                        {item.type === 'grinder' && item.settings_schema.dial_range && (
                          <span>Settings: {item.settings_schema.dial_range.min}-{item.settings_schema.dial_range.max}</span>
                        )}
                        {item.type === 'brewer' && item.settings_schema.capacity && (
                          <span>Max capacity: {item.settings_schema.capacity.max}{item.settings_schema.capacity.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSettings(item.id)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                      title="View settings"
                    >
                      {expandedSettings.has(item.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingEquipment(item)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                      title="Edit equipment"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEquipment(item.id)}
                      className="text-slate-500 hover:text-red-600 p-1"
                      title="Remove equipment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Settings */}
                {expandedSettings.has(item.id) && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <h5 className="text-sm font-semibold text-slate-200 mb-3">Equipment Settings</h5>
                    {Object.keys(item.settings_schema).length > 0 ? (
                      renderSettingsSchema(item.settings_schema)
                    ) : (
                      <p className="text-sm text-slate-400">No settings configured</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddForm || editingEquipment) && (
        <EquipmentForm
          equipment={editingEquipment}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowAddForm(false)
            setEditingEquipment(null)
          }}
        />
      )}
    </div>
  )
}