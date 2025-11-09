'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    if (!loading && !hasRedirected) {
      setHasRedirected(true)
      
      if (user) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [user, loading, router, hasRedirected])

  // Show a timeout message if loading takes too long
  const [showTimeout, setShowTimeout] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true)
    }, 5000)
    
    if (!loading) {
      clearTimeout(timer)
    }
    
    return () => clearTimeout(timer)
  }, [loading])

  // Always show loading while we determine where to redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
        <p className="text-amber-700">
          {loading ? 'Loading your coffee dashboard...' : 'Redirecting...'}
        </p>
        {showTimeout && (
          <div className="mt-4 p-4 bg-amber-100 rounded-lg">
            <p className="text-amber-800 text-sm">
              Taking longer than expected? Try:
            </p>
            <div className="mt-2 space-x-2">
              <button 
                onClick={() => router.push('/login')}
                className="text-amber-600 hover:text-amber-700 underline text-sm"
              >
                Go to Login
              </button>
              <span className="text-amber-600">•</span>
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-amber-600 hover:text-amber-700 underline text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}