import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../../lib/api'
import { User, Calendar, UtensilsCrossed, QrCode, BarChart3, Search } from 'lucide-react'

export default function MemberDashboardPage() {
  const [searchId, setSearchId] = useState('')
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchId.trim()) return

    setLoading(true)
    setError(null)
    setParticipant(null)

    try {
      const data = await api.getParticipant(searchId, true)
      if (data.participant) {
        setParticipant(data.participant)
      } else {
        setError('Participant not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch participant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="jn-shell">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 inline-block">Member Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Search and view participant information</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Participant by ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter participant ID (e.g., IC-01, EX-05)"
                  className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchId.trim() || loading}
              className="jn-sticker-button px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base w-full sm:w-auto"
              style={{ '--button-color': 'var(--jn-blue)' } as CSSProperties}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Participant Details */}
        {participant && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{participant.name}</h2>
                  <p className="text-gray-600 text-sm sm:text-base truncate">{participant.position}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">ID: {participant.id}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Attendance</h3>
                </div>
                <p className="text-sm text-gray-600">View attendance records</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold">Food Tracking</h3>
                </div>
                <p className="text-sm text-gray-600">Meal distribution status</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <QrCode className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">QR Code</h3>
                </div>
                {participant.qrUrl && (
                  <img src={participant.qrUrl} alt="QR Code" className="w-24 h-24 mt-2 border border-gray-300 rounded" />
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{participant.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium">{participant.gender || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
          <a
            href="/member/scanner"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <QrCode className="w-10 h-10 text-green-500" />
              <div>
                <h3 className="font-semibold mb-1">QR Scanner</h3>
                <p className="text-sm text-gray-600">Scan QR codes for quick access</p>
              </div>
            </div>
          </a>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <BarChart3 className="w-10 h-10 text-blue-500" />
              <div>
                <h3 className="font-semibold mb-1">View Analytics</h3>
                <p className="text-sm text-gray-600">Check system statistics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
