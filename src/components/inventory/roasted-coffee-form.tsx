'use client'

import { useState } from 'react'
import { createRoastedPurchaseEntry, type RoastedPurchaseEntry } from '@/lib/ledger'
import { Coffee, DollarSign, Calendar, FileText, Save, Loader2, MapPin } from 'lucide-react'
import { inputStyles, selectStyles, textareaStyles } from '@/styles/input-styles'

export function RoastedCoffeeForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState<Partial<RoastedPurchaseEntry>>({
    purchase_date: new Date().toISOString().split('T')[0]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof RoastedPurchaseEntry, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!formData.name || !formData.roast_level || !formData.weight) {
        throw new Error('Please fill in all required fields')
      }

      const purchaseEntry: RoastedPurchaseEntry = {
        name: formData.name!,
        origin: formData.origin,
        roast_level: formData.roast_level!,
        weight: Number(formData.weight),
        purchase_date: formData.purchase_date!,
        roaster: formData.roaster,
        cost: formData.cost ? Number(formData.cost) : undefined,
        notes: formData.notes
      }

      const result = await createRoastedPurchaseEntry(purchaseEntry)

      if (!result) {
        throw new Error('Failed to record roasted coffee purchase')
      }

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
    <div className="bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Coffee className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-white">Add Purchased Roasted Coffee</h3>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Already-roasted coffee you bought — a bag from a roaster or cafe, not something you roasted yourself.
      </p>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Coffee Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={inputStyles}
              placeholder="e.g., Ethiopia Sidamo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Origin
            </label>
            <input
              type="text"
              value={formData.origin || ''}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              className={inputStyles}
              placeholder="e.g., Ethiopia, Guatemala Antigua"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Roast Level *
            </label>
            <select
              value={formData.roast_level || ''}
              onChange={(e) => handleInputChange('roast_level', e.target.value)}
              className={selectStyles}
              required
            >
              <option value="">Select roast level...</option>
              <option value="light">Light</option>
              <option value="medium-light">Medium-Light</option>
              <option value="medium">Medium</option>
              <option value="medium-dark">Medium-Dark</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Weight (g) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={formData.weight || ''}
              onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
              className={inputStyles}
              placeholder="340"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Purchase Date *
            </label>
            <input
              type="date"
              value={formData.purchase_date || ''}
              onChange={(e) => handleInputChange('purchase_date', e.target.value)}
              className={inputStyles}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Roaster / Cafe
            </label>
            <input
              type="text"
              value={formData.roaster || ''}
              onChange={(e) => handleInputChange('roaster', e.target.value)}
              className={inputStyles}
              placeholder="e.g., Blue Bottle, local roaster name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost || ''}
              onChange={(e) => handleInputChange('cost', parseFloat(e.target.value))}
              className={inputStyles}
              placeholder="18.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Price per kg
            </label>
            <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
              {pricePerKg ? `$${pricePerKg}` : '—'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Notes
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className={textareaStyles}
            placeholder="Tasting notes, processing method if known, etc."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
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
