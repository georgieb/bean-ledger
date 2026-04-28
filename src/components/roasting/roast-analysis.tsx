'use client'

import { useState, useEffect, useRef } from 'react'
import { getLedgerEntries, type LedgerEntry } from '@/lib/ledger'
import { supabase } from '@/lib/supabase'
import { TrendingUp, BarChart3, Coffee, Clock, Thermometer, Star, GitCompare, Brain, Sparkles, Zap, Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface RoastData {
  id: string
  name: string
  roast_date: string
  roast_level: string
  green_weight: number
  roasted_weight: number
  weight_loss: number
  batch_number: number
  green_coffee_name: string
  profile: any
  created_at: string
}

interface BeanAnalysis {
  roast_level_estimate: string
  color_uniformity: string
  surface_appearance: string
  visible_defects: string[]
  development_assessment: string
  flavor_prediction: string
  recommendations: string[]
  overall_assessment: string
  confidence: string
}

export function RoastAnalysis() {
  const [roasts, setRoasts] = useState<RoastData[]>([])
  const [selectedRoasts, setSelectedRoasts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<any>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [selectedRoastForAI, setSelectedRoastForAI] = useState<string>('')

  // Bean photo analysis state
  const [beanImage, setBeanImage] = useState<File | null>(null)
  const [beanImagePreview, setBeanImagePreview] = useState<string | null>(null)
  const [beanContext, setBeanContext] = useState('')
  const [beanAnalysis, setBeanAnalysis] = useState<BeanAnalysis | null>(null)
  const [loadingBeanAnalysis, setLoadingBeanAnalysis] = useState(false)
  const [beanAnalysisError, setBeanAnalysisError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadRoastData()
  }, [])

  const loadRoastData = async () => {
    setLoading(true)
    try {
      const entries = await getLedgerEntries(100) // Get more entries for analysis
      
      // Filter for roast completed entries and transform data
      const roastEntries = entries
        .filter(entry => entry.action_type === 'roast_completed')
        .map(entry => ({
          id: entry.id,
          name: entry.metadata.name,
          roast_date: entry.metadata.roast_date,
          roast_level: entry.metadata.roast_level,
          green_weight: entry.metadata.green_weight,
          roasted_weight: entry.metadata.roasted_weight,
          weight_loss: parseFloat(entry.metadata.weight_loss_pct || '0'),
          batch_number: entry.metadata.batch_number,
          green_coffee_name: entry.metadata.green_coffee_name,
          profile: entry.metadata.roast_profile || {},
          created_at: entry.created_at
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setRoasts(roastEntries)
      
      // Generate analysis
      generateAnalysis(roastEntries)
    } catch (error) {
      console.error('Error loading roast data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnalysis = (roastData: RoastData[]) => {
    if (roastData.length === 0) return

    const totalRoasts = roastData.length
    const avgWeightLoss = roastData.reduce((sum, roast) => sum + roast.weight_loss, 0) / totalRoasts
    const avgGreenWeight = roastData.reduce((sum, roast) => sum + roast.green_weight, 0) / totalRoasts
    const avgRoastedWeight = roastData.reduce((sum, roast) => sum + roast.roasted_weight, 0) / totalRoasts

    // Roast level distribution
    const roastLevels = roastData.reduce((acc, roast) => {
      acc[roast.roast_level] = (acc[roast.roast_level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Most used green coffees
    const greenCoffeeUsage = roastData.reduce((acc, roast) => {
      acc[roast.green_coffee_name] = (acc[roast.green_coffee_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Profile analysis for roasts with profile data
    const profileData = roastData.filter(roast => roast.profile && Object.keys(roast.profile).length > 0)
    const avgChargeTemp = profileData.length > 0 
      ? profileData.reduce((sum, roast) => sum + (roast.profile.charge_temp || 0), 0) / profileData.length 
      : 0
    const avgDropTemp = profileData.length > 0 
      ? profileData.reduce((sum, roast) => sum + (roast.profile.drop_temp || 0), 0) / profileData.length 
      : 0
    const avgTotalTime = profileData.length > 0 
      ? profileData.reduce((sum, roast) => sum + (roast.profile.total_roast_time || 0), 0) / profileData.length 
      : 0

    setAnalysis({
      totalRoasts,
      avgWeightLoss: avgWeightLoss.toFixed(2),
      avgGreenWeight: avgGreenWeight.toFixed(1),
      avgRoastedWeight: avgRoastedWeight.toFixed(1),
      roastLevels,
      greenCoffeeUsage,
      profileMetrics: {
        avgChargeTemp: avgChargeTemp.toFixed(1),
        avgDropTemp: avgDropTemp.toFixed(1),
        avgTotalTime: avgTotalTime.toFixed(1),
        profileCount: profileData.length
      }
    })
  }

  const toggleRoastSelection = (roastId: string) => {
    setSelectedRoasts(prev => 
      prev.includes(roastId) 
        ? prev.filter(id => id !== roastId)
        : [...prev, roastId].slice(-3) // Limit to 3 comparisons
    )
  }

  const getSelectedRoastsData = () => {
    return roasts.filter(roast => selectedRoasts.includes(roast.id))
  }

  const analyzeRoastWithAI = async (roastId: string) => {
    const roast = roasts.find(r => r.id === roastId)
    if (!roast) return

    setLoadingAI(true)
    setSelectedRoastForAI(roastId)

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Prepare roast data for analysis
      const roastData = {
        green_weight: roast.green_weight,
        roasted_weight: roast.roasted_weight,
        weight_loss_percentage: roast.weight_loss,
        total_roast_time: roast.profile?.total_roast_time || '',
        first_crack_start: roast.profile?.first_crack_start || '',
        first_crack_end: roast.profile?.first_crack_end || '',
        development_time: roast.profile?.development_time || '',
        drop_temp: roast.profile?.drop_temp || '',
        charge_temp: roast.profile?.charge_temp || '',
        aroma_notes: roast.profile?.aroma_notes || '',
        bean_color_before: roast.profile?.bean_color_before || '',
        bean_color_after: roast.profile?.bean_color_after || '',
        cupping_score: roast.profile?.cupping_score || '',
        defects: roast.profile?.defects || ''
      }

      // Get previous roasts for context
      const previousRoasts = roasts
        .filter(r => r.green_coffee_name === roast.green_coffee_name && r.id !== roast.id)
        .slice(0, 3)
        .map(r => ({
          coffee_name: r.name,
          roast_level: r.roast_level,
          weight_loss: r.weight_loss,
          total_time: r.profile?.total_roast_time || 0
        }))

      const response = await fetch('/api/ai/roast-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          roast_data: roastData,
          coffee_origin: roast.green_coffee_name,
          target_roast_level: roast.roast_level,
          equipment_settings: roast.profile?.equipment_settings || {},
          previous_roasts: previousRoasts
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setAiAnalysis(data.analysis)
      } else {
        throw new Error(data.error || 'Failed to get AI analysis')
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error)
      alert(`Failed to analyze roast: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingAI(false)
    }
  }

  const handleBeanImageChange = (file: File | null) => {
    setBeanImage(file)
    setBeanAnalysis(null)
    setBeanAnalysisError(null)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setBeanImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setBeanImagePreview(null)
    }
  }

  const analyzeBeanPhoto = async () => {
    if (!beanImage) return
    setLoadingBeanAnalysis(true)
    setBeanAnalysisError(null)
    setBeanAnalysis(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const formData = new FormData()
      formData.append('image', beanImage)
      if (beanContext.trim()) formData.append('context', beanContext.trim())

      const response = await fetch('/api/ai/bean-analysis', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Analysis failed')
      setBeanAnalysis(data.analysis)
    } catch (error) {
      setBeanAnalysisError(error instanceof Error ? error.message : 'Failed to analyze photo')
    } finally {
      setLoadingBeanAnalysis(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Roast Analysis</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-600/60 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (roasts.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Roast Analysis</h3>
        </div>
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No roast data available</p>
          <p className="text-sm text-slate-500 mt-1">Complete some roasts to see analysis</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Analysis */}
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Roasting Analytics</h3>
        </div>

        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-300">Total Roasts</span>
              </div>
              <p className="text-2xl font-bold text-white">{analysis.totalRoasts}</p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-300">Avg Weight Loss</span>
              </div>
              <p className="text-2xl font-bold text-white">{analysis.avgWeightLoss}%</p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-300">Avg Charge Temp</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {analysis.profileMetrics.avgChargeTemp > 0 ? `${analysis.profileMetrics.avgChargeTemp}°C` : '—'}
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-300">Avg Roast Time</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {analysis.profileMetrics.avgTotalTime > 0 ? `${analysis.profileMetrics.avgTotalTime}m` : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Roast Level Distribution */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-slate-100 mb-3">Roast Level Distribution</h4>
              <div className="space-y-2">
                {Object.entries(analysis.roastLevels).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 capitalize">{level.replace('-', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-600/60 rounded-full h-2">
                        <div 
                          className="bg-amber-600 h-2 rounded-full" 
                          style={{ width: `${((count as number) / analysis.totalRoasts) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-white w-8">{String(count)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-slate-100 mb-3">Most Used Green Coffees</h4>
              <div className="space-y-2">
                {Object.entries(analysis.greenCoffeeUsage)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 5)
                  .map(([coffee, count]) => (
                    <div key={coffee} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 truncate">{coffee}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-600/60 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${((count as number) / analysis.totalRoasts) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-white w-6">{String(count)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Roast History & Comparison */}
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-white">Roast History & Comparison</h3>
          </div>
          {selectedRoasts.length > 0 && (
            <div className="text-sm text-slate-300">
              {selectedRoasts.length} roast{selectedRoasts.length !== 1 ? 's' : ''} selected for comparison
            </div>
          )}
        </div>

        {/* Comparison View */}
        {selectedRoasts.length > 1 && (
          <div className="mb-6 p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <h4 className="text-md font-semibold text-slate-100 mb-3">Roast Comparison</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2 font-medium text-slate-200">Metric</th>
                    {getSelectedRoastsData().map(roast => (
                      <th key={roast.id} className="text-left py-2 px-2 font-medium text-slate-200">
                        {roast.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/60">
                    <td className="py-2 px-2 text-slate-300">Roast Date</td>
                    {getSelectedRoastsData().map(roast => (
                      <td key={roast.id} className="py-2 px-2">{roast.roast_date}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/60">
                    <td className="py-2 px-2 text-slate-300">Roast Level</td>
                    {getSelectedRoastsData().map(roast => (
                      <td key={roast.id} className="py-2 px-2 capitalize">{roast.roast_level.replace('-', ' ')}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/60">
                    <td className="py-2 px-2 text-slate-300">Weight Loss</td>
                    {getSelectedRoastsData().map(roast => (
                      <td key={roast.id} className="py-2 px-2">{roast.weight_loss.toFixed(2)}%</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/60">
                    <td className="py-2 px-2 text-slate-300">Charge Temp</td>
                    {getSelectedRoastsData().map(roast => (
                      <td key={roast.id} className="py-2 px-2">
                        {roast.profile?.charge_temp ? `${roast.profile.charge_temp}°C` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700/60">
                    <td className="py-2 px-2 text-slate-300">Total Time</td>
                    {getSelectedRoastsData().map(roast => (
                      <td key={roast.id} className="py-2 px-2">
                        {roast.profile?.total_roast_time ? `${roast.profile.total_roast_time}m` : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roast List */}
        <div className="space-y-3">
          {roasts.map(roast => (
            <div 
              key={roast.id} 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedRoasts.includes(roast.id) 
                  ? 'border-amber-300 bg-amber-900/30' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => toggleRoastSelection(roast.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{roast.name}</h4>
                    <span className="px-2 py-1 bg-slate-700 text-slate-200 text-xs rounded-full">
                      Batch #{roast.batch_number}
                    </span>
                    <span className="px-2 py-1 bg-blue-900/40 text-blue-300 text-xs rounded-full capitalize">
                      {roast.roast_level.replace('-', ' ')}
                    </span>
                    {selectedRoasts.includes(roast.id) && (
                      <span className="px-2 py-1 bg-amber-900/40 text-amber-300 text-xs rounded-full">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <span>{roast.roast_date}</span>
                    <span>{roast.green_coffee_name}</span>
                    <span>{roast.green_weight}g → {roast.roasted_weight}g</span>
                    <span className="font-medium">{roast.weight_loss.toFixed(2)}% loss</span>
                    {roast.profile?.total_roast_time && (
                      <span>{roast.profile.total_roast_time}m roast</span>
                    )}
                  </div>
                </div>
                
                {/* AI Analysis Button */}
                <div className="ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      analyzeRoastWithAI(roast.id)
                    }}
                    disabled={loadingAI}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs rounded-lg transition-colors"
                  >
                    {loadingAI && selectedRoastForAI === roast.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3" />
                        AI Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bean Photo Analysis */}
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-6 w-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Bean Photo Analysis</h3>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </div>
        <p className="text-sm text-slate-400 mb-5">
          Upload a photo of your beans — before or after roasting — and get instant AI feedback on roast level, uniformity, defects, and flavor predictions.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload side */}
          <div className="space-y-4">
            <div
              onClick={() => !beanImage && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file && file.type.startsWith('image/')) handleBeanImageChange(file)
              }}
              className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
                beanImage ? 'border-amber-300 bg-amber-900/30' : 'border-slate-600 hover:border-amber-400 cursor-pointer bg-slate-900/50'
              }`}
              style={{ minHeight: '200px' }}
            >
              {beanImagePreview ? (
                <div className="relative">
                  <img src={beanImagePreview} alt="Bean preview" className="w-full object-cover rounded-xl" style={{ maxHeight: '260px' }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBeanImageChange(null) }}
                    className="absolute top-2 right-2 bg-slate-800 rounded-full p-1 shadow hover:bg-slate-700"
                  >
                    <X className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                  <Upload className="h-10 w-10 text-slate-500 mb-3" />
                  <p className="text-sm font-medium text-slate-300">Drop a photo here or click to upload</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP up to 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleBeanImageChange(e.target.files?.[0] ?? null)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Optional context <span className="text-slate-500 font-normal">(roast level target, bean origin, etc.)</span>
              </label>
              <textarea
                value={beanContext}
                onChange={(e) => setBeanContext(e.target.value)}
                rows={2}
                placeholder="e.g. Aiming for medium roast, Ethiopian Yirgacheffe, just hit first crack..."
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            <button
              onClick={analyzeBeanPhoto}
              disabled={!beanImage || loadingBeanAnalysis}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {loadingBeanAnalysis ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyze Beans
                </>
              )}
            </button>

            {beanAnalysisError && (
              <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {beanAnalysisError}
              </div>
            )}
          </div>

          {/* Results side */}
          <div>
            {beanAnalysis ? (
              <div className="space-y-3">
                {/* At-a-glance badges */}
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className="px-3 py-1 bg-amber-900/40 text-amber-200 text-sm font-medium rounded-full capitalize">
                    {beanAnalysis.roast_level_estimate.replace('-', ' ')}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
                    beanAnalysis.color_uniformity === 'excellent' ? 'bg-emerald-900/40 text-emerald-200' :
                    beanAnalysis.color_uniformity === 'good' ? 'bg-blue-900/40 text-blue-200' :
                    beanAnalysis.color_uniformity === 'fair' ? 'bg-yellow-900/40 text-yellow-200' :
                    'bg-red-900/40 text-red-200'
                  }`}>
                    {beanAnalysis.color_uniformity} uniformity
                  </span>
                  <span className="px-3 py-1 bg-slate-700 text-slate-200 text-sm rounded-full capitalize">
                    {beanAnalysis.surface_appearance}
                  </span>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    beanAnalysis.confidence === 'high' ? 'bg-emerald-900/30 text-green-600' :
                    beanAnalysis.confidence === 'medium' ? 'bg-yellow-900/30 text-yellow-600' :
                    'bg-slate-900/50 text-slate-400'
                  }`}>
                    {beanAnalysis.confidence} confidence
                  </span>
                </div>

                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-900 mb-1">Overall Assessment</p>
                  <p className="text-sm text-amber-200">{beanAnalysis.overall_assessment}</p>
                </div>

                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900 mb-1">Development</p>
                  <p className="text-sm text-blue-200">{beanAnalysis.development_assessment}</p>
                </div>

                <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-900 mb-1">Expected Cup Flavor</p>
                  <p className="text-sm text-purple-200">{beanAnalysis.flavor_prediction}</p>
                </div>

                {beanAnalysis.visible_defects.length > 0 && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-900 mb-1">Visible Defects</p>
                    <ul className="text-sm text-red-200 space-y-0.5">
                      {beanAnalysis.visible_defects.map((d, i) => (
                        <li key={i} className="flex items-start gap-1"><span className="mt-1">•</span>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {beanAnalysis.recommendations.length > 0 && (
                  <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-900 mb-1">Recommendations</p>
                    <ul className="text-sm text-emerald-200 space-y-1">
                      {beanAnalysis.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-12">
                <Camera className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Upload a photo to see AI feedback here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <div className="bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-white">AI Roast Analysis</h3>
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Rating & Quality */}
            <div className="space-y-4">
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Overall Rating
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-900">{aiAnalysis.overall_rating}/10</span>
                  <span className="text-sm text-purple-300">{aiAnalysis.roast_quality}</span>
                </div>
              </div>

              {aiAnalysis.weight_loss_assessment && (
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Weight Loss Assessment</h5>
                  <p className="text-sm text-blue-200">{aiAnalysis.weight_loss_assessment}</p>
                </div>
              )}

              {aiAnalysis.development_analysis && (
                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">Development Analysis</h5>
                  <p className="text-sm text-emerald-200">{aiAnalysis.development_analysis}</p>
                </div>
              )}

              {aiAnalysis.temperature_feedback && (
                <div className="bg-orange-900/30 border border-orange-200 rounded-lg p-4">
                  <h5 className="font-medium text-orange-900 mb-2">Temperature Profile</h5>
                  <p className="text-sm text-orange-200">{aiAnalysis.temperature_feedback}</p>
                </div>
              )}
            </div>

            {/* Recommendations & Issues */}
            <div className="space-y-4">
              {aiAnalysis.identified_issues && aiAnalysis.identified_issues.length > 0 && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                  <h5 className="font-medium text-red-900 mb-2">Identified Issues</h5>
                  <ul className="text-sm text-red-200 space-y-1">
                    {aiAnalysis.identified_issues.map((issue: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-600 mt-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.next_roast_recommendations && aiAnalysis.next_roast_recommendations.length > 0 && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
                  <h5 className="font-medium text-amber-900 mb-2">Next Roast Recommendations</h5>
                  <ul className="text-sm text-amber-200 space-y-1">
                    {aiAnalysis.next_roast_recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.success_indicators && aiAnalysis.success_indicators.length > 0 && (
                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">What Went Well</h5>
                  <ul className="text-sm text-emerald-200 space-y-1">
                    {aiAnalysis.success_indicators.map((success: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>{success}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.flavor_impact && (
                <div className="bg-indigo-900/30 border border-indigo-200 rounded-lg p-4">
                  <h5 className="font-medium text-indigo-900 mb-2">Expected Flavor Impact</h5>
                  <p className="text-sm text-indigo-200">{aiAnalysis.flavor_impact}</p>
                </div>
              )}

              {aiAnalysis.equipment_adjustments && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-2">Equipment Adjustments</h5>
                  <p className="text-sm text-slate-100">{aiAnalysis.equipment_adjustments}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
            <button
              onClick={() => setAiAnalysis(null)}
              className="text-slate-300 hover:text-slate-100 text-sm font-medium"
            >
              Close Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  )
}