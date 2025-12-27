'use client'

import { useState } from 'react'
import { createGreenPurchaseEntry, type GreenPurchaseEntry } from '@/lib/ledger'
import { Package, Save, Loader2, CheckCircle, X, Edit3 } from 'lucide-react'
import { greenInputStyles, greenSelectStyles } from '@/styles/input-styles'

interface CoffeeItem {
  name: string | null
  origin: string | null
  farm: string | null
  variety: string | null
  process: string | null
  weight: number | null
  cost: number | null
  purchase_date: string | null
  supplier: string | null
  notes: string | null
  confidence: 'high' | 'medium' | 'low'
  extracted_text: string
}

interface BulkCoffeeImportProps {
  coffeeItems: CoffeeItem[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function BulkCoffeeImport({ coffeeItems, onSuccess, onCancel }: BulkCoffeeImportProps) {
  const [editableItems, setEditableItems] = useState<Partial<GreenPurchaseEntry>[]>(
    coffeeItems.map(item => ({
      name: item.name || '',
      origin: item.origin || '',
      farm: item.farm || '',
      variety: item.variety || '',
      process: item.process || '',
      weight: item.weight || undefined,
      cost: item.cost || undefined,
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      supplier: item.supplier || '',
      notes: item.notes || ''
    }))
  )
  
  const [selectedItems, setSelectedItems] = useState<boolean[]>(
    coffeeItems.map(() => true) // Select all by default
  )
  
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  const handleItemChange = (index: number, field: keyof GreenPurchaseEntry, value: any) => {
    setEditableItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleItemToggle = (index: number) => {
    setSelectedItems(prev => prev.map((selected, i) => 
      i === index ? !selected : selected
    ))
  }

  const handleSelectAll = () => {
    const allSelected = selectedItems.every(Boolean)
    setSelectedItems(selectedItems.map(() => !allSelected))
  }

  const handleSaveSelected = async () => {
    setIsSaving(true)
    setError(null)
    setSavedCount(0)

    try {
      const itemsToSave = editableItems.filter((_, index) => selectedItems[index])
      let successCount = 0

      for (const item of itemsToSave) {
        // Validate required fields
        if (!item.name || !item.origin || !item.weight) {
          throw new Error(`Missing required fields for item: ${item.name || 'Unknown'}`)
        }

        const purchaseEntry: GreenPurchaseEntry = {
          name: item.name!,
          origin: item.origin!,
          farm: item.farm,
          variety: item.variety,
          process: item.process,
          weight: Number(item.weight),
          cost: item.cost ? Number(item.cost) : undefined,
          purchase_date: item.purchase_date!,
          supplier: item.supplier,
          notes: item.notes
        }

        const result = await createGreenPurchaseEntry(purchaseEntry)
        
        if (!result) {
          throw new Error(`Failed to create entry for: ${item.name}`)
        }
        
        successCount++
        setSavedCount(successCount)
      }

      onSuccess?.()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = selectedItems.filter(Boolean).length
  const totalCount = coffeeItems.length

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk Import Coffee Purchases ({totalCount} detected)
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handleSelectAll}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          {selectedItems.every(Boolean) ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-sm text-gray-600">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {editableItems.map((item, index) => {
          const originalItem = coffeeItems[index]
          const pricePerKg = item.cost && item.weight 
            ? (item.cost / (item.weight / 1000)).toFixed(2)
            : null

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                selectedItems[index] 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedItems[index]}
                  onChange={() => handleItemToggle(index)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Item {index + 1} - Confidence: {originalItem.confidence}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Coffee Name *
                      </label>
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Coffee name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Origin *
                      </label>
                      <input
                        type="text"
                        value={item.origin || ''}
                        onChange={(e) => handleItemChange(index, 'origin', e.target.value)}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Origin"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Farm
                      </label>
                      <input
                        type="text"
                        value={item.farm || ''}
                        onChange={(e) => handleItemChange(index, 'farm', e.target.value)}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Farm name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Variety
                      </label>
                      <input
                        type="text"
                        value={item.variety || ''}
                        onChange={(e) => handleItemChange(index, 'variety', e.target.value)}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Variety"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Process
                      </label>
                      <select
                        value={item.process || ''}
                        onChange={(e) => handleItemChange(index, 'process', e.target.value)}
                        className={`${greenSelectStyles} text-sm`}
                      >
                        <option value="">Select...</option>
                        <option value="washed">Washed</option>
                        <option value="natural">Natural</option>
                        <option value="honey">Honey</option>
                        <option value="semi-washed">Semi-Washed</option>
                        <option value="wet-hulled">Wet-Hulled</option>
                        <option value="anaerobic">Anaerobic</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Weight (g) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={item.weight || ''}
                        onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value))}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Weight"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cost || ''}
                        onChange={(e) => handleItemChange(index, 'cost', parseFloat(e.target.value))}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Cost"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Purchase Date *
                      </label>
                      <input
                        type="date"
                        value={item.purchase_date || ''}
                        onChange={(e) => handleItemChange(index, 'purchase_date', e.target.value)}
                        className={`${greenInputStyles} text-sm`}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Supplier
                      </label>
                      <input
                        type="text"
                        value={item.supplier || ''}
                        onChange={(e) => handleItemChange(index, 'supplier', e.target.value)}
                        className={`${greenInputStyles} text-sm`}
                        placeholder="Supplier"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price per kg
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm">
                        {pricePerKg ? `$${pricePerKg}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    <strong>Extracted text:</strong> {originalItem.extracted_text}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div className="text-sm text-gray-600">
          {isSaving && savedCount > 0 && (
            <span>Saved {savedCount} of {selectedCount} items...</span>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveSelected}
            disabled={isSaving || selectedCount === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : `Import ${selectedCount} Coffee${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}