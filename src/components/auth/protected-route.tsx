'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  console.log('🛡️ ProtectedRoute state:', { 
    loading, 
    hasUser: !!user, 
    userEmail: user?.email 
  })

  useEffect(() => {
    if (!loading && !user) {
      // Add a small delay to ensure auth state has time to update
      const timer = setTimeout(() => {
        if (!user) {
          console.log('🚫 No user found after delay, redirecting to login')
          router.push('/login')
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
            <p className="text-gray-600">Loading...</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>If this takes too long, try refreshing or <a href="/login" className="text-amber-600 hover:underline">signing in again</a></p>
            </div>
          </div>
        </div>
      )
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}