'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getCurrentUser } from './supabase'
import { setupNewUser } from './user-setup'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    // Get initial session first, then listen for changes
    const getInitialSession = async () => {
      try {
        console.log('⚡ Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting initial session:', error)
        } else {
          console.log('📋 Initial session:', { 
            hasSession: !!session, 
            hasUser: !!session?.user,
            email: session?.user?.email 
          })
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        console.log('🔄 Setting loading to false after initial session check')
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, { 
          hasUser: !!session?.user, 
          hasSession: !!session,
          userEmail: session?.user?.email 
        })
        
        // Update user state immediately
        setUser(session?.user ?? null)
        console.log('👤 User state updated:', {
          hasUser: !!session?.user,
          email: session?.user?.email
        })
        
        // Ensure loading is false after any auth state change
        if (loading) {
          console.log('🔄 Setting loading to false due to auth state change')
          setLoading(false)
        }
        
        // Handle specific auth events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🎉 User signed in successfully, setting up user if needed...')
          // User signed in successfully - check if new user needs setup
          try {
            console.log('⚠️ Skipping user setup check for now')
            
            // Force redirect to dashboard if we're on login page
            if (typeof window !== 'undefined' && window.location.pathname === '/login') {
              console.log('🚀 Auto-redirecting to dashboard after successful sign-in')
              window.location.href = '/dashboard'
            }
          } catch (error) {
            console.error('Error in post-signin flow:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}