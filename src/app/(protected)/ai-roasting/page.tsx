'use client'

import { useState, useEffect } from 'react'
import { getLedgerEntries } from '@/lib/ledger'
import { supabase } from '@/lib/supabase'
import { parseStoredRecommendation } from '@/lib/ai-recommendation'
import { RoastPlanner } from '@/components/ai/roast-planner'
import { Zap, Coffee, TrendingUp, Star, Loader2, Sparkles, History, Brain, BarChart3, AlertCircle, Upload, Camera, X, Image, CheckCircle } from 'lucide-react'

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

interface RoastAnalysis {
  overall_rating: string
  roast_quality: string
  development_analysis: string
  weight_loss_assessment: string
  temperature_feedback: string
  identified_issues: string[]
  next_roast_recommendations: string[]
  flavor_impact: string
  equipment_adjustments: string
  success_indicators: string[]
  visual_analysis?: string // Optional field for image-based analysis
}

interface SavedAnalysis {
  id: string
  roast_id: string
  coffee_name: string
  roast_level: string
  weight_loss_range: string
  analysis: RoastAnalysis
  created_at: string
}

export default function AIRoastingPage() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'planning'>('analysis')
  const [roasts, setRoasts] = useState<RoastData[]>([])
  const [selectedRoast, setSelectedRoast] = useState<string>('')
  const [analysis, setAnalysis] = useState<RoastAnalysis | null>(null)
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAI, setLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(true)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    loadRoastData()
    loadSavedAnalyses()
  }, [])

  useEffect(() => {
    if (selectedRoast) {
      checkForExistingAnalysis()
    }
  }, [selectedRoast, savedAnalyses])

  const loadRoastData = async () => {
    setLoading(true)
    try {
      const entries = await getLedgerEntries(50)
      
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
      
      if (roastEntries.length > 0 && !selectedRoast) {
        setSelectedRoast(roastEntries[0].id)
      }
    } catch (error) {
      console.error('Error loading roast data:', error)
      setError('Failed to load roast data')
    } finally {
      setLoading(false)
    }
  }

  const loadSavedAnalyses = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user) return

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .eq('recommendation_type', 'roast_profile')
        .order('created_at', { ascending: false })

      if (error) throw error

      const analyses = data?.map((rec: any) => ({
        id: rec.id,
        roast_id: rec.input_context.roast_data?.id || 'unknown',
        coffee_name: rec.input_context.coffee_origin || 'Unknown',
        roast_level: rec.input_context.target_roast_level || 'Unknown',
        weight_loss_range: getWeightLossRange(rec.input_context.roast_data?.weight_loss_percentage || 0),
        analysis: parseStoredRecommendation(rec.recommendation),
        created_at: rec.created_at
      })) || []

      setSavedAnalyses(analyses)
    } catch (error) {
      console.error('Error loading saved analyses:', error)
    }
  }

  const getWeightLossRange = (weightLoss: number): string => {
    if (weightLoss < 12) return 'under-12'
    if (weightLoss <= 15) return '12-15'
    if (weightLoss <= 18) return '15-18'
    if (weightLoss <= 22) return '18-22'
    return 'over-22'
  }

  const checkForExistingAnalysis = () => {
    const roast = roasts.find(r => r.id === selectedRoast)
    if (!roast) return

    const weightLossRange = getWeightLossRange(roast.weight_loss)
    const existingAnalysis = savedAnalyses.find(analysis => 
      analysis.coffee_name === roast.green_coffee_name &&
      analysis.roast_level === roast.roast_level &&
      analysis.weight_loss_range === weightLossRange
    )

    if (existingAnalysis) {
      setAnalysis(existingAnalysis.analysis)
      setError('Using saved analysis (no API call needed)')
      setTimeout(() => setError(null), 3000)
    } else {
      setAnalysis(null)
    }
  }

  const analyzeRoastWithAI = async () => {
    const roast = roasts.find(r => r.id === selectedRoast)
    if (!roast) return

    // Check for existing analysis first
    const weightLossRange = getWeightLossRange(roast.weight_loss)
    const existingAnalysis = savedAnalyses.find(analysis => 
      analysis.coffee_name === roast.green_coffee_name &&
      analysis.roast_level === roast.roast_level &&
      analysis.weight_loss_range === weightLossRange
    )

    if (existingAnalysis) {
      setAnalysis(existingAnalysis.analysis)
      setError('Using saved analysis (no API call needed)')
      setTimeout(() => setError(null), 3000)
      return
    }

    setLoadingAI(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Prepare roast data for analysis
      const roastData = {
        id: roast.id,
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

      // Get similar roasts for context
      const previousRoasts = roasts
        .filter(r => r.green_coffee_name === roast.green_coffee_name && r.id !== roast.id)
        .slice(0, 3)
        .map(r => ({
          coffee_name: r.name,
          roast_level: r.roast_level,
          weight_loss: r.weight_loss,
          total_time: r.profile?.total_roast_time || 0
        }))

      let response: Response

      if (uploadedImage) {
        // If image is uploaded, use FormData for multipart/form-data
        const formData = new FormData()
        formData.append('roast_data', JSON.stringify(roastData))
        formData.append('coffee_origin', roast.green_coffee_name)
        formData.append('target_roast_level', roast.roast_level)
        formData.append('equipment_settings', JSON.stringify(roast.profile?.equipment_settings || {}))
        formData.append('previous_roasts', JSON.stringify(previousRoasts))
        formData.append('roast_image', uploadedImage)

        response = await fetch('/api/ai/roast-profile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        })
      } else {
        // Regular JSON request if no image
        response = await fetch('/api/ai/roast-profile', {
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
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
        // Clear uploaded image after successful analysis
        setUploadedImage(null)
        setImagePreview(null)
      } else {
        throw new Error(data.error || 'Failed to get AI analysis')
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error)
      setError(error instanceof Error ? error.message : 'Failed to get analysis')
    } finally {
      setLoadingAI(false)
    }
  }

  const applyAnalysis = (savedAnalysis: SavedAnalysis) => {
    setAnalysis(savedAnalysis.analysis)
    setError('Applied saved analysis')
    setTimeout(() => setError(null), 2000)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }

      setUploadedImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      setError(null)
    }
  }

  const removeImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
  }

  const selectedRoastData = roasts.find(r => r.id === selectedRoast)

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              AI Roasting Assistant
            </h1>
            <p className="text-slate-300 mt-1 text-lg">Claude-powered roast analysis and planning</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (roasts.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              AI Roasting Assistant
            </h1>
            <p className="text-slate-300 mt-1 text-lg">Claude-powered roast analysis and planning</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <Coffee className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No roast data available</p>
            <p className="text-sm text-gray-400 mt-1">Complete some roasts to get AI analysis</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            AI Roasting Assistant
          </h1>
          <p className="text-slate-300 mt-1 text-lg">Claude-powered roast analysis and planning</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analysis'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Roast Analysis
              </div>
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'planning'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Roast Planning
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'planning' ? (
        <RoastPlanner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Roast Selection and Analysis */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Roast for Analysis</h3>
            
            <div className="space-y-4">
              {/* Roast Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recent Roasts</label>
                <select
                  value={selectedRoast}
                  onChange={(e) => setSelectedRoast(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {roasts.map(roast => (
                    <option key={roast.id} value={roast.id}>
                      {roast.name} - {roast.roast_level} ({roast.weight_loss.toFixed(1)}% loss)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Roast Details */}
              {selectedRoastData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Roast Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Coffee:</span>
                      <span className="ml-2 font-medium">{selectedRoastData.green_coffee_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Roast Level:</span>
                      <span className="ml-2 font-medium">{selectedRoastData.roast_level}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Green Weight:</span>
                      <span className="ml-2 font-medium">{selectedRoastData.green_weight}g</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Roasted Weight:</span>
                      <span className="ml-2 font-medium">{selectedRoastData.roasted_weight}g</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight Loss:</span>
                      <span className="ml-2 font-medium">{selectedRoastData.weight_loss.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Roast Date:</span>
                      <span className="ml-2 font-medium">{selectedRoastData.roast_date}</span>
                    </div>
                  </div>

                  {selectedRoastData.profile && Object.keys(selectedRoastData.profile).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Profile Data Available:</span>
                      <span className="ml-2 text-sm text-green-600">
                        {Object.keys(selectedRoastData.profile).length} metrics recorded
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Upload Roast Image (Optional)
                  </div>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload a photo of your roasted beans for AI visual analysis and color assessment
                </p>
                
                {!imagePreview ? (
                  <label className="block w-full cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload roast image
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Roast preview" 
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                      <Image className="h-3 w-3 inline mr-1" />
                      Image uploaded
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={analyzeRoastWithAI}
                disabled={loadingAI || !selectedRoast}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loadingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Roast{uploadedImage ? ' & Image' : ''}...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    {uploadedImage ? (
                      <>
                        <Camera className="h-4 w-4" />
                        Get AI Analysis with Image
                      </>
                    ) : (
                      'Get AI Analysis'
                    )}
                  </>
                )}
              </button>

              {error && (
                <div className={`text-sm mt-2 p-3 rounded-lg ${
                  error.includes('saved analysis') || error.includes('Applied') 
                    ? 'text-green-600 bg-green-50 border border-green-200'
                    : 'text-red-600 bg-red-50 border border-red-200'
                }`}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="mt-8 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/60 rounded-xl shadow-lg shadow-slate-900/5 backdrop-blur-sm">
              <div className="px-8 py-6 border-b border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 tracking-tight">AI Roast Analysis</h3>
                      <p className="text-sm text-slate-600 mt-0.5">Machine learning insights • Powered by Claude</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                      Analysis Complete
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Overall Rating & Quality */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="relative">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-1.5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
                          <Star className="h-4 w-4 text-white" />
                        </div>
                        <h5 className="font-semibold text-slate-900">Overall Rating</h5>
                      </div>
                      
                      {/* Rating Visualization */}
                      <div className="relative mb-4">
                        <div className="flex items-end justify-center h-20 mb-3">
                          <div className="text-5xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
                            {analysis.overall_rating}
                          </div>
                          <div className="text-lg font-medium text-slate-500 mb-2">
                            /10
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                              Number(analysis.overall_rating) <= 3 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                              Number(analysis.overall_rating) <= 6 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              'bg-gradient-to-r from-green-500 to-emerald-600'
                            }`}
                            style={{ width: `${(Number(analysis.overall_rating) / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed">{analysis.roast_quality}</p>
                    </div>
                  </div>
                </div>
                
                {/* Key Metrics Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {analysis.weight_loss_assessment && (
                      <div className="bg-white/60 backdrop-blur-sm border border-blue-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-blue-500 rounded-md">
                            <div className="w-3 h-3 bg-white rounded-sm"></div>
                          </div>
                          <h6 className="font-medium text-slate-800 text-sm">Weight Loss Assessment</h6>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{analysis.weight_loss_assessment}</p>
                      </div>
                    )}

                    {analysis.development_analysis && (
                      <div className="bg-white/60 backdrop-blur-sm border border-emerald-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-emerald-500 rounded-md">
                            <div className="w-3 h-3 bg-white rounded-sm"></div>
                          </div>
                          <h6 className="font-medium text-slate-800 text-sm">Development Analysis</h6>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{analysis.development_analysis}</p>
                      </div>
                    )}

                    {analysis.temperature_feedback && (
                      <div className="bg-white/60 backdrop-blur-sm border border-purple-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-purple-500 rounded-md">
                            <div className="w-3 h-3 bg-white rounded-sm"></div>
                          </div>
                          <h6 className="font-medium text-slate-800 text-sm">Temperature Profile</h6>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{analysis.temperature_feedback}</p>
                      </div>
                    )}

                    {analysis.flavor_impact && (
                      <div className="bg-white/60 backdrop-blur-sm border border-indigo-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1 bg-indigo-500 rounded-md">
                            <div className="w-3 h-3 bg-white rounded-sm"></div>
                          </div>
                          <h6 className="font-medium text-slate-800 text-sm">Expected Flavor Impact</h6>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{analysis.flavor_impact}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Issues and Recommendations Section */}
              <div className="px-8 py-6 border-t border-slate-200/60">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Identified Issues */}
                  {analysis.identified_issues && analysis.identified_issues.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm border border-red-200/60 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                        <h6 className="font-semibold text-slate-900">Critical Issues</h6>
                      </div>
                      <div className="space-y-3">
                        {analysis.identified_issues.map((issue: string, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
                            <div className="flex-shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full mt-2"></div>
                            <p className="text-sm text-slate-700 leading-relaxed">{issue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.next_roast_recommendations && analysis.next_roast_recommendations.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <h6 className="font-semibold text-slate-900">Optimization Plan</h6>
                      </div>
                      <div className="space-y-3">
                        {analysis.next_roast_recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                            <div className="flex-shrink-0 w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
                            <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Indicators */}
                  {analysis.success_indicators && analysis.success_indicators.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm border border-emerald-200/60 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <h6 className="font-semibold text-slate-900">Success Metrics</h6>
                      </div>
                      <div className="space-y-3">
                        {analysis.success_indicators.map((success: string, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                            <div className="flex-shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2"></div>
                            <p className="text-sm text-slate-700 leading-relaxed">{success}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Analysis Section */}
              {(analysis.equipment_adjustments || analysis.visual_analysis) && (
                <div className="px-8 py-6 border-t border-slate-200/60">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {analysis.equipment_adjustments && (
                      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg">
                            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
                          </div>
                          <h6 className="font-semibold text-slate-900">Equipment Optimization</h6>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{analysis.equipment_adjustments}</p>
                      </div>
                    )}

                    {analysis.visual_analysis && (
                      <div className="bg-white/80 backdrop-blur-sm border border-pink-200/60 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                            <Image className="h-4 w-4 text-white" />
                          </div>
                          <h6 className="font-semibold text-slate-900">Visual Bean Analysis</h6>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{analysis.visual_analysis}</p>
                      </div>
                    )}
                    
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Saved Analyses Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Saved Analyses</h3>
              </div>
              <button
                onClick={() => setShowSavedAnalyses(!showSavedAnalyses)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showSavedAnalyses ? 'Hide' : 'Show'}
              </button>
            </div>

            {showSavedAnalyses && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedAnalyses.length === 0 ? (
                  <p className="text-gray-500 text-sm">No saved analyses yet</p>
                ) : (
                  savedAnalyses.slice(0, 10).map((savedAnalysis) => (
                    <div 
                      key={savedAnalysis.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => applyAnalysis(savedAnalysis)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">{savedAnalysis.coffee_name}</span>
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {savedAnalysis.analysis.overall_rating}/10
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Level:</strong> {savedAnalysis.roast_level}</p>
                        <p><strong>Weight Loss:</strong> {savedAnalysis.weight_loss_range}%</p>
                        <p className="text-orange-600">Click to apply</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {savedAnalyses.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Analysis Benefits</span>
              </div>
              <ul className="text-xs text-orange-800 space-y-1">
                <li>• Saves API credits by reusing analyses</li>
                <li>• Track improvement patterns over time</li>
                <li>• Compare similar roast conditions</li>
                <li>• {savedAnalyses.length} analyses saved so far</li>
              </ul>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}