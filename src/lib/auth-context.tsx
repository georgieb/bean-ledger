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
    // Skip initial session check - rely on auth state changes instead
    console.log('⚡ Skipping initial session check, relying on auth state changes')
    setLoading(false)

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
            // Try to get user preferences to see if user is set up
            const { data: prefs } = await supabase
              .from('user_preferences')
              .select('user_id')
              .eq('user_id', session.user.id)
              .single()
            
            // If no preferences found, this might be a new user
            if (!prefs) {
              console.log('Setting up new user...')
              await setupNewUser(session.user.id)
            }
            
            console.log('✅ User setup completed')
            
            // Force redirect to dashboard if we're on login page
            if (typeof window !== 'undefined' && window.location.pathname === '/login') {
              console.log('🚀 Auto-redirecting to dashboard after successful sign-in')
              window.location.href = '/dashboard'
            }
          } catch (error) {
            console.error('Error checking/setting up user:', error)
            // Don't fail the sign-in if user setup fails
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