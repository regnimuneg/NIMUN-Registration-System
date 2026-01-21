import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../../lib/api'
import { QrCode, Search, CheckCircle, XCircle, RefreshCw, User, Camera, CameraOff, Calendar, UtensilsCrossed, Clock, LogIn, LogOut, MessageSquare, CheckSquare, Square } from 'lucide-react'

interface SessionOption {
  id: string
  label: string
  date: string
  dayKey: string
}

const SESSION_OPTIONS: SessionOption[] = [
  { id: 'sessions-day1', label: 'Sessions Day 1', date: '25 Jan', dayKey: 'sessions.day1' },
  { id: 'sessions-day2', label: 'Sessions Day 2', date: '26 Jan', dayKey: 'sessions.day2' },
  { id: 'sessions-day3', label: 'Sessions Day 3', date: '27 Jan', dayKey: 'sessions.day3' },
  { id: 'sessions-day4', label: 'Sessions Day 4', date: '28 Jan', dayKey: 'sessions.day4' },
  { id: 'opening-ceremony', label: 'Opening Ceremony', date: '30 Jan', dayKey: 'openingCeremony' },
  { id: 'conference-day1', label: 'Conference Day 1', date: '31 Jan', dayKey: 'conference.day1' },
  { id: 'conference-day2', label: 'Conference Day 2', date: '1 Feb', dayKey: 'conference.day2' },
  { id: 'conference-day3', label: 'Conference Day 3', date: '2 Feb', dayKey: 'conference.day3' }
]

export default function ScanPage() {
  const [selectedSession, setSelectedSession] = useState<SessionOption | null>(null)
  const [scannedId, setScannedId] = useState<string>('')
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<Array<{ id: string; name: string; time: string }>>([])
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const qrCodeRegionId = 'qr-reader'
  
  // Activity tracking state
  const [attendance, setAttendance] = useState(false)
  const [breakfast, setBreakfast] = useState(false)
  const [lunch, setLunch] = useState(false)
  const [catering, setCatering] = useState(false)
  const [activity, setActivity] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [isScanning])

  const startScanning = async () => {
    try {
      setCameraError(null)
      const html5QrCode = new Html5Qrcode(qrCodeRegionId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Successfully scanned
          handleScan(decodedText)
          stopScanning()
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent while scanning)
        }
      )
      setIsScanning(true)
    } catch (err: any) {
      setCameraError(err.message || 'Failed to start camera')
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        // Ignore stop errors
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleScan = async (participantId: string) => {
    if (!participantId.trim() || !selectedSession) return

    // Make case-insensitive - convert to uppercase for search
    const searchId = participantId.trim().toUpperCase()

    setLoading(true)
    setError(null)
    setParticipant(null)

    try {
      const data = await api.getParticipant(searchId, true)
      
      if (data.participant) {
        setParticipant(data.participant)
        setScannedId(searchId)
        
        // Load existing tracking data for this session
        if (data.tracking) {
          const tracking = data.tracking
          const sessionType = mapDayKeyToSessionType(selectedSession.dayKey)
          
          // Set attendance status
          if (tracking.dayTracking && sessionType) {
            const dayData = tracking.dayTracking[sessionType]
            if (dayData) {
              setAttendance(dayData.attended || false)
              if (dayData.checkin) setCheckInTime(dayData.checkin)
              if (dayData.checkout) setCheckOutTime(dayData.checkout)
            }
          }
          
          // Set food status
          if (tracking.foodData) {
            const foodKey = `${selectedSession.dayKey}.breakfast`
            const lunchKey = `${selectedSession.dayKey}.lunch`
            const cateringKey = `${selectedSession.dayKey}.catering`
            if (tracking.foodData[foodKey]) setBreakfast(true)
            if (tracking.foodData[lunchKey]) setLunch(true)
            if (tracking.foodData[cateringKey]) setCatering(true)
          }
        } else {
          // Reset activity tracking state if no tracking data
          setAttendance(false)
          setBreakfast(false)
          setLunch(false)
          setCatering(false)
          setActivity(false)
          setCheckInTime(null)
          setCheckOutTime(null)
        }
        
        // Reset comments (will be loaded separately if needed)
        setComments('')
        
        // Add to scan history
        setScanHistory(prev => [
          { id: searchId, name: data.participant.name, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9) // Keep last 10 scans
        ])
      } else {
        setError('Participant not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch participant')
      setParticipant(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase for case-insensitive search
    const value = e.target.value.toUpperCase()
    setScannedId(value)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannedId) {
      handleScan(scannedId)
    }
  }

  const clearScan = () => {
    setScannedId('')
    setParticipant(null)
    setError(null)
    setAttendance(false)
    setBreakfast(false)
    setLunch(false)
    setActivity(false)
    setCheckInTime(null)
    setCheckOutTime(null)
    setComments('')
    if (isScanning) {
      stopScanning()
    }
  }

  const handleCheckIn = async () => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      const timestamp = new Date().toISOString()
      await api.updateAttendance({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        field: 'attended',
        value: true,
        checkIn: true
      })
      setCheckInTime(timestamp)
      setAttendance(true)
    } catch (err: any) {
      alert(`Failed to check in: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCheckOut = async () => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      const timestamp = new Date().toISOString()
      await api.updateAttendance({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        field: 'attended',
        value: false,
        checkOut: true
      })
      setCheckOutTime(timestamp)
    } catch (err: any) {
      alert(`Failed to check out: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAttendance = async (value: boolean) => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      await api.updateAttendance({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        field: 'attended',
        value
      })
      setAttendance(value)
      if (value && !checkInTime) {
        setCheckInTime(new Date().toISOString())
      }
    } catch (err: any) {
      alert(`Failed to update attendance: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleBreakfast = async (value: boolean) => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      await api.updateFood({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        meal: 'breakfast',
        value
      })
      setBreakfast(value)
    } catch (err: any) {
      alert(`Failed to update breakfast: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLunch = async (value: boolean) => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      await api.updateFood({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        meal: 'lunch',
        value
      })
      setLunch(value)
    } catch (err: any) {
      alert(`Failed to update lunch: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleCatering = async (value: boolean) => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      await api.updateFood({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        meal: 'catering',
        value
      })
      setCatering(value)
    } catch (err: any) {
      alert(`Failed to update catering: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivity = async (value: boolean) => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      await api.updateGame({
        participantId: participant.id,
        activity: 'other',
        day: selectedSession.dayKey,
        action: value ? 'join' : 'leave'
      })
      setActivity(value)
    } catch (err: any) {
      alert(`Failed to update activity: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveComments = async () => {
    if (!participant || !selectedSession) return
    
    try {
      setSaving(true)
      await api.updateComments({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        comments
      })
      // Don't show alert, just save silently
    } catch (err: any) {
      alert(`Failed to save comments: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Helper function to map dayKey to session type
  function mapDayKeyToSessionType(dayKey: string): string | null {
    const mapping: Record<string, string> = {
      'sessions.day1': 'day1',
      'sessions.day2': 'day2',
      'sessions.day3': 'day3',
      'sessions.day4': 'day4',
      'openingCeremony': 'opening_ceremony',
      'conference.day1': 'conf_day1',
      'conference.day2': 'conf_day2',
      'conference.day3': 'conf_day3'
    }
    return mapping[dayKey] || null
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto w-full overflow-x-hidden">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">QR Code Scanner</h1>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg">Select a session, then scan QR code or enter participant ID</p>
          </div>

          {/* Session Selection */}
          <div className="card mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[var(--color-primary-blue)]" />
              <h2 className="text-lg sm:text-xl font-bold">Select Session</h2>
            </div>
            <div className="w-full">
              <select
                value={selectedSession?.id || ''}
                onChange={(e) => {
                  const session = SESSION_OPTIONS.find(s => s.id === e.target.value)
                  setSelectedSession(session || null)
                }}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[var(--color-primary-blue)] focus:ring-2 focus:ring-blue-100 bg-white text-base font-medium"
              >
                <option value="">-- Select a session --</option>
                {SESSION_OPTIONS.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.label} ({session.date})
                  </option>
                ))}
              </select>
            </div>
            {!selectedSession && (
              <p className="mt-4 text-sm text-orange-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Please select a session before scanning
              </p>
            )}
          </div>

          {/* Camera Scanner */}
          <div className="card mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Camera Scanner</h2>
            {!isScanning ? (
              <button
                onClick={startScanning}
                disabled={!selectedSession}
                className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <CameraOff className="w-4 h-4" />
                Stop Camera
              </button>
            )}
          </div>
          
          <div id={qrCodeRegionId} className="w-full max-w-md mx-auto" />
          
          {cameraError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">{cameraError}</p>
              <p className="text-xs text-yellow-600 mt-1">You can still use manual entry below</p>
            </div>
          )}
          </div>

          {/* Manual Input */}
          <div className="card mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Participant ID Manually
              </label>
              <div className="relative">
                <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={scannedId}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter participant ID (e.g., IC-01, EX-05)"
                  disabled={!selectedSession}
                  className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex flex-row sm:flex-col gap-2">
              <button
                onClick={() => handleScan(scannedId)}
                disabled={!scannedId.trim() || loading || !selectedSession}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base flex-1 sm:flex-none justify-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
              {participant && (
                <button
                  onClick={clearScan}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base flex-1 sm:flex-none"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          </div>

          {/* Participant Details */}
          {participant && selectedSession && (
            <div className="card mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{participant.name}</h2>
                  <p className="text-gray-600 text-sm sm:text-base truncate">{participant.position}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Session: {selectedSession.label} ({selectedSession.date})
                  </p>
                </div>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">ID</p>
                <p className="font-semibold">{participant.id}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Phone</p>
                <p className="font-semibold">{participant.phoneNumber || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Gender</p>
                <p className="font-semibold">{participant.gender || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="font-semibold text-green-600">Active</p>
              </div>
            </div>

            {participant.qrUrl && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">QR Code</p>
                <img src={participant.qrUrl} alt="QR Code" className="w-32 h-32 border border-gray-300 rounded" />
              </div>
            )}

            {/* Activity Tracking */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold mb-4">Activity Tracking</h3>
              
              {/* Check-in/Check-out */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={handleCheckIn}
                  disabled={saving || attendance}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  <LogIn className="w-4 h-4" />
                  Check In
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={saving || !attendance}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  <LogOut className="w-4 h-4" />
                  Check Out
                </button>
              </div>

              {checkInTime && (
                <div className="mb-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Check-in: {new Date(checkInTime).toLocaleString()}
                </div>
              )}
              {checkOutTime && (
                <div className="mb-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Check-out: {new Date(checkOutTime).toLocaleString()}
                </div>
              )}

              {/* Activity Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Attendance</span>
                  </div>
                  <button
                    onClick={() => handleToggleAttendance(!attendance)}
                    disabled={saving}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      attendance ? 'bg-green-500' : 'bg-gray-300'
                    } relative disabled:opacity-50`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      attendance ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>

                {/* Show breakfast only for conference days */}
                {selectedSession && selectedSession.dayKey.startsWith('conference.') && (
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Breakfast</span>
                    </div>
                    <button
                      onClick={() => handleToggleBreakfast(!breakfast)}
                      disabled={saving}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        breakfast ? 'bg-green-500' : 'bg-gray-300'
                      } relative disabled:opacity-50`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        breakfast ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </label>
                )}

                {/* Show lunch for sessions and conference days */}
                {selectedSession && (selectedSession.dayKey.startsWith('sessions.') || selectedSession.dayKey.startsWith('conference.')) && (
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Lunch</span>
                    </div>
                    <button
                      onClick={() => handleToggleLunch(!lunch)}
                      disabled={saving}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        lunch ? 'bg-green-500' : 'bg-gray-300'
                      } relative disabled:opacity-50`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        lunch ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </label>
                )}

                {/* Show catering for opening ceremony */}
                {selectedSession && selectedSession.dayKey === 'openingCeremony' && (
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Catering</span>
                    </div>
                    <button
                      onClick={() => handleToggleCatering(!catering)}
                      disabled={saving}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        catering ? 'bg-green-500' : 'bg-gray-300'
                      } relative disabled:opacity-50`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        catering ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </label>
                )}

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Activity</span>
                  </div>
                  <button
                    onClick={() => handleToggleActivity(!activity)}
                    disabled={saving}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      activity ? 'bg-green-500' : 'bg-gray-300'
                    } relative disabled:opacity-50`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      activity ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </label>
              </div>

              {/* Comments */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add comments for this participant and day..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-none"
                />
                <button
                  onClick={handleSaveComments}
                  disabled={saving}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  {saving ? 'Saving...' : 'Save Comments'}
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Scans</h3>
            <div className="space-y-2">
              {scanHistory.map((scan, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleScan(scan.id)}
                >
                  <div>
                    <p className="font-medium">{scan.name}</p>
                    <p className="text-sm text-gray-600">{scan.id}</p>
                  </div>
                  <p className="text-sm text-gray-500">{scan.time}</p>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
