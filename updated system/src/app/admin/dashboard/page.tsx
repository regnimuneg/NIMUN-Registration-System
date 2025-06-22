'use client'

import { useState, useEffect } from 'react'
import QRScanner from '@/components/QRScanner'
import ParticipantHistory from '@/components/ParticipantHistory'
import { Participant } from '@/types/participant'

interface TrackingData {
  attendance: {
    session1: boolean
    session2: boolean
    session3: boolean
    session4: boolean
    conference1: boolean
    conference2: boolean
    conference3: boolean
    performanceDay: boolean
    openingDay: boolean
  }
  food: {
    breakfast: boolean
    lunch: boolean
    dinner: boolean
    snack1: boolean
    snack2: boolean
  }
  games: {
    activity: string
    joinTime?: string
    leaveTime?: string
    status: 'joining' | 'leaving' | 'completed'
  }[]
  bus: {
    type: 'arriving' | 'departing'
    stop: string
    timestamp: string
  }[]
}

export default function DashboardPage() {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [activeTab, setActiveTab] = useState<'scan' | 'attendance' | 'food' | 'games' | 'bus'>('scan')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)

  // Bus stops configuration
  const [busStops, setBusStops] = useState<string[]>([
    'Main Campus Gate',
    'City Center',
    'Shopping Mall',
    'Residential Area A',
    'Residential Area B'
  ])
  const [newBusStop, setNewBusStop] = useState('')

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

  const handleQRScan = async (participantId: string) => {
    try {
      setError('')
      setSuccess('')
      
      // Fetch participant data from API
      const participantResponse = await fetch(`/api/participants/${participantId}`)
      if (!participantResponse.ok) {
        throw new Error('Participant not found')
      }
      
      const participant = await participantResponse.json()
      setCurrentParticipant(participant)
      
      // Fetch existing tracking data
      const trackingResponse = await fetch(`/api/participants/${participantId}/tracking`)
      let existingTracking = null
      if (trackingResponse.ok) {
        existingTracking = await trackingResponse.json()
      }
      
      // Initialize tracking data with existing data or defaults
      setTrackingData({
        attendance: participant.attendance || {
          session1: false,
          session2: false,
          session3: false,
          session4: false,
          conference1: false,
          conference2: false,
          conference3: false,
          performanceDay: false,
          openingDay: false
        },
        food: existingTracking?.food || {
          breakfast: false,
          lunch: false,
          dinner: false,
          snack1: false,
          snack2: false
        },
        games: existingTracking?.games || [],
        bus: existingTracking?.bus || []
      })
      
      setActiveTab('attendance')
      setSuccess(`Loaded participant: ${participant.name} (ID: ${participantId})`)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load participant')
    }
  }

  const handleAttendanceUpdate = async (field: keyof TrackingData['attendance']) => {
    if (!currentParticipant || !trackingData) return
    
    try {
      const newValue = !trackingData.attendance[field]
      
      // Save attendance to API
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          field,
          value: newValue
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save attendance')
      }
      
      setTrackingData(prev => prev ? {
        ...prev,
        attendance: { ...prev.attendance, [field]: newValue }
      } : null)
      
      setSuccess(`Attendance updated: ${field.replace(/([A-Z])/g, ' $1').trim()}`)
    } catch (error) {
      setError('Failed to update attendance')
    }
  }

  const handleFoodUpdate = async (meal: keyof TrackingData['food']) => {
    if (!currentParticipant || !trackingData) return
    
    try {
      const newValue = !trackingData.food[meal]
      
      // Save food tracking to API
      const response = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          meal,
          value: newValue
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save food tracking')
      }
      
      setTrackingData(prev => prev ? {
        ...prev,
        food: { ...prev.food, [meal]: newValue }
      } : null)
      
      setSuccess(`Food tracking updated: ${meal}`)
    } catch (error) {
      setError('Failed to update food tracking')
    }
  }

  const handleGameActivity = async (activity: string, action: 'join' | 'leave') => {
    if (!currentParticipant || !trackingData) return
    
    try {
      // Save game activity to API
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          activity,
          action
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save game activity')
      }
      
      const result = await response.json()
      const timestamp = result.timestamp
      
      // Update local state
      setTrackingData(prev => {
        if (!prev) return null
        
        const newGames = [...prev.games]
        const existingIndex = newGames.findIndex(g => g.activity === activity && !g.leaveTime)
        
        if (action === 'join') {
          if (existingIndex === -1) {
            newGames.push({
              activity,
              joinTime: timestamp,
              status: 'joining'
            })
          }
        } else if (action === 'leave' && existingIndex !== -1) {
          newGames[existingIndex] = {
            ...newGames[existingIndex],
            leaveTime: timestamp,
            status: 'completed'
          }
        }
        
        return { ...prev, games: newGames }
      })
      
      setSuccess(`Game activity updated: ${action} ${activity}`)
    } catch (error) {
      setError('Failed to update game activity')
    }
  }

  const handleBusTracking = async (type: 'arriving' | 'departing', stop: string) => {
    if (!currentParticipant || !trackingData) return
    
    try {
      // Save bus tracking to API
      const response = await fetch('/api/bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          type,
          stop
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save bus tracking')
      }
      
      const result = await response.json()
      const timestamp = result.timestamp
      
      setTrackingData(prev => prev ? {
        ...prev,
        bus: [...prev.bus, { type, stop, timestamp }]
      } : null)
      
      setSuccess(`Bus tracking updated: ${type} at ${stop}`)
    } catch (error) {
      setError('Failed to update bus tracking')
    }
  }

  const addBusStop = () => {
    if (newBusStop.trim() && !busStops.includes(newBusStop.trim())) {
      setBusStops([...busStops, newBusStop.trim()])
      setNewBusStop('')
      setSuccess(`Added new bus stop: ${newBusStop.trim()}`)
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(clearMessages, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            JNIMUN'25 Tracking Dashboard
          </h1>
          <p className="text-gray-600">
            Scan participant QR codes to track attendance, food, games, and transportation
          </p>
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
                className="btn-secondary text-sm"
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

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'scan', label: 'QR Scanner', icon: '📱' },
              { id: 'attendance', label: 'Attendance', icon: '✅' },
              { id: 'food', label: 'Food Tracking', icon: '🍽️' },
              { id: 'games', label: 'Games & Activities', icon: '🎮' },
              { id: 'bus', label: 'Bus Tracking', icon: '🚌' }
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

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'scan' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
              <p className="text-gray-600 mb-4">
                Use the camera to scan participant QR codes, or try the alternative methods below.
              </p>
              <QRScanner
                onScan={handleQRScan}
                onError={setError}
                isActive={true}
              />
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">How to scan:</h3>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Click "Start Camera" to activate the camera</li>
                  <li>2. Allow camera access when prompted</li>
                  <li>3. Position the QR code in the green frame for visual guidance</li>
                  <li>4. Use "Manual Input" to enter participant IDs like EX-01, OP-02</li>
                  <li>5. Or use "Upload QR Image" for QR codes saved as files</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Attendance Tracking</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
              ) : trackingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(trackingData.attendance).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleAttendanceUpdate(key as keyof TrackingData['attendance'])}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{value ? '✅' : '⏸️'}</div>
                        <div className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'food' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Food Tracking</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
              ) : trackingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(trackingData.food).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleFoodUpdate(key as keyof TrackingData['food'])}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{value ? '✅' : '🍽️'}</div>
                        <div className="font-medium capitalize">{key}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'games' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Games & Activities</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
              ) : trackingData ? (
                <div>
                  {/* Current Activities */}
                  {trackingData.games.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3">Current Activities</h3>
                      <div className="space-y-2">
                        {trackingData.games.map((game, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-medium">{game.activity}</span>
                              <span className="ml-2 text-sm text-gray-600">
                                {game.joinTime && `Joined: ${new Date(game.joinTime).toLocaleTimeString()}`}
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
                        const currentGame = trackingData.games.find(g => g.activity === game && !g.leaveTime)
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

          {activeTab === 'bus' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Bus Tracking</h2>
              {!currentParticipant ? (
                <p className="text-gray-600">Please scan a participant QR code first.</p>
              ) : trackingData ? (
                <div>
                  {/* Bus History */}
                  {trackingData.bus.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3">Bus History</h3>
                      <div className="space-y-2">
                        {trackingData.bus.slice().reverse().map((entry, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <div>
                              <span className={`font-medium ${entry.type === 'arriving' ? 'text-green-600' : 'text-blue-600'}`}>
                                {entry.type === 'arriving' ? '🚌 Arrived' : '🚌 Departed'}
                              </span>
                              <span className="ml-2">at {entry.stop}</span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Bus Tracking Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Arriving</h3>
                      <div className="space-y-2">
                        {busStops.map(stop => (
                          <button
                            key={`arriving-${stop}`}
                            onClick={() => handleBusTracking('arriving', stop)}
                            className="w-full p-3 text-left border border-green-300 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            🚌 Arriving at {stop}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Departing</h3>
                      <div className="space-y-2">
                        {busStops.map(stop => (
                          <button
                            key={`departing-${stop}`}
                            onClick={() => handleBusTracking('departing', stop)}
                            className="w-full p-3 text-left border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            🚌 Departing from {stop}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Add Custom Bus Stop */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-3">Add Custom Bus Stop</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBusStop}
                        onChange={(e) => setNewBusStop(e.target.value)}
                        placeholder="Enter new bus stop name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={addBusStop}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Add Stop
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

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