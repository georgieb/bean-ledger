'use client'

import { useState, useEffect } from 'react'
import { createEquipment, updateEquipment, type Equipment, type EquipmentEntry, getDefaultEquipmentForType } from '@/lib/equipment'
import { X } from 'lucide-react'

interface EquipmentFormProps {
  equipment?: Equipment | null
  onSuccess: () => void
  onCancel: () => void
}

export function EquipmentForm({ equipment, onSuccess, onCancel }: EquipmentFormProps) {
  const [formData, setFormData] = useState<EquipmentEntry>({
    type: 'roaster',
    brand: '',
    model: '',
    settings_schema: {},
    is_active: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (equipment) {
      setFormData({
        type: equipment.type,
        brand: equipment.brand,
        model: equipment.model,
        settings_schema: equipment.settings_schema,
        is_active: equipment.is_active
      })
    }
  }, [equipment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.brand.trim() || !formData.model.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      let result
      if (equipment) {
        result = await updateEquipment(equipment.id, formData)
      } else {
        result = await createEquipment(formData)
      }

      if (result) {
        onSuccess()
      } else {
        alert('Failed to save equipment. Please try again.')
      }
    } catch (error) {
      console.error('Error saving equipment:', error)
      alert('Failed to save equipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadDefaultSettings = () => {
    const defaultEquipment = getDefaultEquipmentForType(
      formData.type,
      formData.brand,
      formData.model
    )
    if (defaultEquipment) {
      setFormData({
        ...formData,
        settings_schema: defaultEquipment.settings_schema || {}
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {equipment ? 'Edit Equipment' : 'Add Equipment'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Equipment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <option value="roaster">Roaster</option>
              <option value="grinder">Grinder</option>
              <option value="brewer">Brewer</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand *
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., Fresh Roast, Baratza, Hario"
              required
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model *
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., SR800, Encore, V60"
              required
            />
          </div>

          {/* Load Default Settings */}
          {!equipment && (
            <div>
              <button
                type="button"
                onClick={loadDefaultSettings}
                className="text-amber-600 hover:text-amber-700 text-sm font-medium"
              >
                {formData.type === 'grinder' && formData.brand && formData.model 
                  ? `Load settings for ${formData.brand} ${formData.model}` 
                  : `Load default settings for ${formData.type}`
                }
              </button>
              <p className="text-xs text-gray-500 mt-1">
                {formData.type === 'grinder' 
                  ? 'This will populate grinder-specific settings with recommended ranges and brew method settings'
                  : 'This will populate settings based on common equipment configurations'
                }
              </p>
            </div>
          )}

          {/* Settings Preview */}
          {Object.keys(formData.settings_schema || {}).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Settings Schema Preview
              </label>
              <div className="bg-gray-50 rounded-lg p-3 text-xs">
                <pre className="whitespace-pre-wrap text-gray-600">
                  {JSON.stringify(formData.settings_schema, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Settings can be customized later through the equipment manager
              </p>
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Equipment is active
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : (equipment ? 'Save Changes' : 'Add Equipment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}