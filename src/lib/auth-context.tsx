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
    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        )
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (error) {
          console.error('❌ Session error:', error)
          throw error
        }
        
        console.log('📊 Initial session result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          expiresAt: session?.expires_at,
          accessToken: session?.access_token ? 'present' : 'missing'
        })
        
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('❌ Error getting session:', error.message)
        setUser(null)
      } finally {
        console.log('✅ Auth context loading completed, setting loading to false')
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
        
        // Ensure loading is false after any auth state change
        if (loading) {
          console.log('🔄 Setting loading to false due to auth state change')
          setLoading(false)
        }
        
        // Handle specific auth events
        if (event === 'SIGNED_IN' && session?.user) {
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
          } catch (error) {
            console.error('Error checking/setting up user:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out
        } else if (event === 'TOKEN_REFRESHED') {
          // Session token was refreshed
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