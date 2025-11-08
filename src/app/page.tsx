'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Coffee, TrendingUp, Calendar, Target, Loader2 } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-amber-700">Loading your coffee dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {user.email?.split('@')[0]}! ☕
        </h1>
        <p className="text-xl text-gray-600">
          Your Coffee Management Dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Roasts"
          value="3"
          subtitle="coffees aging"
          icon={Coffee}
          color="amber"
        />
        <StatCard
          title="This Week"
          value="420g"
          subtitle="consumed"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Next Roast"
          value="Tomorrow"
          subtitle="Guatemala scheduled"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Perfect Brews"
          value="12"
          subtitle="rated 5 stars"
          icon={Target}
          color="purple"
        />
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Drink Today Recommendation</h2>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-amber-900">Ethiopian Yirgacheffe</h3>
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">PEAK</span>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              Roasted 9 days ago • 85g remaining • Light roast
            </p>
            <p className="text-xs text-amber-600">
              Perfect age for bright, floral notes. Try a V60 pour-over at 93°C.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <ActivityItem
              action="Brewed 20g Ethiopian Yirgacheffe"
              time="2 hours ago"
              rating={5}
            />
            <ActivityItem
              action="Completed Guatemala Antigua roast"
              time="Yesterday"
              rating={4}
            />
            <ActivityItem
              action="Added new Chemex to equipment"
              time="3 days ago"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton href="/inventory" icon="☕" text="Log Brew" />
          <ActionButton href="/schedule" icon="🔥" text="Schedule Roast" />
          <ActionButton href="/inventory" icon="📦" text="Add Coffee" />
          <ActionButton href="/history" icon="📊" text="View Analytics" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string
  value: string
  subtitle: string
  icon: any
  color: 'amber' | 'green' | 'blue' | 'purple'
}) {
  const colorClasses = {
    amber: 'text-amber-600 bg-amber-50',
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ 
  action, 
  time, 
  rating 
}: { 
  action: string
  time: string
  rating?: number
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{action}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
      {rating && (
        <div className="flex text-yellow-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
              ★
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionButton({ 
  href, 
  icon, 
  text 
}: { 
  href: string
  icon: string
  text: string
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors"
    >
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </a>
  )
}