'use client'

import { useState } from 'react'
import { createGreenPurchaseEntry, type GreenPurchaseEntry } from '@/lib/ledger'
import { Package, DollarSign, Calendar, FileText, Save, Loader2, MapPin } from 'lucide-react'
import { greenInputStyles, greenSelectStyles, greenTextareaStyles } from '@/styles/input-styles'

export function GreenCoffeeForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState<Partial<GreenPurchaseEntry>>({
    purchase_date: new Date().toISOString().split('T')[0]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof GreenPurchaseEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.origin || !formData.weight) {
        throw new Error('Please fill in all required fields')
      }

      const purchaseEntry: GreenPurchaseEntry = {
        name: formData.name!,
        origin: formData.origin!,
        farm: formData.farm,
        variety: formData.variety,
        process: formData.process,
        weight: Number(formData.weight),
        cost: formData.cost ? Number(formData.cost) : undefined,
        purchase_date: formData.purchase_date!,
        supplier: formData.supplier,
        notes: formData.notes
      }

      const result = await createGreenPurchaseEntry(purchaseEntry)
      
      if (!result) {
        throw new Error('Failed to create green coffee purchase entry')
      }

      // Reset form
      setFormData({
        purchase_date: new Date().toISOString().split('T')[0]
      })

      onSuccess?.()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const pricePerKg = formData.cost && formData.weight 
    ? (formData.cost / (formData.weight / 1000)).toFixed(2)
    : null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Add Green Coffee Purchase</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coffee Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={greenInputStyles}
              placeholder="e.g., Ethiopia Sidamo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Origin *
            </label>
            <input
              type="text"
              value={formData.origin || ''}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              className={greenInputStyles}
              placeholder="e.g., Ethiopia, Guatemala Antigua"
              required
            />
          </div>
        </div>

        {/* Coffee Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farm
            </label>
            <input
              type="text"
              value={formData.farm || ''}
              onChange={(e) => handleInputChange('farm', e.target.value)}
              className={greenInputStyles}
              placeholder="e.g., Finca El Salvador"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variety
            </label>
            <input
              type="text"
              value={formData.variety || ''}
              onChange={(e) => handleInputChange('variety', e.target.value)}
              className={greenInputStyles}
              placeholder="e.g., Bourbon, Typica, Heirloom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Process
            </label>
            <select
              value={formData.process || ''}
              onChange={(e) => handleInputChange('process', e.target.value)}
              className={greenSelectStyles}
            >
              <option value="">Select process...</option>
              <option value="washed">Washed</option>
              <option value="natural">Natural</option>
              <option value="honey">Honey</option>
              <option value="semi-washed">Semi-Washed</option>
              <option value="wet-hulled">Wet-Hulled</option>
              <option value="anaerobic">Anaerobic</option>
            </select>
          </div>
        </div>

        {/* Purchase Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight (g) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={formData.weight || ''}
              onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
              className={greenInputStyles}
              placeholder="1000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost || ''}
              onChange={(e) => handleInputChange('cost', parseFloat(e.target.value))}
              className={greenInputStyles}
              placeholder="25.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price per kg
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {pricePerKg ? `$${pricePerKg}` : '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Purchase Date *
            </label>
            <input
              type="date"
              value={formData.purchase_date || ''}
              onChange={(e) => handleInputChange('purchase_date', e.target.value)}
              className={greenInputStyles}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <input
              type="text"
              value={formData.supplier || ''}
              onChange={(e) => handleInputChange('supplier', e.target.value)}
              className={greenInputStyles}
              placeholder="e.g., Sweet Maria's Coffee Supply"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Notes
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className={greenTextareaStyles}
            placeholder="Notes about flavor profile, cupping scores, storage conditions, etc."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Saving...' : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </div>
  )
}