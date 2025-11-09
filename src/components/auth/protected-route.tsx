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
      console.log('🚫 No user found, redirecting to login')
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
            <p className="text-gray-600">Loading...</p>
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