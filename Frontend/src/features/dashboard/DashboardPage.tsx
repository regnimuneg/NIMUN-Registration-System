import { useState, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { api } from '../../lib/api'
import { Users, Calendar, UtensilsCrossed, Gamepad2, BarChart3, Trash2, RefreshCw } from 'lucide-react'

interface Analytics {
  participants: {
    delegates: number
    members: number
    total: number
  }
  attendance: Array<{ session_type: string; count: string }>
  food: Array<{ meal_type: string; count: string }>
  vouchers: {
    byDelegate: Array<{ delegate_id: string; delegate_name: string; usage_count: number }>
    byVendor: Array<{ vendor_name: string | null; usage_count: number }>
  }
}

type ThemeColor = 'blue' | 'green' | 'orange' | 'purple' | 'pink'

const themeColors: Record<ThemeColor, string> = {
  blue: 'var(--jn-blue)',
  green: 'var(--jn-green)',
  orange: 'var(--jn-orange)',
  purple: 'var(--jn-purple)',
  pink: 'var(--jn-pink)'
}

function themedStyle(color: ThemeColor): CSSProperties {
  return { '--card-color': themeColors[color] } as CSSProperties
}

function buttonStyle(color: ThemeColor): CSSProperties {
  return { '--button-color': themeColors[color] } as CSSProperties
}

function StickerCard({
  color,
  children,
  className = ''
}: {
  color: ThemeColor
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`jn-card p-5 sm:p-6 ${className}`} style={themedStyle(color)}>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getAnalytics()
      setAnalytics(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(errorMessage)
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearTracking = async (dataType: string) => {
    if (!confirm(`Are you sure you want to clear all ${dataType} tracking data? This action cannot be undone.`)) {
      return
    }

    try {
      setClearing(dataType)
      await api.clearTrackingData(dataType)
      alert(`${dataType} tracking data cleared successfully`)
      loadAnalytics()
    } catch (err) {
      alert(`Failed to clear ${dataType} tracking data`)
      console.error(err)
    } finally {
      setClearing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="jn-card p-8" style={themedStyle('blue')}>
            <RefreshCw className="w-9 h-9 animate-spin mx-auto mb-4 text-[var(--jn-blue)]" />
            <p className="font-extrabold text-text-secondary">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="jn-card text-center max-w-md p-7" style={themedStyle('pink')}>
          <p className="text-[var(--jn-pink)] mb-2 font-black text-xl">Error Loading Dashboard</p>
          <p className="text-gray-600 mb-4 text-sm">{error || 'Failed to load data'}</p>
          <p className="text-gray-500 mb-4 text-xs">Make sure the backend server is running on {import.meta.env.VITE_API_URL || 'http://localhost:3001'}</p>
          <button
            onClick={loadAnalytics}
            className="jn-sticker-button px-5 py-2"
            style={buttonStyle('blue')}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="jn-page">
      <div className="jn-shell">
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10">
          <div>
            <h1 className="jn-title">Admin Dashboard</h1>
          </div>
          <img src="/element_04_x733_y91_w150_h147.png" alt="" aria-hidden="true" className="hidden md:block jn-sticker right-40 -top-4 rotate-12 opacity-90" />
          <button
            onClick={loadAnalytics}
            className="jn-sticker-button flex items-center gap-2 text-sm sm:text-base px-5 py-3 w-full sm:w-auto"
            style={buttonStyle('blue')}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StickerCard color="blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[var(--jn-blue)] mb-1">Total Participants</p>
                <p className="text-5xl font-black text-[var(--jn-blue)] leading-none">{analytics.participants.total}</p>
              </div>
              <div className="jn-icon-tile">
                <Users className="w-8 h-8" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>Delegates: {analytics.participants.delegates}</p>
              <p>Members: {analytics.participants.members}</p>
            </div>
            <img src="/sticker-dove.png" alt="" aria-hidden="true" className="jn-sticker -right-3 bottom-0 w-16 sm:w-20 rotate-12" />
          </StickerCard>

          <StickerCard color="green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[var(--jn-green)] mb-1">Attendance Records</p>
                <p className="text-5xl font-black text-[var(--jn-green)] leading-none">
                  {analytics.attendance.reduce((sum, a) => sum + parseInt(a.count || '0', 10), 0)}
                </p>
              </div>
              <div className="jn-icon-tile">
                <Calendar className="w-8 h-8" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>{analytics.attendance.length} session types</p>
            </div>
          </StickerCard>

          <StickerCard color="orange">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[var(--jn-orange)] mb-1">Food Claims</p>
                <p className="text-5xl font-black text-[var(--jn-orange)] leading-none">
                  {analytics.food.reduce((sum, f) => sum + parseInt(f.count || '0', 10), 0)}
                </p>
              </div>
              <div className="jn-icon-tile">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>{analytics.food.length} meal types</p>
            </div>
          </StickerCard>

          <StickerCard color="purple">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[var(--jn-purple)] mb-1">Voucher Usage</p>
                <p className="text-5xl font-black text-[var(--jn-purple)] leading-none">
                  {analytics.vouchers.byDelegate.reduce((sum, v) => sum + parseInt(String(v.usage_count) || '0', 10), 0)}
                </p>
              </div>
              <div className="jn-icon-tile">
                <BarChart3 className="w-8 h-8" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>{analytics.vouchers.byDelegate.length} delegates</p>
            </div>
            <img src="/element_05_x1163_y67_w148_h225.png" alt="" aria-hidden="true" className="jn-sticker -right-5 -top-6 w-14 rotate-12 opacity-95" />
          </StickerCard>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="jn-section-title mb-5 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <a
              href="/register"
              className="jn-card p-6 block min-h-44"
              style={themedStyle('blue')}
            >
              <div className="jn-icon-tile mb-4">
                <Users className="w-7 h-7" />
              </div>
              <p className="font-black text-lg mb-1">Register Participant</p>
              <p className="text-sm text-gray-600">Add a new participant</p>
              <img src="/sticker-handshake.png" alt="" aria-hidden="true" className="jn-sticker -right-7 bottom-0 w-24 rotate-12" />
            </a>
            <a
              href="/scan"
              className="jn-card p-6 block min-h-44"
              style={themedStyle('green')}
            >
              <div className="jn-icon-tile mb-4">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <p className="font-black text-lg mb-1">QR Scanner</p>
              <p className="text-sm text-gray-600">Scan participant QR codes</p>
            </a>
            <a
              href="/analytics"
              className="jn-card p-6 block min-h-44"
              style={themedStyle('purple')}
            >
              <div className="jn-icon-tile mb-4">
                <BarChart3 className="w-7 h-7" />
              </div>
              <p className="font-black text-lg mb-1">View Analytics</p>
              <p className="text-sm text-gray-600">Detailed reports and insights</p>
              <img src="/element_08_x545_y129_w159_h247.png" alt="" aria-hidden="true" className="jn-sticker -right-2 bottom-1 w-16 -rotate-12" />
            </a>
            <a
              href="/admin/import"
              className="jn-card p-6 block min-h-44"
              style={themedStyle('orange')}
            >
              <div className="jn-icon-tile mb-4">
                <RefreshCw className="w-7 h-7" />
              </div>
              <p className="font-black text-lg mb-1">Import CSV</p>
              <p className="text-sm text-gray-600">Bulk import participants</p>
              <img src="/element_14_x560_y415_w221_h216.png" alt="" aria-hidden="true" className="jn-sticker -right-4 bottom-0 w-16 rotate-12" />
            </a>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h2 className="jn-section-title mb-3 sm:mb-4">Data Management</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">⚠️ Clear tracking data (use with caution)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={() => handleClearTracking('attendance')}
              disabled={clearing !== null}
              className="jn-sticker-button px-4 py-3"
              style={buttonStyle('pink')}
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'attendance' ? 'Clearing...' : 'Clear Attendance'}
            </button>
            <button
              onClick={() => handleClearTracking('food')}
              disabled={clearing !== null}
              className="jn-sticker-button px-4 py-3"
              style={buttonStyle('orange')}
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'food' ? 'Clearing...' : 'Clear Food'}
            </button>
            <button
              onClick={() => handleClearTracking('games')}
              disabled={clearing !== null}
              className="jn-sticker-button px-4 py-3"
              style={buttonStyle('blue')}
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'games' ? 'Clearing...' : 'Clear Games'}
            </button>
            <button
              onClick={() => handleClearTracking('all')}
              disabled={clearing !== null}
              className="jn-sticker-button px-4 py-3"
              style={buttonStyle('pink')}
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'all' ? 'Clearing...' : 'Clear All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
