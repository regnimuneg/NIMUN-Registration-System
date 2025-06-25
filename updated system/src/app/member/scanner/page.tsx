'use client'

import { useState, useEffect } from 'react'
import { Smartphone, CheckCircle, Utensils, Gamepad2, Bus, Check, X, AlertCircle, Loader } from 'lucide-react'
import QRScanner from '@/components/QRScanner'
import ParticipantHistory from '@/components/ParticipantHistory'
import DaySelector, { EventDay, eventDays } from '@/components/DaySelector'
import { Participant, TrackingData } from '@/types/participant'
import { getAllBusRoutes, getBusRouteById } from '@/lib/busRoutes'

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
    // Always set to scan tab when changing days, but don't restrict other tabs
    setActiveTab('scan')
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

      // Refresh tracking data
      const trackingResponse = await fetch(`/api/participants/${currentParticipant.id}?include=tracking`)
      const updatedData = await trackingResponse.json()
      setTrackingData(updatedData.tracking)

      setSuccess(`Bus tracking updated: ${type} at ${stop}`)
    } catch (err) {
      setError(`❌ Error updating bus tracking: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Helper functions
  const getCurrentDayData = () => {
    if (!trackingData) return null
    
    // Map selectedDay to tracking structure
    // Sessions days map to sessions tracking
    if (selectedDay.startsWith('sessions-')) {
      const dayNum = selectedDay.split('-')[1] // 'day1', 'day2', etc.
      return (trackingData.dayTracking?.sessions as any)?.[dayNum] || null
    }
    
    // Conference days map to conference tracking
    if (selectedDay.startsWith('conference-')) {
      const dayNum = selectedDay.split('-')[1] // 'day1', 'day2', etc.
      return (trackingData.dayTracking?.conference as any)?.[dayNum] || null
    }
    
    // Performance day
    if (selectedDay === 'performance-day') {
      return trackingData.dayTracking?.performanceDay || null
    }
    
    // Opening ceremony
    if (selectedDay === 'opening-ceremony') {
      return trackingData.dayTracking?.openingCeremony || null
    }
    
    // Fallback: try to find any matching day structure
    return null
  }

  const getCurrentDayKey = () => {
    // Return key format for API calls
    // Sessions days
    if (selectedDay.startsWith('sessions-')) {
      const dayNum = selectedDay.split('-')[1] // 'day1', 'day2', etc.
      return `sessions.${dayNum}`
    }
    
    // Conference days  
    if (selectedDay.startsWith('conference-')) {
      const dayNum = selectedDay.split('-')[1] // 'day1', 'day2', etc.
      return `conference.${dayNum}`
    }
    
    // Performance day
    if (selectedDay === 'performance-day') {
      return 'performanceDay'
    }
    
    // Opening ceremony
    if (selectedDay === 'opening-ceremony') {
      return 'openingCeremony'
    }
    
    // Default fallback
    return 'sessions.day1'
  }

  // Check if it's today to show attendance options only for the current day
  // Helper function to check if a day should allow attendance
  const canTakeAttendance = (dayId: string) => {
    // For testing/development - allow all days
    return true
    
    // Production code (commented out for testing):
    // const today = new Date()
    // const dayNumber = today.getDate()
    // 
    // // Day 1 (Sessions): 21st
    // // Day 2 (MUN): 22nd
    // if (dayId === 'day1' && dayNumber === 21) return true
    // if (dayId === 'day2' && dayNumber === 22) return true
    // 
    // return false
  }

  // Mobile detection - client-side only to avoid SSR mismatch
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const currentDayData = getCurrentDayData()

  return (
    <div className="min-h-screen bg-[var(--background)] px-2 py-1">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl md:text-2xl font-heading text-gray-900 mb-1">QR Scanner</h1>
          <p className="text-sm text-[var(--text-secondary)] font-body">Scan participant QR codes for tracking</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="status-error mb-2 mx-1 text-sm animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="status-success mb-2 mx-1 text-sm animate-fade-in">
            {success}
          </div>
        )}

        {/* Day Selection */}
        <div className="mb-3">
          <DaySelector selectedDay={selectedDay} onDayChange={handleDayChange} />
        </div>

        {/* Current Participant Display */}
        {currentParticipant && (
          <div className="card mb-3 mx-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-sm text-gray-900 truncate">{currentParticipant.name}</h3>
                <div className="flex flex-col sm:flex-row gap-1 text-xs text-[var(--text-secondary)] font-body">
                  <span className="truncate">ID: {currentParticipant.id}</span>
                  <span className="truncate">Position: {currentParticipant.position}</span>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary btn-xs shrink-0 font-body"
              >
                History
              </button>
            </div>
          </div>
        )}

        {/* History Modal/Section */}
        {showHistory && currentParticipant && (
          <div className="card mb-3 mx-1">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-heading text-base text-gray-900">Participant History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="btn-secondary btn-xs"
              >
                Close
              </button>
            </div>
            <ParticipantHistory participantId={currentParticipant.id} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-3 -mx-2 px-2 overflow-x-auto">
          {(['scan', 'attendance', 'food', 'games', 'bus'] as const).map((tab) => (
                <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab ${activeTab === tab ? 'tab-active' : 'tab-inactive'}`}
            >
              <div className="flex flex-col items-center">
                <span className="mb-0.5">
                  {tab === 'scan' && <Smartphone className="w-5 h-5" />}
                  {tab === 'attendance' && <CheckCircle className="w-5 h-5" />}
                  {tab === 'food' && <Utensils className="w-5 h-5" />}
                  {tab === 'games' && <Gamepad2 className="w-5 h-5" />}
                  {tab === 'bus' && <Bus className="w-5 h-5" />}
                </span>
                <span className="capitalize">
                  {tab === 'attendance' ? 'Attendance' : tab}
                </span>
                  </div>
                </button>
              ))}
          </div>

        {/* Tab Content */}
        <div className="p-2 mx-1">
          {/* QR Scanner Tab */}
            {activeTab === 'scan' && (
            <div className="space-y-3">
              <h2 className="text-base font-heading text-gray-900 mb-2">
                {currentDay.name.replace(' Day 1', '').replace(' Day 2', '')}
              </h2>
                <QRScanner onScan={handleQRScan} isActive={activeTab === 'scan'} />
              </div>
            )}

          {/* Attendance Tab */}
            {activeTab === 'attendance' && (
            <div className="space-y-3">
              <h2 className="text-base font-heading text-gray-900 mb-2">Attendance</h2>
                {!currentParticipant ? (
                <p className="text-[var(--text-secondary)] text-sm font-body">Scan a participant to track attendance</p>
              ) : !canTakeAttendance(selectedDay) ? (
                <div className="status-info text-sm">
                  Attendance tracking is only available on event days
                </div>
              ) : currentDayData ? (
                <div className="space-y-2">
                  {/* Simple attendance tracking */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate font-body">
                        {currentDay.name} Attendance
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-body">
                        Mark participant as present for this session
                      </p>
                    </div>
                    <button
                      onClick={() => handleAttendanceUpdate(getCurrentDayKey(), 'attended')}
                      className={`btn-xs ${currentDayData.attended ? 'btn-success' : 'btn-primary'}`}
                    >
                      {currentDayData.attended ? <><Check className="w-4 h-4 mr-1 inline" />Present</> : 'Mark Present'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[var(--text-secondary)] text-sm font-body">No session data available for this day</p>
                )}
              </div>
            )}

          {/* Food Tab */}
          {activeTab === 'food' && (
            <div className="space-y-3">
              <h2 className="text-base font-heading text-gray-900 mb-2">Food Tracking</h2>
                {!currentParticipant ? (
                <p className="text-[var(--text-secondary)] text-sm font-body">Scan a participant to track food distribution</p>
              ) : currentDay.hasFood && currentDay.foodTypes.length > 0 ? (
                <div className="space-y-2">
                  {/* Generate food options based on current day food types */}
                  {currentDay.foodTypes.map((foodType) => {
                    const isReceived = currentDayData && (
                      foodType === 'lunch' ? currentDayData.lunch : 
                      foodType === 'breakfast' ? (currentDayData as any).breakfast :
                      foodType === 'catering' ? (currentDayData as any).catering : false
                    )
                    
                    return (
                      <div key={foodType} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate font-body">
                            {foodType.charAt(0).toUpperCase() + foodType.slice(1)}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] font-body">
                            {currentDay.name} - {foodType}
                          </p>
                        </div>
                        <button
                          onClick={() => handleFoodUpdate(getCurrentDayKey(), foodType)}
                          className={`btn-xs ${isReceived ? 'btn-success' : 'btn-accent-3'}`}
                        >
                          {isReceived ? <><Check className="w-4 h-4 mr-1 inline" />Given</> : 'Mark Given'}
                      </button>
                      </div>
                    )
                  })}
                  </div>
              ) : (
                <p className="text-[var(--text-secondary)] text-sm font-body">No meal service available for this day</p>
                )}
              </div>
            )}

          {/* Games Tab */}
            {activeTab === 'games' && (
            <div className="space-y-3">
              <h2 className="text-base font-heading text-gray-900 mb-2">Activities</h2>
                {!currentParticipant ? (
                <p className="text-[var(--text-secondary)] text-sm font-body">Scan a participant to track activities</p>
              ) : (
                        <div className="space-y-2">
                  {availableGames.map((game) => {
                    // Check if participant is currently in this game
                    // @ts-ignore - Fix game tracking types later
                    const gameHistory = trackingData?.games || []
                    // @ts-ignore - Fix game tracking types later  
                    const latestEntry = gameHistory
                      .filter((entry: any) => entry.activity === game && entry.day === selectedDay)
                      .sort((a: any, b: any) => new Date(b.joinTime || b.timestamp).getTime() - new Date(a.joinTime || a.timestamp).getTime())[0]
                    
                    // @ts-ignore - Fix game tracking types later
                    const isCurrentlyJoined = latestEntry?.action === 'join'
                    
                    return (
                      <div key={game} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate font-body">{game}</p>
                          {latestEntry && (
                            <p className="text-xs text-[var(--text-secondary)] font-body">
                              {/* @ts-ignore - Fix game tracking types later */}
                              Last: {latestEntry.action} at {new Date(latestEntry.timestamp || latestEntry.joinTime).toLocaleTimeString()}
                            </p>
                          )}
                              </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleGameActivity(game, 'join')}
                            disabled={isCurrentlyJoined}
                            className={`btn-xs ${isCurrentlyJoined ? 'btn-secondary opacity-50' : 'btn-success'}`}
                          >
                            Join
                          </button>
                                  <button
                            onClick={() => handleGameActivity(game, 'leave')}
                            disabled={!isCurrentlyJoined}
                            className={`btn-xs ${!isCurrentlyJoined ? 'btn-secondary opacity-50' : 'btn-danger'}`}
                                  >
                                    Leave
                                  </button>
                        </div>
                      </div>
                          )
                        })}
                      </div>
              )}
              </div>
            )}

          {/* Bus Tab */}
          {activeTab === 'bus' && (
            <div className="space-y-3">
              <h2 className="text-base font-heading text-gray-900 mb-2">Transportation</h2>
                {!currentParticipant ? (
                <p className="text-[var(--text-secondary)] text-sm font-body">Scan a participant to track bus travel</p>
              ) : !currentParticipant.busRoute ? (
                <div className="status-info text-sm">
                  This participant is not assigned to any bus route.
                              </div>
              ) : (
                <div className="space-y-3">
                  {/* Show only the participant's assigned route */}
                  {(() => {
                    const assignedRoute = getBusRouteById(currentParticipant.busRoute)
                    if (!assignedRoute) {
                      return (
                        <div className="status-error text-sm">
                          <strong>Error:</strong> Route {currentParticipant.busRoute} not found in system
                            </div>
                      )
                    }
                    
                    return (
                      <div>
                        <div className="status-success text-sm mb-3">
                          <strong>Assigned Route:</strong> {assignedRoute.name}
                        </div>
                        
                        {/* Day-specific bus warnings */}
                        {selectedDay === 'day1' && (
                          <div className="status-warning text-sm mb-3">
                            <strong>Note:</strong> Buses run to University only on Sessions day
                      </div>
                    )}
                    
                        <div className="card-accent-1">
                          <h3 className="font-heading text-sm text-gray-900 mb-2">{assignedRoute.name}</h3>
                              <div className="space-y-2">
                            {assignedRoute.stops.map((stop: any) => (
                              <div key={stop.name || stop} className="flex items-center justify-between text-xs">
                                <span className="flex-1 min-w-0 truncate font-body">{stop.name || stop}</span>
                                <div className="flex gap-1 ml-2">
                                  <button
                                    onClick={() => handleBusTracking('arriving', currentParticipant.busRoute!, stop.name || stop)}
                                    className="btn-xs btn-primary"
                                  >
                                    Arriving
                                  </button>
                                    <button
                                    onClick={() => handleBusTracking('departing', currentParticipant.busRoute!, stop.name || stop)}
                                    className="btn-xs btn-secondary"
                                    >
                                    Departing
                                    </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>
                    )
                  })()}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
} 