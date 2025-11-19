'use client'

import { useState } from 'react'
import { createGreenAdjustmentEntry, createRoastedAdjustmentEntry, type GreenAdjustmentEntry, type RoastedAdjustmentEntry } from '@/lib/ledger'
import { Edit3, Save, X, AlertTriangle } from 'lucide-react'

interface InventoryAdjustmentProps {
  type: 'green' | 'roasted'
  coffeeName: string
  currentAmount: number
  onSuccess: () => void
  onCancel: () => void
}

export function InventoryAdjustment({ type, coffeeName, currentAmount, onSuccess, onCancel }: InventoryAdjustmentProps) {
  const [newAmount, setNewAmount] = useState<string>(currentAmount.toString())
  const [reason, setReason] = useState<'physical_count' | 'spillage' | 'shrinkage' | 'stale' | 'found' | 'other'>('physical_count')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const newAmountNumber = parseFloat(newAmount) || 0
  const difference = newAmountNumber - currentAmount
  const isDifferent = Math.abs(difference) >= 0.1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDifferent) {
      setError('No adjustment needed - amounts are the same')
      return
    }

    if (newAmountNumber < 0) {
      setError('Amount cannot be negative')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (type === 'green') {
        const adjustmentEntry: GreenAdjustmentEntry = {
          coffee_name: coffeeName,
          old_amount: currentAmount,
          new_amount: newAmountNumber,
          reason: reason as any,
          notes: notes.trim() || undefined
        }
        await createGreenAdjustmentEntry(adjustmentEntry)
      } else {
        const adjustmentEntry: RoastedAdjustmentEntry = {
          coffee_name: coffeeName,
          old_amount: currentAmount,
          new_amount: newAmountNumber,
          reason: reason as any,
          notes: notes.trim() || undefined
        }
        await createRoastedAdjustmentEntry(adjustmentEntry)
      }

      onSuccess()
    } catch (error) {
      console.error('Error creating adjustment:', error)
      setError('Failed to create adjustment entry')
    } finally {
      setLoading(false)
    }
  }

  const reasonOptions = type === 'green' 
    ? [
        { value: 'physical_count', label: 'Physical Count' },
        { value: 'spillage', label: 'Spillage/Loss' },
        { value: 'shrinkage', label: 'Natural Shrinkage' },
        { value: 'found', label: 'Found Extra' },
        { value: 'other', label: 'Other' }
      ]
    : [
        { value: 'physical_count', label: 'Physical Count' },
        { value: 'spillage', label: 'Spillage/Loss' },
        { value: 'stale', label: 'Stale/Expired' },
        { value: 'found', label: 'Found Extra' },
        { value: 'other', label: 'Other' }
      ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Adjust {type === 'green' ? 'Green' : 'Roasted'} Coffee Inventory
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coffee Name
            </label>
            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{coffeeName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Amount
              </label>
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{currentAmount}g</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Amount
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter new amount"
                required
              />
            </div>
          </div>

          {isDifferent && (
            <div className={`p-3 rounded-md ${
              difference > 0 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${
                  difference > 0 ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`text-sm font-medium ${
                  difference > 0 ? 'text-green-800' : 'text-red-800'
                }`}>
                  {difference > 0 ? 'Increase' : 'Decrease'}: {Math.abs(difference).toFixed(1)}g
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Adjustment
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
              rows={3}
              placeholder="Add any notes about this adjustment..."
            />
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isDifferent}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Adjustment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}