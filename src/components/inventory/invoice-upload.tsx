'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ExtractedData {
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

interface InvoiceUploadProps {
  onDataExtracted: (data: ExtractedData | ExtractedData[]) => void
}

export function InvoiceUpload({ onDataExtracted }: InvoiceUploadProps) {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be less than 10MB')
      return
    }

    setImage(file)
    setError(null)
    setSuccess(false)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const processInvoice = async () => {
    if (!image) return

    setIsProcessing(true)
    setError(null)

    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('Session data:', { session, sessionError })
      console.log('Access token exists:', !!session?.access_token)
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`)
      }
      
      if (!session?.access_token) {
        throw new Error('No valid session found. Please sign in again.')
      }

      const formData = new FormData()
      formData.append('image', image)

      const response = await fetch('/api/ai/invoice-processing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error('API response text:', responseText)
        
        // Try to parse as JSON, fallback to text if that fails
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: `HTTP ${response.status}: ${responseText}` }
        }
        
        throw new Error(errorData.error || 'Failed to process invoice')
      }

      const data = await response.json()
      
      if (data.success) {
        setSuccess(true)
        onDataExtracted(data.extracted_data)
      } else {
        throw new Error('Failed to extract data from invoice')
      }

    } catch (error: any) {
      console.error('Invoice processing error:', error)
      setError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearImage = () => {
    setImage(null)
    setImagePreview(null)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-dashed border-green-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Upload Invoice Photo</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Take a photo or upload an image of your green coffee invoice. AI will automatically extract purchase details.
      </p>

      {!imagePreview ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drop an image here or <span className="text-green-600 font-semibold">click to browse</span>
          </p>
          <p className="text-sm text-gray-400">
            Supports JPG, PNG, WEBP (max 10MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Invoice preview"
              className="w-full h-64 object-cover rounded-lg border"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={processInvoice}
              disabled={isProcessing || success}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {isProcessing ? 'Processing...' : success ? 'Processed!' : 'Extract Data'}
            </button>
            
            <button
              onClick={clearImage}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-green-700 text-sm">
            Invoice data extracted successfully! Check the form fields below.
          </p>
        </div>
      )}
    </div>
  )
}