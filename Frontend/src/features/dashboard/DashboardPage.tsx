import { useState, useEffect } from 'react'
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-2 font-semibold">Error Loading Dashboard</p>
          <p className="text-gray-600 mb-4 text-sm">{error || 'Failed to load data'}</p>
          <p className="text-gray-500 mb-4 text-xs">Make sure the backend server is running on {import.meta.env.VITE_API_URL || 'http://localhost:3001'}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg">Overview of system statistics and quick actions</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="btn-primary flex items-center gap-2 text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3 w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Participants</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.participants.total}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>Delegates: {analytics.participants.delegates}</p>
              <p>Members: {analytics.participants.members}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Attendance Records</p>
                <p className="text-3xl font-bold text-green-600">
                  {analytics.attendance.reduce((sum, a) => sum + parseInt(a.count || '0', 10), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>{analytics.attendance.length} session types</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Food Claims</p>
                <p className="text-3xl font-bold text-orange-600">
                  {analytics.food.reduce((sum, f) => sum + parseInt(f.count || '0', 10), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>{analytics.food.length} meal types</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Voucher Usage</p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.vouchers.byDelegate.reduce((sum, v) => sum + parseInt(String(v.usage_count) || '0', 10), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>{analytics.vouchers.byDelegate.length} delegates</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <a
              href="/register"
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#0037c0] hover:bg-[#f0f4ff] transition-all"
            >
              <div className="w-12 h-12 bg-[#0037c0] bg-opacity-10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#0037c0]" />
              </div>
              <p className="font-semibold text-lg mb-1">Register Participant</p>
              <p className="text-sm text-gray-600">Add a new participant</p>
            </a>
            <a
              href="/scan"
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#0037c0] hover:bg-[#f0f4ff] transition-all"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Gamepad2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-semibold text-lg mb-1">QR Scanner</p>
              <p className="text-sm text-gray-600">Scan participant QR codes</p>
            </a>
            <a
              href="/analytics"
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#0037c0] hover:bg-[#f0f4ff] transition-all"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-semibold text-lg mb-1">View Analytics</p>
              <p className="text-sm text-gray-600">Detailed reports and insights</p>
            </a>
            <a
              href="/admin/import"
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#0037c0] hover:bg-[#f0f4ff] transition-all"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <p className="font-semibold text-lg mb-1">Import CSV</p>
              <p className="text-sm text-gray-600">Bulk import participants</p>
            </a>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Data Management</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Clear tracking data (use with caution)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={() => handleClearTracking('attendance')}
              disabled={clearing !== null}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'attendance' ? 'Clearing...' : 'Clear Attendance'}
            </button>
            <button
              onClick={() => handleClearTracking('food')}
              disabled={clearing !== null}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'food' ? 'Clearing...' : 'Clear Food'}
            </button>
            <button
              onClick={() => handleClearTracking('games')}
              disabled={clearing !== null}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {clearing === 'games' ? 'Clearing...' : 'Clear Games'}
            </button>
            <button
              onClick={() => handleClearTracking('all')}
              disabled={clearing !== null}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
