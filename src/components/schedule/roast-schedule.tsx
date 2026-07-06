'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getRoastSchedule, getUpcomingRoasts, getOverdueRoasts, deleteRoastSchedule, completeScheduledRoast, type ScheduledRoast } from '@/lib/repositories/schedule.repository'
import { getCurrentInventory } from '@/lib/ledger'
import { AddRoastModal } from './add-roast-modal'
import { Calendar, Clock, Coffee, Plus, Edit3, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface GreenCoffee {
  coffee_name: string
  current_amount: number
  origin: string
}

export function RoastSchedule() {
  const { user, loading: authLoading } = useAuth()
  const [scheduledRoasts, setScheduledRoasts] = useState<ScheduledRoast[]>([])
  const [upcomingRoasts, setUpcomingRoasts] = useState<ScheduledRoast[]>([])
  const [overdueRoasts, setOverdueRoasts] = useState<ScheduledRoast[]>([])
  const [greenCoffee, setGreenCoffee] = useState<GreenCoffee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRoast, setEditingRoast] = useState<ScheduledRoast | null>(null)

  useEffect(() => {
    // Only fetch when auth is ready and user is logged in
    if (!authLoading && user) {
      loadScheduleData()
    }
  }, [authLoading, user])

  const loadScheduleData = async () => {
    setLoading(true)
    try {
      const [scheduled, upcoming, overdue, inventory] = await Promise.all([
        getRoastSchedule(),
        getUpcomingRoasts(),
        getOverdueRoasts(),
        getCurrentInventory()
      ])

      setScheduledRoasts(scheduled)
      setUpcomingRoasts(upcoming)
      setOverdueRoasts(overdue)
      setGreenCoffee(inventory.green)
    } catch (error) {
      console.error('Error loading schedule data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoast = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled roast?')) return
    
    try {
      await deleteRoastSchedule(scheduleId)
      await loadScheduleData()
    } catch (error) {
      console.error('Error deleting scheduled roast:', error)
    }
  }

  const handleCompleteRoast = async (roast: ScheduledRoast) => {
    try {
      // Simple completion - just mark as completed
      await completeScheduledRoast(roast.id, {
        completed: true,
        completed_date: new Date().toISOString()
      })
      await loadScheduleData()
    } catch (error) {
      console.error('Error completing scheduled roast:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-900/40 text-red-200'
      case 'medium': return 'bg-yellow-900/40 text-yellow-200'
      case 'low': return 'bg-emerald-900/40 text-emerald-200'
      default: return 'bg-slate-700 text-slate-100'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays <= 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString()
  }

  const getAvailableAmount = (greenCoffeeName: string) => {
    const coffee = greenCoffee.find(c => c.coffee_name === greenCoffeeName)
    return coffee?.current_amount || 0
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Roast Schedule</h3>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
            <h3 className="text-base md:text-lg font-semibold text-white">Roast Schedule</h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule Roast</span>
            <span className="sm:hidden">Schedule</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-300">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-white">{upcomingRoasts.length}</p>
            <p className="text-xs text-slate-400 mt-1">Next 7 days</p>
          </div>

          {overdueRoasts.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-700/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-slate-300">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-white">{overdueRoasts.length}</p>
              <p className="text-xs text-slate-400 mt-1">Need attention</p>
            </div>
          )}

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-emerald-700/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-slate-300">Completed</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {scheduledRoasts.filter(r => r.completed).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">This month</p>
          </div>
        </div>
      </div>

      {/* Overdue Roasts Alert */}
      {overdueRoasts.length > 0 && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-200">Overdue Roasts</h4>
              <p className="text-sm text-red-300 mt-1">
                You have {overdueRoasts.length} overdue roast{overdueRoasts.length !== 1 ? 's' : ''}. 
                Consider rescheduling or completing them soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule List */}
      <div className="bg-slate-800 rounded-lg shadow">
        <div className="p-6 border-b border-slate-700">
          <h4 className="text-lg font-semibold text-white">Scheduled Roasts</h4>
          <p className="text-sm text-slate-300 mt-1">Manage your upcoming roast schedule</p>
        </div>

        <div className="p-6">
          {scheduledRoasts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No roasts scheduled</p>
              <p className="text-sm text-slate-500 mt-1">Schedule your first roast to get started</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-4"
              >
                Schedule First Roast
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledRoasts
                .sort((a, b) => {
                  // Show incomplete first, then by date
                  if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1
                  }
                  return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
                })
                .map(roast => {
                  const isOverdue = !roast.completed && new Date(roast.scheduled_date) < new Date()
                  const availableAmount = getAvailableAmount(roast.green_coffee_name)
                  const hasEnoughCoffee = availableAmount >= roast.green_weight

                  return (
                    <div 
                      key={roast.id} 
                      className={`border rounded-lg p-4 ${
                        roast.completed 
                          ? 'border-emerald-700/50 bg-emerald-900/30' 
                          : isOverdue 
                          ? 'border-red-700/50 bg-red-900/30' 
                          : 'border-slate-700 hover:border-slate-600'
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-white">{roast.coffee_name}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(roast.priority)}`}>
                              {roast.priority}
                            </span>
                            {roast.completed && (
                              <span className="px-2 py-1 bg-emerald-900/40 text-emerald-200 text-xs font-medium rounded-full">
                                ✓ Completed
                              </span>
                            )}
                            {isOverdue && (
                              <span className="px-2 py-1 bg-red-900/40 text-red-200 text-xs font-medium rounded-full">
                                ⚠ Overdue
                              </span>
                            )}
                            {!hasEnoughCoffee && !roast.completed && (
                              <span className="px-2 py-1 bg-orange-900/40 text-orange-200 text-xs font-medium rounded-full">
                                ⚠ Insufficient green coffee
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300">
                            <div>
                              <span className="font-medium">Date:</span> {formatDate(roast.scheduled_date)}
                            </div>
                            <div>
                              <span className="font-medium">Green Coffee:</span> {roast.green_coffee_name}
                            </div>
                            <div>
                              <span className="font-medium">Weight:</span> {roast.green_weight}g
                              <span className="text-xs text-slate-400 ml-1">
                                ({availableAmount}g available)
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Target Level:</span> 
                              <span className="capitalize ml-1">{roast.target_roast_level.replace('-', ' ')}</span>
                            </div>
                          </div>

                          {roast.notes && (
                            <div className="mt-2 text-sm text-slate-300">
                              <span className="font-medium">Notes:</span> {roast.notes}
                            </div>
                          )}

                          {roast.completed && roast.completed_date && (
                            <div className="mt-2 text-sm text-green-600">
                              <span className="font-medium">Completed:</span> {new Date(roast.completed_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {!roast.completed && (
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleCompleteRoast(roast)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                              title="Complete roast"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => setEditingRoast(roast)}
                              className="text-slate-500 hover:text-slate-300 p-2"
                              title="Edit roast"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoast(roast.id)}
                              className="text-slate-500 hover:text-red-600 p-2"
                              title="Delete roast"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddRoastModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadScheduleData}
      />

      <AddRoastModal
        isOpen={!!editingRoast}
        onClose={() => setEditingRoast(null)}
        onSuccess={loadScheduleData}
        editingRoast={editingRoast}
      />
    </div>
  )
}