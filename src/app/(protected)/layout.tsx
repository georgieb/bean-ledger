'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth-context'
import { LogOut, Settings, Coffee, Calendar, History, Wrench, Brain, Zap, Package } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
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
    { name: 'Inventory', href: '/inventory', icon: Package },
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
    <nav className="bg-slate-900 border-b border-slate-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 mr-6">
              <span className="text-2xl">☕</span>
              <span className="font-bold text-xl text-white tracking-tight">Bean Ledger</span>
            </Link>

            <nav className="flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href)) ||
                  (item.href === '/dashboard' && (pathname === '/' || pathname === '/dashboard'))

                const isAI = item.href.startsWith('/ai-')

                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={`inline-flex items-center px-3 py-2 text-xs xl:text-sm font-medium rounded-md transition-all ${
                      isActive
                        ? isAI
                          ? 'text-violet-300 bg-violet-900/50 border border-violet-600/50'
                          : 'text-amber-300 bg-amber-900/40 border border-amber-600/40'
                        : isAI
                          ? 'text-slate-300 hover:text-violet-300 hover:bg-violet-900/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 xl:mr-1.5" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden xl:block truncate max-w-[180px]">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 xl:mr-1.5" />
              <span className="hidden xl:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">☕</span>
              <span className="font-bold text-lg text-white">Bean Ledger</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
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

          {mobileMenuOpen && (
            <div className="pb-4 space-y-1 border-t border-slate-700/60 pt-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href)) ||
                  (item.href === '/dashboard' && (pathname === '/' || pathname === '/dashboard'))
                const isAI = item.href.startsWith('/ai-')

                return (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? isAI
                          ? 'text-violet-300 bg-violet-900/50'
                          : 'text-amber-300 bg-amber-900/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}

              <div className="pt-3 border-t border-slate-700/60 mt-2">
                <div className="px-3 py-1 text-xs text-slate-500">{user?.email}</div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
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
