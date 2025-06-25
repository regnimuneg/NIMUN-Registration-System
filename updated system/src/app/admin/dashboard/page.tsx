'use client'

import { useState, useEffect } from 'react'
import { Smartphone, CheckCircle, Utensils, Gamepad2, Bus, Check, X, AlertCircle, Loader } from 'lucide-react'
import QRScanner from '@/components/QRScanner'
import ParticipantHistory from '@/components/ParticipantHistory'
import DaySelector, { EventDay, eventDays } from '@/components/DaySelector'
import ClearTrackingData from '@/components/ClearTrackingData'
import { Participant, TrackingData, DayTrackingData } from '@/types/participant'
import { getAllBusRoutes } from '@/lib/busRoutes'

export default function DashboardPage() {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(eventDays[0].id)
  const [activeTab, setActiveTab] = useState<'scan' | 'attendance' | 'food' | 'games' | 'bus'>('scan')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)
  const [adminRole, setAdminRole] = useState<'super-admin' | 'admin'>('admin')

  // Get admin role from session storage
  useEffect(() => {
    const adminData = sessionStorage.getItem('adminSession')
    if (adminData) {
      try {
        const session = JSON.parse(adminData)
        setAdminRole(session.role || 'admin')
      } catch {
        setAdminRole('admin')
      }
    }
  }, [])

  // Bus routes configuration
  const busRoutes = getAllBusRoutes()

  // Games configuration
  const availableGames = [
    'Football',
    'Basketball',
    'Table Tennis',
    'Chess',
    'Quiz Competition',
    'Art Workshop',
    'Debate Session',
    'Cultural Performance'
  ]

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const currentDay = eventDays.find(day => day.id === selectedDay) || eventDays[0]

  const handleQRScan = async (participantId: string) => {
    try {
      setError('')
      setSuccess('Loading participant data...')

      // Fetch participant data and tracking data in a single optimized call
      const response = await fetch(`/api/participants/${participantId}?include=tracking`)
      if (!response.ok) {
        throw new Error('Participant not found')
      }
      
      const data = await response.json()
      
      setCurrentParticipant(data.participant)
      setTrackingData(data.tracking)
      setSuccess(`Loaded: ${data.participant.name} (${participantId})`)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setCurrentParticipant(null)
      setTrackingData(null)
    }
  }

  const handleDayChange = (day: EventDay) => {
    setSelectedDay(day.id)
    if (day.type !== 'off') {
      setActiveTab(day.hasFood ? 'food' : 'attendance')
    }
  }

  const handleAttendanceUpdate = async (dayKey: string, field: string) => {
    if (!currentParticipant || !trackingData) return
    
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          dayKey,
          field,
          value: true // Mark as attended
        })
      })

      if (!response.ok) throw new Error('Failed to update attendance')

      // Update local state
      setTrackingData(prev => {
        if (!prev) return null
        const newTracking = { ...prev }
        
        // Navigate to the correct day and field
        const dayPath = dayKey.split('.')
        let current: any = newTracking.dayTracking
        
        for (let i = 0; i < dayPath.length - 1; i++) {
          current = current[dayPath[i]]
        }
        
        current[dayPath[dayPath.length - 1]][field] = !current[dayPath[dayPath.length - 1]][field]
        
        return newTracking
      })

      setSuccess(`Attendance updated`)
    } catch (err) {
      setError(`Error updating attendance: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleFoodUpdate = async (dayKey: string, mealType: string) => {
    if (!currentParticipant || !trackingData) return
    
    try {
      const response = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          dayKey,
          meal: mealType,
          value: true
        })
      })

      if (!response.ok) throw new Error('Failed to update food tracking')

      // Update local state
      setTrackingData(prev => {
        if (!prev) return null
        const newTracking = { ...prev }
        
        // Navigate to the correct day and meal
        const dayPath = dayKey.split('.')
        let current: any = newTracking.dayTracking
        
        for (let i = 0; i < dayPath.length - 1; i++) {
          current = current[dayPath[i]]
        }
        
        current[dayPath[dayPath.length - 1]][mealType] = !current[dayPath[dayPath.length - 1]][mealType]
        
        return newTracking
      })

      setSuccess(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} updated`)
    } catch (err) {
      setError(`Error updating food: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleGameActivity = async (activity: string, action: 'join' | 'leave') => {
    if (!currentParticipant || !trackingData) return
    
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          activity,
          action,
          day: selectedDay
        })
      })

      if (!response.ok) throw new Error('Failed to update game activity')

      // Refresh tracking data with optimized call
      const trackingResponse = await fetch(`/api/participants/${currentParticipant.id}?include=tracking`)
      const updatedData = await trackingResponse.json()
      setTrackingData(updatedData.tracking)

      setSuccess(`${action === 'join' ? 'Joined' : 'Left'} ${activity}`)
    } catch (err) {
      setError(`Error updating game activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleBusTracking = async (type: 'arriving' | 'departing', route: string, stop: string) => {
    if (!currentParticipant || !trackingData) return
    
    try {
      const response = await fetch('/api/bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          type,
          route,
          stop,
          day: selectedDay
        })
      })

      if (!response.ok) throw new Error('Failed to update bus tracking')

      // Refresh tracking data with optimized call
      const trackingResponse = await fetch(`/api/participants/${currentParticipant.id}?include=tracking`)
      const updatedData = await trackingResponse.json()
      setTrackingData(updatedData.tracking)

      setSuccess(`✅ ${type === 'arriving' ? 'Arrival' : 'Departure'} recorded on ${route} at ${stop}`)
    } catch (err) {
      setError(`❌ Error updating bus tracking: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Helper function to get current day's tracking data
  const getCurrentDayData = () => {
    if (!trackingData || !trackingData.dayTracking) return null
    
    switch (selectedDay) {
      case 'sessions-day1': return trackingData.dayTracking.sessions?.day1 || null
      case 'sessions-day2': return trackingData.dayTracking.sessions?.day2 || null
      case 'sessions-day3': return trackingData.dayTracking.sessions?.day3 || null
      case 'sessions-day4': return trackingData.dayTracking.sessions?.day4 || null
      case 'performance-day': return trackingData.dayTracking.performanceDay || null
      case 'opening-ceremony': return trackingData.dayTracking.openingCeremony || null
      case 'conference-day1': return trackingData.dayTracking.conference?.day1 || null
      case 'conference-day2': return trackingData.dayTracking.conference?.day2 || null
      case 'conference-day3': return trackingData.dayTracking.conference?.day3 || null
      default: return null
    }
  }

  const getCurrentDayKey = () => {
    switch (selectedDay) {
      case 'sessions-day1': return 'sessions.day1'
      case 'sessions-day2': return 'sessions.day2'
      case 'sessions-day3': return 'sessions.day3'
      case 'sessions-day4': return 'sessions.day4'
      case 'performance-day': return 'performanceDay'
      case 'opening-ceremony': return 'openingCeremony'
      case 'conference-day1': return 'conference.day1'
      case 'conference-day2': return 'conference.day2'
      case 'conference-day3': return 'conference.day3'
      default: return ''
    }
  }

  const currentDayData = getCurrentDayData()
  const currentDayKey = getCurrentDayKey()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            JNIMUN'25 Tracking Dashboard
          </h1>
          <p className="text-gray-600">
            Scan participant QR codes to track attendance, food, games, and transportation
          </p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/admin/participants"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
              >
                <span>📦</span>
                <span>Download All QR Codes</span>
              </a>
              <ClearTrackingData 
                adminRole={adminRole}
                onClearComplete={(dataType) => {
                  setSuccess(`✅ Cleared ${dataType} data successfully`)
                  // Reset current participant if data was cleared
                  if (dataType === 'all' || dataType === 'activity-tracking') {
                    setCurrentParticipant(null)
                    setTrackingData(null)
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Day Selector */}
        <div className="mb-6">
          <DaySelector selectedDay={selectedDay} onDayChange={handleDayChange} />
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Current Participant Info */}
        {currentParticipant && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-blue-900">Current Participant</h2>
              <button
                onClick={() => setShowHistory(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                📋 View History
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">ID:</span> {currentParticipant.id}
              </div>
              <div>
                <span className="font-medium">Name:</span> {currentParticipant.name}
              </div>
              <div>
                <span className="font-medium">Position:</span> {currentParticipant.position}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {currentParticipant.phoneNumber}
              </div>
            </div>
          </div>
        )}

        {/* Off Day Message */}
        {currentDay.type === 'off' && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">😴</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Off Day</h2>
            <p className="text-gray-600">No activities scheduled for this day. Participants can rest and prepare for the upcoming events.</p>
          </div>
        )}

        {/* Tab Navigation - Only show if not off day */}
        {currentDay.type !== 'off' && (
          <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
                      { id: 'scan', label: 'QR Scanner', icon: <Smartphone className="w-4 h-4" /> },
        { id: 'attendance', label: 'Attendance', icon: <CheckCircle className="w-4 h-4" /> },
        ...(currentDay.hasFood ? [{ id: 'food', label: 'Food Tracking', icon: <Utensils className="w-4 h-4" /> }] : []),
        { id: 'games', label: 'Games & Activities', icon: <Gamepad2 className="w-4 h-4" /> },
        ...((currentDay.hasBus === true || currentDay.hasBus === 'to-only') ? [{ id: 'bus', label: 'Bus Tracking', icon: <Bus className="w-4 h-4" /> }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
        )}

        {/* Tab Content */}
        {currentDay.type !== 'off' && (
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'scan' && (
            <div>
                <h2 className="text-xl font-semibold mb-4">QR Code Scanner</h2>
                <QRScanner onScan={handleQRScan} isActive={activeTab === 'scan'} />
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
                <h2 className="text-xl font-semibold mb-4">Attendance Tracking - {currentDay.name}</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
                ) : currentDayData ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleAttendanceUpdate(currentDayKey, 'attended')}
                      className={`w-full p-6 rounded-lg border-2 transition-colors ${
                        currentDayData.attended
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="mb-2">
                          {currentDayData.attended ? 
                            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" /> : 
                            <div className="w-10 h-10 bg-gray-300 rounded-full mx-auto"></div>
                          }
                        </div>
                        <div className="text-xl font-medium">Mark Attendance</div>
                        <div className="text-sm opacity-75">{currentDay.name}</div>
                      </div>
                    </button>
                </div>
              ) : null}
            </div>
          )}

            {activeTab === 'food' && currentDay.hasFood && (
            <div>
                <h2 className="text-xl font-semibold mb-4">Food Tracking - {currentDay.name}</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
                ) : currentDayData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentDay.foodTypes.map(foodType => (
                    <button
                        key={foodType}
                        onClick={() => handleFoodUpdate(currentDayKey, foodType)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                          (currentDayData as any)[foodType]
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                          <div className="mb-2">
                            {(currentDayData as any)[foodType] ? 
                              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" /> : 
                              <Utensils className="w-8 h-8 text-gray-500 mx-auto" />
                            }
                          </div>
                          <div className="font-medium capitalize">{foodType}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'games' && (
            <div>
                <h2 className="text-xl font-semibold mb-4">Games & Activities - {currentDay.name}</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
              ) : trackingData ? (
                <div>
                    {/* Current Activities for this day */}
                    {trackingData.games.filter(game => game.day === selectedDay).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3">Current Activities</h3>
                      <div className="space-y-2">
                          {trackingData.games
                            .filter(game => game.day === selectedDay)
                            .map((game, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-medium">{game.activity}</span>
                              <span className="ml-2 text-sm text-gray-600">
                                  Joined: {new Date(game.joinTime).toLocaleTimeString()}
                                {game.leaveTime && ` • Left: ${new Date(game.leaveTime).toLocaleTimeString()}`}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {!game.leaveTime && (
                                <button
                                  onClick={() => handleGameActivity(game.activity, 'leave')}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Leave
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Available Games */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Available Activities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableGames.map(game => {
                          const currentGame = trackingData.games.find(g => 
                            g.activity === game && 
                            g.day === selectedDay && 
                            !g.leaveTime
                          )
                        return (
                          <button
                            key={game}
                            onClick={() => handleGameActivity(game, currentGame ? 'leave' : 'join')}
                            className={`p-4 rounded-lg border-2 transition-colors ${
                              currentGame
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400'
                            }`}
                          >
                            <div className="text-center">
                              <div className="mb-2">
                                {currentGame ? 
                                  <div className="w-8 h-8 bg-red-500 rounded-full mx-auto"></div> : 
                                  <Gamepad2 className="w-8 h-8 text-blue-500 mx-auto" />
                                }
                              </div>
                              <div className="font-medium">{game}</div>
                              <div className="text-xs mt-1">
                                {currentGame ? 'Click to Leave' : 'Click to Join'}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

            {activeTab === 'bus' && (currentDay.hasBus === true || currentDay.hasBus === 'to-only') && (
            <div>
                <h2 className="text-xl font-semibold mb-4">
                  Bus Tracking - {currentDay.name}
                  {currentDay.hasBus === 'to-only' && (
                    <span className="ml-2 text-sm text-orange-600 font-normal">
                      (To University Only - No Return Buses)
                    </span>
                  )}
                </h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
              ) : trackingData ? (
                <div>
                    {/* Bus History for this day */}
                    {trackingData.bus.filter(entry => entry.day === selectedDay).length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-3">Today's Bus History</h3>
                      <div className="space-y-2">
                          {trackingData.bus
                            .filter(entry => entry.day === selectedDay)
                            .slice().reverse().map((entry, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <div>
                              <span className={`font-medium ${entry.type === 'arriving' ? 'text-green-600' : 'text-blue-600'} flex items-center`}>
                                <Bus className="w-4 h-4 mr-2" />
                                {entry.type === 'arriving' ? 'Arrived' : 'Departed'}
                              </span>
                                <span className="ml-2">on {entry.route} at {entry.stop}</span>
                            </div>
                            <span className="text-sm text-gray-600">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Bus Tracking Controls */}
                    <div className="space-y-6">
                      {!currentParticipant.busRoute ? (
                        // Show message for participants without bus assignments
                        <div className="border border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                          <div className="text-4xl mb-3">🚌</div>
                          <h3 className="text-lg font-medium text-gray-700 mb-2">No Bus Transportation</h3>
                          <p className="text-gray-600">
                            This participant is not assigned to any bus route and will need to arrange their own transportation.
                          </p>
                        </div>
                      ) : (
                        // Show only the assigned route for participants with bus assignments
                        (() => {
                          const assignedRoute = busRoutes.find(route => route.id === currentParticipant.busRoute)
                          if (!assignedRoute) {
                            return (
                              <div className="border border-red-300 rounded-lg p-6 text-center bg-red-50">
                                <div className="text-4xl mb-3">⚠️</div>
                                <h3 className="text-lg font-medium text-red-700 mb-2">Invalid Bus Route</h3>
                                <p className="text-red-600">
                                  Assigned route "{currentParticipant.busRoute}" not found. Please contact admin.
                                </p>
                              </div>
                            )
                          }
                          
                          return (
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-medium text-blue-900">🚌 {assignedRoute.name}</h3>
                                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  Assigned Route
                                </span>
                              </div>
                              {currentParticipant.busStop && (
                                <div className="mb-3 text-sm text-blue-800">
                                  📍 <strong>Assigned Stop:</strong> {currentParticipant.busStop}
                                </div>
                              )}
                          <div className={`grid gap-4 ${currentDay.hasBus === 'to-only' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div>
                              <h4 className="font-medium text-green-700 mb-2">Arriving</h4>
                      <div className="space-y-2">
                                    {assignedRoute.stops.map(stop => (
                          <button
                            key={`arriving-${stop}`}
                                        onClick={() => handleBusTracking('arriving', assignedRoute.name, stop)}
                                        className={`w-full p-2 text-left border rounded hover:bg-green-100 transition-colors text-sm ${
                                          currentParticipant.busStop === stop
                                            ? 'border-green-500 bg-green-100 text-green-800 font-medium'
                                            : 'border-green-300 bg-green-50 text-green-700'
                                        }`}
                          >
                            🚌 Arriving at {stop}
                                        {currentParticipant.busStop === stop && (
                                          <span className="ml-2 text-xs">(Assigned Stop)</span>
                                        )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                            {currentDay.hasBus === true && (
                    <div>
                                <h4 className="font-medium text-blue-700 mb-2">Departing</h4>
                      <div className="space-y-2">
                                      {assignedRoute.stops.map(stop => (
                          <button
                            key={`departing-${stop}`}
                                          onClick={() => handleBusTracking('departing', assignedRoute.name, stop)}
                                          className={`w-full p-2 text-left border rounded hover:bg-blue-100 transition-colors text-sm ${
                                            currentParticipant.busStop === stop
                                              ? 'border-blue-500 bg-blue-100 text-blue-800 font-medium'
                                              : 'border-blue-300 bg-blue-50 text-blue-700'
                                          }`}
                          >
                            🚌 Departing from {stop}
                                          {currentParticipant.busStop === stop && (
                                            <span className="ml-2 text-xs">(Assigned Stop)</span>
                                          )}
                          </button>
                        ))}
                      </div>
                    </div>
                            )}
                  </div>
                  
                          {currentDay.hasBus === 'to-only' && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="text-sm text-orange-800">
                                <strong>Note:</strong> No return buses available on closing day. Participants must arrange their own transportation back.
                              </div>
                            </div>
                          )}
                    </div>
                          )
                        })()
                      )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
        )}

        {/* History Modal */}
        {showHistory && currentParticipant && (
          <ParticipantHistory
            participantId={currentParticipant.id}
            participantName={currentParticipant.name}
            isModal={true}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    </div>
  )
} 