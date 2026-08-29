'use client'

import { useState, useEffect } from 'react'
import { createEquipment, updateEquipment, type Equipment, type EquipmentEntry, getDefaultEquipmentForType } from '@/lib/equipment'
import { OTHER_BRAND, getGroupedBrandsForType, getModelsForBrand, type EquipmentType } from '@/lib/equipment-catalog'
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

  // Brand/model are picked from EQUIPMENT_CATALOG via cascading selects.
  // brandChoice/modelChoice track which dropdown option is selected;
  // formData.brand/model hold the actual value that gets saved (identical
  // to the dropdown choice, or free text when "Other" is selected).
  const [brandChoice, setBrandChoice] = useState<string>(OTHER_BRAND)
  const [modelChoice, setModelChoice] = useState<string>(OTHER_BRAND)

  useEffect(() => {
    if (equipment) {
      setFormData({
        type: equipment.type,
        brand: equipment.brand,
        model: equipment.model,
        settings_schema: equipment.settings_schema,
        is_active: equipment.is_active
      })
      const { popular, more } = getGroupedBrandsForType(equipment.type)
      const brands = [...popular, ...more, OTHER_BRAND]
      const matchedBrand = brands.includes(equipment.brand) ? equipment.brand : OTHER_BRAND
      setBrandChoice(matchedBrand)
      if (matchedBrand !== OTHER_BRAND) {
        const models = getModelsForBrand(equipment.type, matchedBrand)
        setModelChoice(models.includes(equipment.model) ? equipment.model : OTHER_BRAND)
      } else {
        setModelChoice(OTHER_BRAND)
      }
    }
  }, [equipment])

  const handleTypeChange = (type: EquipmentType) => {
    setFormData({ ...formData, type, brand: '', model: '' })
    setBrandChoice(OTHER_BRAND)
    setModelChoice(OTHER_BRAND)
  }

  const handleBrandChoiceChange = (brand: string) => {
    setBrandChoice(brand)
    if (brand === OTHER_BRAND) {
      setModelChoice(OTHER_BRAND)
      setFormData({ ...formData, brand: '', model: '' })
      return
    }
    const models = getModelsForBrand(formData.type, brand)
    const firstModel = models[0] || ''
    setModelChoice(firstModel || OTHER_BRAND)
    setFormData({ ...formData, brand, model: firstModel })
  }

  const handleModelChoiceChange = (model: string) => {
    setModelChoice(model)
    setFormData({ ...formData, model: model === OTHER_BRAND ? '' : model })
  }

  const modelsForBrand = brandChoice !== OTHER_BRAND ? getModelsForBrand(formData.type, brandChoice) : []

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
      <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {equipment ? 'Edit Equipment' : 'Add Equipment'}
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-400"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Equipment Type */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Equipment Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as EquipmentType)}
              className="w-full border border-slate-600 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <option value="roaster">Roaster</option>
              <option value="grinder">Grinder</option>
              <option value="brewer">Brewer</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Brand *
            </label>
            <select
              value={brandChoice}
              onChange={(e) => handleBrandChoiceChange(e.target.value)}
              className="w-full border border-slate-600 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <optgroup label="Most Popular">
                {getGroupedBrandsForType(formData.type).popular.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </optgroup>
              <optgroup label="More Brands">
                {getGroupedBrandsForType(formData.type).more.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </optgroup>
              <option value={OTHER_BRAND}>{OTHER_BRAND} / not listed</option>
            </select>
            {brandChoice === OTHER_BRAND && (
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 mt-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter brand name"
                required
              />
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Model *
            </label>
            {brandChoice !== OTHER_BRAND ? (
              <select
                value={modelChoice}
                onChange={(e) => handleModelChoiceChange(e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                {modelsForBrand.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
                <option value={OTHER_BRAND}>Other / not listed</option>
              </select>
            ) : null}
            {(brandChoice === OTHER_BRAND || modelChoice === OTHER_BRAND) && (
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 mt-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., SR800, Encore, V60"
                required
              />
            )}
          </div>

          {/* Load Default Settings */}
          {!equipment && (
            <div>
              <button
                type="button"
                onClick={loadDefaultSettings}
                className="text-amber-600 hover:text-amber-300 text-sm font-medium"
              >
                {formData.type === 'grinder' && formData.brand && formData.model 
                  ? `Load settings for ${formData.brand} ${formData.model}` 
                  : `Load default settings for ${formData.type}`
                }
              </button>
              <p className="text-xs text-slate-400 mt-1">
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
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Settings Schema Preview
              </label>
              <div className="bg-slate-900/50 rounded-lg p-3 text-xs">
                <pre className="whitespace-pre-wrap text-slate-300">
                  {JSON.stringify(formData.settings_schema, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-slate-400 mt-1">
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
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-slate-600 rounded"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-slate-200">
              Equipment is active
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
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