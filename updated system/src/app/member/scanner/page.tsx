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
  
  // Loading states for buttons
  const [isLoading, setIsLoading] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const [busButtonsDisabled, setBusButtonsDisabled] = useState({ arriving: false, departing: false })
  
  // Games state
  const [allParticipantsInCourts, setAllParticipantsInCourts] = useState<{[courtName: string]: Array<{participantId: string, participantName: string, committee: string, joinTime: string, duration: string}>}>({})
  const [participantCurrentGame, setParticipantCurrentGame] = useState<string | null>(null)
  const [gameActivityLoading, setGameActivityLoading] = useState(false)

  // Bus routes configuration (read-only for members)
  const busRoutes = getAllBusRoutes()

  // Games configuration with player limits
  const availableGames = [
    { name: 'Padel Court 1', maxPlayers: 4 },
    { name: 'Padel Court 2', maxPlayers: 4 },
    { name: 'Football Court', maxPlayers: 10 },
    { name: 'Basketball Court 1', maxPlayers: 10 },
    { name: 'Basketball Court 2', maxPlayers: 10 }
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

  // Fetch all participants in courts
  const fetchAllParticipantsInCourts = async () => {
    try {
      const response = await fetch(`/api/games/current-players?day=${selectedDay}`)
      if (response.ok) {
        const data = await response.json()
        setAllParticipantsInCourts(data.courts || {})
      }
    } catch (err) {
      console.error('Error fetching participants in courts:', err)
    }
  }

  // Check participant's current game status
  const checkParticipantGameStatus = async (participantId: string) => {
    try {
      // Check if participant is in any game by looking at the court data
      let currentGame = null
      Object.entries(allParticipantsInCourts).forEach(([courtName, players]) => {
        if (players.some(player => player.participantId === participantId)) {
          currentGame = courtName
        }
      })
      setParticipantCurrentGame(currentGame)
    } catch (err) {
      console.error('Error checking participant game status:', err)
      setParticipantCurrentGame(null)
    }
  }

  // Fetch court data when tab changes to games or day changes
  useEffect(() => {
    if (activeTab === 'games') {
      fetchAllParticipantsInCourts()
      const interval = setInterval(fetchAllParticipantsInCourts, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [activeTab, selectedDay])

  // Check participant status when participant or court data changes
  useEffect(() => {
    if (currentParticipant && activeTab === 'games') {
      checkParticipantGameStatus(currentParticipant.id)
    }
  }, [currentParticipant, allParticipantsInCourts, activeTab])

  const currentDay = eventDays.find(day => day.id === selectedDay) || eventDays[0]

  const handleQRScan = async (participantId: string) => {
    try {
      setError('')
      setIsLoading(true)
      setSuccess('Loading participant data...')
      setDataFetched(false)

      // Fetch participant data and tracking data in a single optimized call
      const response = await fetch(`/api/participants/${participantId}?include=tracking`)
      if (!response.ok) {
        throw new Error('Participant not found')
      }
      
      const data = await response.json()
      
      setCurrentParticipant(data.participant)
      setTrackingData(data.tracking)
      setDataFetched(true)
      setSuccess(`Loaded: ${data.participant.name} (${participantId})`)
      setIsLoading(false)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setCurrentParticipant(null)
      setTrackingData(null)
      setDataFetched(false)
      setIsLoading(false)
    }
  }

  const handleDayChange = (day: EventDay) => {
    setSelectedDay(day.id)
    // Always set to scan tab when changing days, but don't restrict other tabs
    setActiveTab('scan')
  }

  const handleAttendanceUpdate = async (dayKey: string, field: string) => {
    if (!currentParticipant || !trackingData || isLoading) return

    try {
      setIsLoading(true)
      setError('')
      
      // Get current state to determine new value (toggle behavior)
      const dayPath = dayKey.split('.')
      let current: any = trackingData.dayTracking
      
      for (let i = 0; i < dayPath.length - 1; i++) {
        current = current[dayPath[i]]
      }
      
      const currentValue = current[dayPath[dayPath.length - 1]][field] || false
      const newValue = !currentValue

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          dayKey,
          field,
          value: newValue
        })
      })

      if (!response.ok) throw new Error('Failed to update attendance')

      // Update local state with the new value (overwrite, not toggle)
      setTrackingData(prev => {
        if (!prev) return null
        const newTracking = { ...prev }
        
        // Navigate to the correct day and field
        const dayPath = dayKey.split('.')
        let current: any = newTracking.dayTracking
        
        for (let i = 0; i < dayPath.length - 1; i++) {
          current = current[dayPath[i]]
        }
        
        current[dayPath[dayPath.length - 1]][field] = newValue
        
        return newTracking
      })

      setSuccess(`Attendance ${newValue ? 'marked' : 'unmarked'}`)
    } catch (err) {
      setError(`Error updating attendance: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFoodUpdate = async (dayKey: string, mealType: string) => {
    if (!currentParticipant || !trackingData || isLoading) return

    try {
      setIsLoading(true)
      setError('')
      
      // Get current state to determine new value (toggle behavior)
      const dayPath = dayKey.split('.')
      let current: any = trackingData.dayTracking
      
      for (let i = 0; i < dayPath.length - 1; i++) {
        current = current[dayPath[i]]
      }
      
      const currentValue = current[dayPath[dayPath.length - 1]][mealType] || false
      const newValue = !currentValue

      const response = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          dayKey,
          meal: mealType,
          value: newValue
        })
      })

      if (!response.ok) throw new Error('Failed to update food tracking')

      // Update local state with the new value (overwrite, not toggle)
      setTrackingData(prev => {
        if (!prev) return null
        const newTracking = { ...prev }
        
        // Navigate to the correct day and meal
        const dayPath = dayKey.split('.')
        let current: any = newTracking.dayTracking
        
        for (let i = 0; i < dayPath.length - 1; i++) {
          current = current[dayPath[i]]
        }
        
        current[dayPath[dayPath.length - 1]][mealType] = newValue
        
        return newTracking
      })

      setSuccess(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} ${newValue ? 'marked as given' : 'unmarked'}`)
    } catch (err) {
      setError(`Error updating food: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGameActivity = async (activity: string, action: 'join' | 'leave') => {
    try {
      setGameActivityLoading(true);
      setError('');

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: currentParticipant?.id,
          activity,
          action,
          day: selectedDay
        }),
      });

      if (!response.ok) {
        let errMsg = 'Failed to update game activity';
        try {
          const errData = await response.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      // Refresh the game status
      await checkParticipantGameStatus(currentParticipant!.id);
      await fetchAllParticipantsInCourts();
      
      setSuccess(`Successfully ${action}ed ${activity}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Failed to update game activity'}`);
    } finally {
      setGameActivityLoading(false);
    }
  };

  const handleBusTracking = async (type: 'arriving' | 'departing', route: string, stop: string) => {
    if (!currentParticipant || !trackingData || isLoading) return

    try {
      setIsLoading(true)
      setError('')
      
      // Disable all buttons of the same type immediately
      setBusButtonsDisabled(prev => ({ ...prev, [type]: true }))

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
      setError(`Error updating bus tracking: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Re-enable buttons on error
      setBusButtonsDisabled(prev => ({ ...prev, [type]: false }))
    } finally {
      setIsLoading(false)
      // Keep buttons of same type disabled after successful operation
      // This prevents multiple clicks of the same type
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

  // Helper to get join time for timer
  function getCurrentParticipantJoinTime(): string | null {
    if (!currentParticipant || !participantCurrentGame) return null;
    const players = allParticipantsInCourts[participantCurrentGame] || [];
    const player = players.find(p => p.participantId === currentParticipant.id);
    return player ? player.joinTime : null;
  }

  // Timer state for current participant
  const [timer, setTimer] = useState<string>('');
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    function updateTimer() {
      const joinTime = getCurrentParticipantJoinTime();
      if (joinTime) {
        const join = new Date(joinTime);
        const now = new Date();
        const diff = now.getTime() - join.getTime();
        const min = Math.floor(diff / 60000);
        const hr = Math.floor(min / 60);
        const rem = min % 60;
        setTimer(hr > 0 ? `${hr}h ${rem}m` : `${rem}m`);
      } else {
        setTimer('');
      }
    }
    if (participantCurrentGame) {
      updateTimer();
      interval = setInterval(updateTimer, 1000 * 30);
    } else {
      setTimer('');
    }
    return () => { if (interval) clearInterval(interval); };
  }, [participantCurrentGame, allParticipantsInCourts, currentParticipant])

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

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-2">
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

        {/* Day Selection */}
        <div className="mb-4">
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate font-body">
                        Mark Attendance
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-body">
                        {currentDay.name} - Session Attendance
                      </p>
                    </div>
                    
                    {/* Switch-style toggle button */}
                    <div className="flex items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentDayData.attended || false}
                          onChange={() => handleAttendanceUpdate(getCurrentDayKey(), 'attended')}
                          disabled={isLoading || !dataFetched}
                          className="sr-only peer"
                        />
                        <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 ${(isLoading || !dataFetched) ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {isLoading ? (
                            <><Loader className="w-4 h-4 inline animate-spin" /> Processing...</>
                          ) : currentDayData.attended ? (
                            <><Check className="w-4 h-4 inline mr-1" />Present</>
                          ) : (
                            'Mark Present'
                          )}
                        </span>
                      </label>
                    </div>
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
                  {currentDay.foodTypes.map((foodType: string) => {
                    const isReceived = currentDayData && (
                      foodType === 'lunch' ? currentDayData.lunch : 
                      foodType === 'breakfast' ? (currentDayData as any).breakfast :
                      foodType === 'catering' ? (currentDayData as any).catering : false
                    )
                    
                    return (
                      <div key={foodType} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate font-body">
                            {foodType.charAt(0).toUpperCase() + foodType.slice(1)}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] font-body">
                            {currentDay.name} - {foodType}
                          </p>
                        </div>
                        
                        {/* Switch-style toggle button */}
                        <div className="flex items-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isReceived || false}
                              onChange={() => handleFoodUpdate(getCurrentDayKey(), foodType)}
                              disabled={isLoading || !dataFetched}
                              className="sr-only peer"
                            />
                            <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 ${(isLoading || !dataFetched) ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              {isLoading ? (
                                <><Loader className="w-4 h-4 inline animate-spin" /> Processing...</>
                              ) : isReceived ? (
                                <><Check className="w-4 h-4 inline mr-1" />Given</>
                              ) : (
                                'Mark Given'
                              )}
                            </span>
                          </label>
                        </div>
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
              <h2 className="text-base font-heading text-gray-900 mb-2">Games</h2>
              {!currentParticipant ? (
                <p className="text-[var(--text-secondary)] text-sm font-body">Scan a participant to manage games</p>
              ) : participantCurrentGame ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                  <div className="text-sm font-medium text-green-800">
                    🎮 Current Game: {participantCurrentGame}
                    {timer && <span className="ml-2 text-xs text-green-700">⏱️ {timer}</span>}
                  </div>
                  <button
                    className="btn-danger btn-sm"
                    disabled={gameActivityLoading}
                    onClick={() => handleGameActivity(participantCurrentGame, 'leave')}
                  >
                    {gameActivityLoading ? 'Leaving...' : 'Leave Game'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableGames.map((game) => {
                    const players = allParticipantsInCourts[game.name] || [];
                    const isFull = players.length >= game.maxPlayers;
                    return (
                      <div key={game.name} className="p-3 bg-gray-50 rounded-lg space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-gray-900">{game.name}</div>
                          <div className="text-xs text-gray-600">
                            {players.length}/{game.maxPlayers} players
                          </div>
                        </div>
                        <div className="text-xs text-gray-700 space-y-1">
                          {players.length > 0 ? (
                            players.map((p: any) => (
                              <div key={p.participantId}>
                                {p.participantName} (ID: {p.participantId}) - {p.committee} <span className="text-gray-400">({p.duration})</span>
                              </div>
                            ))
                          ) : (
                            <div>No players</div>
                          )}
                        </div>
                        <button
                          className={`btn-primary btn-sm ${isFull || gameActivityLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isFull || gameActivityLoading}
                          onClick={() => handleGameActivity(game.name, 'join')}
                        >
                          {gameActivityLoading ? 'Joining...' : isFull ? 'Full' : 'Join Game'}
                        </button>
                      </div>
                    );
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
                                    disabled={busButtonsDisabled.arriving || isLoading || !dataFetched}
                                    className={`btn-xs btn-primary ${(busButtonsDisabled.arriving || isLoading || !dataFetched) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {isLoading && busButtonsDisabled.arriving ? 'Processing...' : 'Arriving'}
                                  </button>
                                    <button
                                    onClick={() => handleBusTracking('departing', currentParticipant.busRoute!, stop.name || stop)}
                                    disabled={busButtonsDisabled.departing || isLoading || !dataFetched}
                                    className={`btn-xs btn-secondary ${(busButtonsDisabled.departing || isLoading || !dataFetched) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                    {isLoading && busButtonsDisabled.departing ? 'Processing...' : 'Departing'}
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