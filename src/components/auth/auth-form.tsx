'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail, signUpWithEmail, supabase } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        
        const { user, session } = await signUpWithEmail(formData.email, formData.password)
        
        if (user && !user.email_confirmed_at) {
          setError('Please check your email and click the confirmation link to complete registration.')
          return
        }
        
        // If user is created but no session (email confirmation required)
        if (user && !session) {
          setError('Registration successful! Please check your email and click the confirmation link to complete your account setup.')
          return
        }
      } else {
        console.log('🔐 Attempting sign in with:', formData.email)
        console.log('📧 Email confirmation should be disabled in Supabase')
        
        const result = await signInWithEmail(formData.email, formData.password)
        console.log('✅ Sign in result:', { 
          user: !!result.user, 
          session: !!result.session,
          userEmail: result.user?.email,
          emailConfirmed: result.user?.email_confirmed_at
        })
        
        // Verify session is actually stored
        setTimeout(async () => {
          const { data: { session: storedSession } } = await supabase.auth.getSession()
          console.log('🔍 Session verification after sign-in:', {
            hasStoredSession: !!storedSession,
            userEmail: storedSession?.user?.email
          })
        }, 500)
      }
      
      console.log('🚀 Auth successful, waiting for state update before redirect...')
      
      // Wait a moment for auth state to propagate, then redirect
      setTimeout(() => {
        console.log('🚀 Now redirecting to dashboard...')
        window.location.href = '/dashboard'
      }, 500)
    } catch (err: any) {
      console.error('Auth error:', err)
      
      // Provide more specific error messages
      let errorMessage = err.message || 'An error occurred'
      
      if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Email confirmation required. To fix: Go to Supabase Dashboard → Authentication → Settings → Disable "Enable email confirmations"'
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (err.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (err.message?.includes('signup is disabled')) {
        errorMessage = 'New user registration is currently disabled. Please contact support.'
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-gray-600">
          {mode === 'login' 
            ? 'Welcome back to Bean Ledger' 
            : 'Start your coffee journey today'
          }
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
              placeholder="your@email.com"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
              placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <a
            href={mode === 'login' ? '/signup' : '/login'}
            className="font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </a>
        </p>
      </div>
    </form>
  )
}