'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth-context'
import { LogOut, Settings, Coffee, Calendar, History, Wrench, Brain, Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-espresso via-espresso to-espresso-light">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}

function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const navigation: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    { name: 'Dashboard', href: '/dashboard', icon: Coffee },
    { name: 'Inventory', href: '/inventory', icon: Coffee },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'History', href: '/history', icon: History },
    { name: 'Equipment', href: '/equipment', icon: Wrench },
    { name: 'AI Brewing', href: '/ai-brewing', icon: Brain },
    { name: 'AI Roasting', href: '/ai-roasting', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <nav className="bg-gradient-to-r from-espresso-light/90 to-espresso/90 backdrop-blur-md border-b border-brass/20 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex justify-between h-16">
          <div className="flex items-center min-w-0">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="p-1.5 bg-gradient-to-br from-brass to-brass-light rounded-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl text-espresso">☕</span>
              </div>
              <span className="font-display font-semibold text-xl text-cream tracking-tight">Bean <span className="text-brass-light">Ledger</span></span>
            </Link>

            <nav className="ml-8 flex space-x-2 xl:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href)) ||
                  (item.href === '/dashboard' && (pathname === '/' || pathname === '/dashboard'))

                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'text-espresso bg-gradient-to-r from-brass to-brass-light shadow-lg shadow-black/25'
                        : 'text-cream-dark hover:text-cream hover:bg-espresso-light/50 hover:scale-105'
                    }`}
                  >
                    <Icon className="h-4 w-4 xl:mr-2" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4 min-w-0">
            <div className="text-sm text-cream-dark hidden 2xl:block truncate max-w-[200px]">
              {user?.email}
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-cream-dark hover:text-cream hover:bg-espresso-light/50 rounded-xl transition-all duration-300 hover:scale-105 flex-shrink-0"
            >
              <LogOut className="h-4 w-4 xl:mr-2" />
              <span className="hidden xl:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="p-1.5 bg-gradient-to-br from-brass to-brass-light rounded-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-xl text-espresso">☕</span>
              </div>
              <span className="font-display font-semibold text-lg text-cream tracking-tight">Bean <span className="text-brass-light">Ledger</span></span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-cream-dark hover:text-cream hover:bg-espresso-light/50 rounded-lg transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="pb-4 space-y-1 bg-espresso-light/50 backdrop-blur-sm rounded-b-xl border-t border-brass/20">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href)) ||
                  (item.href === '/dashboard' && (pathname === '/' || pathname === '/dashboard'))

                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-3 mx-2 text-sm font-medium rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'text-espresso bg-gradient-to-r from-brass to-brass-light shadow-lg shadow-black/25'
                        : 'text-cream-dark hover:text-cream hover:bg-espresso-light/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                )
              })}

              <div className="pt-4 mt-4 border-t border-brass/20 mx-2">
                <div className="px-3 py-2 text-sm text-cream-dark">
                  {user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-3 text-sm font-medium text-cream-dark hover:text-cream hover:bg-espresso-light/50 rounded-xl transition-all duration-300"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}