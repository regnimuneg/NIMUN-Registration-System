import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../../lib/api'
import { BarChart3, Users, Store, TrendingUp, RefreshCw, Download, Calendar } from 'lucide-react'

interface VoucherAnalytics {
  byDelegate: Array<{
    delegate_id: string
    delegate_name: string
    council: string
    total_claims: string
    redeemed_count: string
    active_count: string
    expired_count: string
    first_claim: string
    last_claim: string
  }>
  byVendor: Array<{
    vendor_name: string
    voucher_name: string
    total_claims: string
    redeemed_count: string
    active_count: string
    expired_count: string
    unique_delegates: string
    first_claim: string
    last_claim: string
  }>
  byVoucherType: Array<{
    voucher_id: string
    voucher_name: string
    vendor_name: string
    total_claims: string
    redeemed_count: string
    active_count: string
    unique_delegates: string
  }>
  recentClaims: Array<{
    id: string
    delegate_name: string
    delegate_id: string
    voucher_name: string
    vendor_name: string
    status: string
    claimed_at: string
    redeemed_at: string | null
  }>
  summary: {
    totalDelegatesWithVouchers: number
    totalVendors: number
    totalVoucherTypes: number
    totalClaims: number
    totalRedeemed: number
  }
}

interface GeneralAnalytics {
  participants: {
    delegates: number
    members: number
    total: number
    claimed: {
      delegates: number
      members: number
      total: number
    }
  }
  games?: {
    totalSessions: number
    uniquePlayers: number
    popular: Array<{ activity: string; count: string }>
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<VoucherAnalytics | null>(null)
  const [generalAnalytics, setGeneralAnalytics] = useState<GeneralAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'delegates' | 'vendors' | 'types' | 'recent' | 'attendance'>('delegates')

  // Attendance export state
  const [attendanceFilters, setAttendanceFilters] = useState<{
    day: string
    council: string
    committee: string
    dayType: string
    participantType: 'delegates' | 'members' | ''
  }>({
    day: '',
    council: '',
    committee: '',
    dayType: '',
    participantType: 'delegates'
  })
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const analytics = await api.getVoucherAnalytics()
      const general = await api.getAnalytics()
      setData(analytics)
      setGeneralAnalytics(general)
      console.log('Analytics data loaded:', general)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load voucher analytics'
      setError(errorMessage)
      console.error('Voucher analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportAttendance = async () => {
    try {
      setLoadingAttendance(true)
      const result = await api.exportAttendance(attendanceFilters)
      setAttendanceData(result.data || [])

      if (result.data && result.data.length > 0) {
        const filename = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`
        exportToCSV(result.data, filename)
      } else {
        alert('No attendance data found with the selected filters.')
      }
    } catch (err: any) {
      alert(`Failed to export attendance: ${err.message}`)
    } finally {
      setLoadingAttendance(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-text-secondary">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-2 font-semibold">Error Loading Analytics</p>
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
    <div className="jn-shell">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold">Voucher Analytics</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={loadAnalytics}
            className="jn-sticker-button flex items-center gap-2 px-4 py-2 text-sm sm:text-base flex-1 sm:flex-none justify-center"
            style={{ '--button-color': 'var(--jn-blue)' } as CSSProperties}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Claims</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{data.summary.totalClaims}</p>
            </div>
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Redeemed</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{data.summary.totalRedeemed}</p>
            </div>
            <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Delegates</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">{data.summary.totalDelegatesWithVouchers}</p>
            </div>
            <Users className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-purple-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Vendors</p>
              <p className="text-3xl font-bold text-orange-600">{data.summary.totalVendors}</p>
            </div>
            <Store className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Voucher Types</p>
              <p className="text-3xl font-bold text-indigo-600">{data.summary.totalVoucherTypes}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Claimed Accounts Card */}
      {/* Claimed Accounts Card */}
      {generalAnalytics?.participants?.claimed && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Account Activation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-green-800 mb-1">Total Claimed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-700">{generalAnalytics.participants.claimed.total || 0}</span>
                <span className="text-sm text-green-600">/ {generalAnalytics.participants.total || 0}</span>
              </div>
              <div className="w-full bg-green-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full"
                  style={{ width: `${((generalAnalytics.participants.claimed.total || 0) / (generalAnalytics.participants.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 mb-1">Delegates Claimed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-700">{generalAnalytics.participants.claimed.delegates || 0}</span>
                <span className="text-sm text-blue-600">/ {generalAnalytics.participants.delegates || 0}</span>
              </div>
              <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${((generalAnalytics.participants.claimed.delegates || 0) / (generalAnalytics.participants.delegates || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-800 mb-1">Members Claimed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-700">{generalAnalytics.participants.claimed.members || 0}</span>
                <span className="text-sm text-purple-600">/ {generalAnalytics.participants.members || 0}</span>
              </div>
              <div className="w-full bg-purple-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${((generalAnalytics.participants.claimed.members || 0) / (generalAnalytics.participants.members || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Games Analytics Card */}
      {generalAnalytics?.games && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Games Analytics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <p className="text-sm text-indigo-800 mb-1">Total Game Sessions</p>
              <p className="text-3xl font-bold text-indigo-700">{generalAnalytics.games.totalSessions || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-800 mb-1">Unique Players</p>
              <p className="text-3xl font-bold text-purple-700">{generalAnalytics.games.uniquePlayers || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Popular Games (Unique Players)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {generalAnalytics.games.popular?.slice(0, 5).map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{game.activity}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                      {game.count} players
                    </span>
                  </div>
                ))}
                {(!generalAnalytics.games.popular || generalAnalytics.games.popular.length === 0) && (
                  <p className="text-sm text-gray-400 italic col-span-2">No games played yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="jn-card mb-6 overflow-hidden" style={{ '--card-color': 'var(--jn-purple)' } as CSSProperties}>
        <div className="border-b border-gray-200 overflow-x-hidden">
          <nav className="flex -mb-px overflow-x-auto overflow-y-hidden scrollbar-hide max-w-full">
            {[
              { id: 'delegates', label: 'By Delegate', count: data.byDelegate.length },
              { id: 'vendors', label: 'By Vendor', count: data.byVendor.length },
              { id: 'types', label: 'By Voucher Type', count: data.byVoucherType.length },
              { id: 'recent', label: 'Recent Claims', count: data.recentClaims.length },
              { id: 'attendance', label: 'Attendance Export', count: 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* By Delegate */}
          {activeTab === 'delegates' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Voucher Usage by Delegate</h2>
                <button
                  onClick={() => exportToCSV(data.byDelegate, 'voucher-usage-by-delegate.csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              {data.byDelegate.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No voucher usage data by delegate found.</p>
                  <p className="text-sm mt-2">Voucher claims will appear here once delegates start using vouchers.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Delegate</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Council</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Redeemed</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Active</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Expired</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">First</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Last</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.byDelegate.map((row) => (
                        <tr key={row.delegate_id} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <div className="font-medium text-xs sm:text-sm">{row.delegate_name}</div>
                            <div className="text-xs text-gray-500">{row.delegate_id}</div>
                          </td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">{row.council}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold">{row.total_claims}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600">{row.redeemed_count}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-blue-600 hidden md:table-cell">{row.active_count}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-red-600 hidden lg:table-cell">{row.expired_count}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">{formatDate(row.first_claim)}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">{formatDate(row.last_claim)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* By Vendor */}
          {activeTab === 'vendors' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Voucher Usage by Vendor</h2>
                <button
                  onClick={() => exportToCSV(data.byVendor, 'voucher-usage-by-vendor.csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  disabled={data.byVendor.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              {data.byVendor.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No voucher usage data by vendor found.</p>
                  <p className="text-sm mt-2">Vendor data will appear here once vouchers are claimed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Voucher</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Redeemed</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Active</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Expired</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Delegates</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">First</th>
                        <th className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Last</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.byVendor.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap font-medium text-xs sm:text-sm">{row.vendor_name}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">{row.voucher_name}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold">{row.total_claims}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600">{row.redeemed_count}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-blue-600 hidden md:table-cell">{row.active_count}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-red-600 hidden lg:table-cell">{row.expired_count}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">{row.unique_delegates}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden xl:table-cell">{formatDate(row.first_claim)}</td>
                          <td className="px-2 sm:px-3 md:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden xl:table-cell">{formatDate(row.last_claim)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* By Voucher Type */}
          {activeTab === 'types' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Voucher Usage by Type</h2>
                <button
                  onClick={() => exportToCSV(data.byVoucherType, 'voucher-usage-by-type.csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  disabled={data.byVoucherType.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              {data.byVoucherType.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No voucher type data found.</p>
                  <p className="text-sm mt-2">Voucher types will appear here once vouchers are created and used.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher Name</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Claims</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Redeemed</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Delegates</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.byVoucherType.map((row) => (
                        <tr key={row.voucher_id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap font-medium">{row.voucher_name}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">{row.vendor_name}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm font-semibold">{row.total_claims}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-green-600">{row.redeemed_count}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-blue-600">{row.active_count}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm">{row.unique_delegates}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recent Claims */}
          {activeTab === 'recent' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Voucher Claims</h2>
                <button
                  onClick={() => exportToCSV(data.recentClaims, 'recent-voucher-claims.csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  disabled={data.recentClaims.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
              {data.recentClaims.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No recent voucher claims found.</p>
                  <p className="text-sm mt-2">Recent claims will appear here once delegates start claiming vouchers.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Delegate</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Claimed At</th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Redeemed At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.recentClaims.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <div className="font-medium">{row.delegate_name}</div>
                            <div className="text-sm text-gray-500">{row.delegate_id}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap font-medium">{row.voucher_name}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">{row.vendor_name}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${row.status === 'redeemed' ? 'bg-green-100 text-green-800' :
                              row.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                row.status === 'expired' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(row.claimed_at)}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(row.redeemed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Attendance Export */}
          {activeTab === 'attendance' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Export Attendance Data
                </h2>

                {/* Participant Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Export For</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAttendanceFilters({ ...attendanceFilters, council: '', committee: '', participantType: 'delegates' })}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${attendanceFilters.participantType === 'delegates' || (!attendanceFilters.participantType && !attendanceFilters.committee)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                    >
                      👥 Delegates (Councils)
                    </button>
                    <button
                      onClick={() => setAttendanceFilters({ ...attendanceFilters, council: '', committee: '', participantType: 'members' })}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${attendanceFilters.participantType === 'members'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                    >
                      🎯 Members (Committees)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day Type</label>
                    <select
                      value={attendanceFilters.dayType}
                      onChange={(e) => setAttendanceFilters({ ...attendanceFilters, dayType: e.target.value, day: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="sessions">Sessions</option>
                      <option value="opening">Opening Ceremony</option>
                      <option value="conf">Conference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specific Day</label>
                    <select
                      value={attendanceFilters.day}
                      onChange={(e) => setAttendanceFilters({ ...attendanceFilters, day: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Days</option>
                      {/* Show options based on Day Type */}
                      {(!attendanceFilters.dayType || attendanceFilters.dayType === 'sessions') && (
                        <>
                          <option value="day1">Day 1</option>
                          <option value="day2">Day 2</option>
                          <option value="day3">Day 3</option>
                          <option value="day4">Day 4</option>
                        </>
                      )}
                      {(!attendanceFilters.dayType || attendanceFilters.dayType === 'opening') && (
                        <option value="opening_ceremony">Opening Ceremony</option>
                      )}
                      {(!attendanceFilters.dayType || attendanceFilters.dayType === 'conf') && (
                        <>
                          <option value="conf_day1">Conference Day 1</option>
                          <option value="conf_day2">Conference Day 2</option>
                          <option value="conf_day3">Conference Day 3</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Show Council dropdown ONLY for Delegates */}
                  {(attendanceFilters.participantType === 'delegates' || !attendanceFilters.participantType) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Council</label>
                      <select
                        value={attendanceFilters.council}
                        onChange={(e) => setAttendanceFilters({ ...attendanceFilters, council: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Councils</option>
                        <option value="UNHRC">UNHRC</option>
                        <option value="ICJ">ICJ</option>
                        <option value="DISEC">DISEC</option>
                        <option value="PRESS">PRESS</option>
                      </select>
                    </div>
                  )}

                  {/* Show Committee dropdown ONLY for Members */}
                  {attendanceFilters.participantType === 'members' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
                      <select
                        value={attendanceFilters.committee}
                        onChange={(e) => setAttendanceFilters({ ...attendanceFilters, committee: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Committees</option>
                        <option value="Executive">Executive</option>
                        <option value="Registration Affairs">Registration Affairs</option>
                        <option value="Socials & Events">Socials & Events</option>
                        <option value="Public Relations">Public Relations</option>
                        <option value="Media & Design">Media & Design</option>
                        <option value="Operations & Logistics">Operations & Logistics</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Info text */}
                <p className="text-sm text-gray-500 mb-4">
                  {attendanceFilters.participantType === 'members'
                    ? attendanceFilters.committee === 'Executive'
                      ? '📋 Exporting Executive and High Board attendance'
                      : '📋 Exporting member/staff attendance from selected committee(s)'
                    : '📋 Exporting delegate attendance from selected council(s)'}
                </p>

                <button
                  onClick={handleExportAttendance}
                  disabled={loadingAttendance}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingAttendance ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Attendance CSV
                    </>
                  )}
                </button>
              </div>
              {attendanceData.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-2">
                    Found {attendanceData.length} attendance records. CSV file has been downloaded.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  )
}
