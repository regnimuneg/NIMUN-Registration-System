'use client'

import { useState, useEffect } from 'react'
import QRScanner from '@/components/QRScanner'
import ParticipantHistory from '@/components/ParticipantHistory'
import DaySelector, { EventDay, eventDays } from '@/components/DaySelector'
import { Participant, TrackingData } from '@/types/participant'
import { getAllBusRoutes } from '@/lib/busRoutes'

export default function MemberScannerPage() {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(eventDays[0].id)
  const [activeTab, setActiveTab] = useState<'scan' | 'attendance' | 'food' | 'games' | 'bus'>('scan')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)

  // Bus routes configuration (read-only for members)
  const busRoutes = getAllBusRoutes()

  // Games configuration (read-only for members)
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
      setSuccess('')

      // Fetch participant data
      const participantResponse = await fetch(`/api/participants/${participantId}`)
      if (!participantResponse.ok) {
        throw new Error('Participant not found')
      }
      const participant = await participantResponse.json()

      // Fetch tracking data
      const trackingResponse = await fetch(`/api/participants/${participantId}/tracking`)
      let tracking: TrackingData
      
      if (trackingResponse.ok) {
        tracking = await trackingResponse.json()
      } else {
        // Initialize empty tracking data
        tracking = {
          dayTracking: {
            sessions: {
              day1: { attended: false, lunch: false },
              day2: { attended: false, lunch: false },
              day3: { attended: false, lunch: false },
              day4: { attended: false, lunch: false }
            },
            performanceDay: { attended: false, breakfast: false, lunch: false },
            openingCeremony: { attended: false, catering: false },
            conference: {
              day1: { attended: false, breakfast: false, lunch: false },
              day2: { attended: false, breakfast: false, lunch: false },
              day3: { attended: false, breakfast: false, lunch: false }
            }
          },
          games: [],
          bus: []
        }
      }

      setCurrentParticipant(participant)
      setTrackingData(tracking)
      setSuccess(`✅ Loaded: ${participant.name} (${participantId})`)
    } catch (err) {
      setError(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
          value: true
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

      setSuccess(`✅ Attendance updated`)
    } catch (err) {
      setError(`❌ Error updating attendance: ${err instanceof Error ? err.message : 'Unknown error'}`)
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

      setSuccess(`✅ ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} updated`)
    } catch (err) {
      setError(`❌ Error updating food: ${err instanceof Error ? err.message : 'Unknown error'}`)
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

      // Refresh tracking data
      const trackingResponse = await fetch(`/api/participants/${currentParticipant.id}/tracking`)
      const updatedTracking = await trackingResponse.json()
      setTrackingData(updatedTracking)

      setSuccess(`✅ ${action === 'join' ? 'Joined' : 'Left'} ${activity}`)
    } catch (err) {
      setError(`❌ Error updating game activity: ${err instanceof Error ? err.message : 'Unknown error'}`)
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

      // Refresh tracking data
      const trackingResponse = await fetch(`/api/participants/${currentParticipant.id}/tracking`)
      const updatedTracking = await trackingResponse.json()
      setTrackingData(updatedTracking)

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

  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Client-side mobile detection to avoid SSR mismatch
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
      setIsMobileDevice(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))
    }
    checkMobile()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hide scrollbar on mobile */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <div className={`w-full ${isMobileDevice ? 'px-3 py-2' : 'max-w-6xl mx-auto p-4'}`}>
        {/* Header */}
        <div className={`${isMobileDevice ? 'mb-4 text-center' : 'mb-8'}`}>
          <h1 className={`font-bold text-gray-900 ${isMobileDevice ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>
            📱 JNIMUN'25 Scanner
          </h1>
          <p className={`text-gray-600 ${isMobileDevice ? 'text-xs' : ''}`}>
            {isMobileDevice 
              ? 'Tap to scan QR codes and track participants' 
              : 'Scan participant QR codes to track attendance, food, games, and transportation'
            }
          </p>
        </div>

        {/* Day Selector */}
        <div className={`${isMobileDevice ? 'mb-4' : 'mb-6'}`}>
          <DaySelector selectedDay={selectedDay} onDayChange={handleDayChange} />
        </div>

        {/* Status Messages */}
        {error && (
          <div className={`${isMobileDevice ? 'mb-3 p-3 text-sm' : 'mb-4 p-4'} bg-red-100 border border-red-400 text-red-700 rounded-lg`}>
            {error}
          </div>
        )}
        {success && (
          <div className={`${isMobileDevice ? 'mb-3 p-3 text-sm' : 'mb-4 p-4'} bg-green-100 border border-green-400 text-green-700 rounded-lg`}>
            {success}
          </div>
        )}

        {/* Current Participant Info */}
        {currentParticipant && (
          <div className={`${isMobileDevice ? 'mb-4 p-3' : 'mb-6 p-4'} bg-blue-50 border border-blue-200 rounded-lg`}>
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
          <div className={`border-b border-gray-200 mb-6 ${isMobileDevice ? 'overflow-x-auto scrollbar-hide -mx-3' : ''}`}>
            <nav className={`-mb-px flex ${isMobileDevice ? 'space-x-1 min-w-max px-3' : 'space-x-8'}`}>
              {[
                { id: 'scan', label: isMobileDevice ? 'Scan' : 'QR Scanner', icon: '📱' },
                { id: 'attendance', label: isMobileDevice ? 'Attend' : 'Attendance', icon: '✅' },
                ...(currentDay.hasFood ? [{ id: 'food', label: 'Food', icon: '🍽️' }] : []),
                { id: 'games', label: 'Games', icon: '🎮' },
                ...((currentDay.hasBus === true || currentDay.hasBus === 'to-only') ? [{ id: 'bus', label: 'Bus', icon: '🚌' }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`border-b-2 font-medium transition-colors ${
                    isMobileDevice ? 'py-2 px-2 text-xs whitespace-nowrap min-w-[60px]' : 'py-2 px-1 text-sm'
                  } ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`flex ${isMobileDevice ? 'flex-col items-center justify-center' : 'items-center'}`}>
                    <span className={isMobileDevice ? 'text-base mb-1' : 'text-sm'}>{tab.icon}</span>
                    <span className={isMobileDevice ? 'text-xs leading-tight' : 'ml-1 text-sm'}>{tab.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Tab Content */}
        {currentDay.type !== 'off' && (
          <div className={`bg-white rounded-lg shadow ${isMobileDevice ? 'p-3' : 'p-6'}`}>
            {activeTab === 'scan' && (
              <div>
                <h2 className={`font-semibold mb-4 ${isMobileDevice ? 'text-lg' : 'text-xl'}`}>QR Code Scanner</h2>
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
                        <div className="text-4xl mb-2">{currentDayData.attended ? '✅' : '⏸️'}</div>
                        <div className="text-xl font-medium">Mark Attendance</div>
                        <div className="text-sm opacity-75">{currentDay.name}</div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <div className="text-gray-600">No attendance data available for this participant on this day.</div>
                    <div className="text-sm text-gray-500 mt-2">Attendance tracking will be initialized when first marked.</div>
                  </div>
                )}
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
                          <div className="text-2xl mb-2">{(currentDayData as any)[foodType] ? '✅' : '🍽️'}</div>
                          <div className="font-medium capitalize">{foodType}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <div className="text-gray-600">No food tracking data available for this participant on this day.</div>
                    <div className="text-sm text-gray-500 mt-2">Food tracking will be initialized when first marked.</div>
                  </div>
                )}
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
                                <div className="text-2xl mb-2">{currentGame ? '🔴' : '🎮'}</div>
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
                                <span className={`font-medium ${entry.type === 'arriving' ? 'text-green-600' : 'text-blue-600'}`}>
                                  {entry.type === 'arriving' ? '🚌 Arrived' : '🚌 Departed'}
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
                      {busRoutes.map(route => (
                        <div key={route.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-3">{route.name}</h3>
                          <div className={`grid gap-4 ${currentDay.hasBus === 'to-only' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                            <div>
                              <h4 className="font-medium text-green-700 mb-2">Arriving</h4>
                              <div className="space-y-2">
                                {route.stops.map(stop => (
                                  <button
                                    key={`arriving-${stop}`}
                                    onClick={() => handleBusTracking('arriving', route.name, stop)}
                                    className="w-full p-2 text-left border border-green-300 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors text-sm"
                                  >
                                    🚌 Arriving at {stop}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {currentDay.hasBus === true && (
                              <div>
                                <h4 className="font-medium text-blue-700 mb-2">Departing</h4>
                                <div className="space-y-2">
                                  {route.stops.map(stop => (
                                    <button
                                      key={`departing-${stop}`}
                                      onClick={() => handleBusTracking('departing', route.name, stop)}
                                      className="w-full p-2 text-left border border-blue-300 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm"
                                    >
                                      🚌 Departing from {stop}
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
                      ))}
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