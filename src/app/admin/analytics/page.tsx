'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Users, CheckCircle, Utensils, Gamepad2, Bus, Activity, RefreshCw } from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalParticipants: number
    maleCount: number
    femaleCount: number
    withBusRoute: number
    withoutBusRoute: number
  }
  attendance: {
    sessions: { [key: string]: { attended: number; total: number } }
    performanceDay: { attended: number; total: number }
    openingCeremony: { attended: number; total: number }
    conference: { [key: string]: { attended: number; total: number } }
  }
  food: {
    sessions: { [key: string]: { lunch: number } }
    performanceDay: { breakfast: number; lunch: number }
    openingCeremony: { catering: number }
    conference: { [key: string]: { breakfast: number; lunch: number } }
    totalMeals: number
  }
  games: {
    totalActivities: number
    uniqueParticipants: number
    popularGames: Array<{ name: string; participants: number }>
  }
  bus: {
    totalTrips: number
    participants: number
  }
  positions: Record<string, number>
  busRouteInfo: Array<{
    id: string
    name: string
    participantCount: number
    stops: number
  }>
  sampleSize: number
  generatedAt: string
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/analytics')
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      const analyticsData = await response.json()
      setData(analyticsData)
      setError('')
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-700">Loading Analytics...</h2>
          <p className="text-gray-500">Analyzing participant data</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const genderData = [
    { name: 'Male', value: data.overview.maleCount, color: '#0088FE' },
    { name: 'Female', value: data.overview.femaleCount, color: '#00C49F' }
  ]

  const attendanceData = [
    { name: 'Session Day 1', attended: data.attendance.sessions.day1?.attended || 0, total: data.attendance.sessions.day1?.total || 0 },
    { name: 'Session Day 2', attended: data.attendance.sessions.day2?.attended || 0, total: data.attendance.sessions.day2?.total || 0 },
    { name: 'Session Day 3', attended: data.attendance.sessions.day3?.attended || 0, total: data.attendance.sessions.day3?.total || 0 },
    { name: 'Session Day 4', attended: data.attendance.sessions.day4?.attended || 0, total: data.attendance.sessions.day4?.total || 0 },
    { name: 'Performance Day', attended: data.attendance.performanceDay?.attended || 0, total: data.attendance.performanceDay?.total || 0 },
    { name: 'Opening Ceremony', attended: data.attendance.openingCeremony?.attended || 0, total: data.attendance.openingCeremony?.total || 0 },
    { name: 'Conference Day 1', attended: data.attendance.conference.day1?.attended || 0, total: data.attendance.conference.day1?.total || 0 },
    { name: 'Conference Day 2', attended: data.attendance.conference.day2?.attended || 0, total: data.attendance.conference.day2?.total || 0 },
    { name: 'Conference Day 3', attended: data.attendance.conference.day3?.attended || 0, total: data.attendance.conference.day3?.total || 0 }
  ]

  const positionsData = Object.entries(data.positions).map(([position, count]) => ({
    name: position,
    value: count
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive data analysis for JNIMUN'25 participants
            </p>
            {data.sampleSize < data.overview.totalParticipants && (
              <p className="text-orange-600 text-sm mt-1">
                📊 Showing sample data ({data.sampleSize} of {data.overview.totalParticipants} participants)
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Last updated: {new Date(data.generatedAt).toLocaleString()}
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.totalParticipants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Bus Route</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.withBusRoute}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Utensils className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Meals</p>
                <p className="text-2xl font-bold text-gray-900">{data.food.totalMeals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Gamepad2 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Game Participants</p>
                <p className="text-2xl font-bold text-gray-900">{data.games.uniqueParticipants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Bus className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bus Participants</p>
                <p className="text-2xl font-bold text-gray-900">{data.bus.participants}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gender Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Position Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Position Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={positionsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance by Event</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attended" fill="#0088FE" name="Attended" />
              <Bar dataKey="total" fill="#e0e0e0" name="Total Participants" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Popular Games */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Games</h3>
          {data.games.popularGames.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.games.popularGames}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="participants" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Gamepad2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No game activity data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Bus Routes Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bus Routes Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stops</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.busRouteInfo.map((route) => (
                  <tr key={route.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {route.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {route.participantCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {route.stops}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, (route.participantCount / 50) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {((route.participantCount / 50) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 