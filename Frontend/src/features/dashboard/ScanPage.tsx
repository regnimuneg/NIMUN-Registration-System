import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../../lib/api'
import { QrCode, Search, CheckCircle, XCircle, RefreshCw, User, Camera, CameraOff, Calendar, UtensilsCrossed, Clock, LogIn, LogOut, MessageSquare, CheckSquare, Square, ChevronDown, Check, GlassWater, AlertTriangle } from 'lucide-react'

interface SessionOption {
  id: string
  label: string
  date: string
  dayKey: string
}

const SESSION_OPTIONS: SessionOption[] = [
  { id: 'sessions-day1', label: 'Session #1', date: 'June 27th', dayKey: 'sessions.day1' },
  { id: 'sessions-day2', label: 'Session #2', date: 'June 28th', dayKey: 'sessions.day2' },
  { id: 'sessions-day3', label: 'Session #3', date: 'June 29th', dayKey: 'sessions.day3' },
  { id: 'sessions-day4', label: 'Session #4', date: 'June 30th', dayKey: 'sessions.day4' },
  { id: 'performance-day', label: 'Performance Day', date: 'July 1st', dayKey: 'performanceDay' },
  { id: 'opening-ceremony', label: 'Opening', date: 'July 3rd', dayKey: 'openingCeremony' },
  { id: 'conference-day1', label: 'Conference Day #1', date: 'July 4th', dayKey: 'conference.day1' },
  { id: 'conference-day2', label: 'Conference Day #2', date: 'July 5th', dayKey: 'conference.day2' },
  { id: 'conference-day3', label: 'Conference Day #3', date: 'July 6th', dayKey: 'conference.day3' }
]

const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    
    if (type === 'success') {
      // Play a short high-pitch success beep (880Hz, 0.1s)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    } else if (type === 'warning') {
      // Play a double low-pitch warning beep (330Hz, 0.08s x 2)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.frequency.setValueAtTime(330, ctx.currentTime)
      gain1.gain.setValueAtTime(0.15, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start()
      osc1.stop(ctx.currentTime + 0.08)

      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass()
          const osc2 = ctx2.createOscillator()
          const gain2 = ctx2.createGain()
          osc2.frequency.setValueAtTime(330, ctx2.currentTime)
          gain2.gain.setValueAtTime(0.15, ctx2.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.08)
          osc2.connect(gain2)
          gain2.connect(ctx2.destination)
          osc2.start()
          osc2.stop(ctx2.currentTime + 0.08)
        } catch {}
      }, 120)
    } else if (type === 'error') {
      // Play a low buzzer error sound (180Hz, 0.3s)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(180, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch (e) {
    console.error('Audio feedback failed to play:', e)
  }
}

const DAY_ACTIVITIES: Record<string, string[]> = {}

interface ToggleSwitchProps {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ checked, disabled = false, label, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`inline-flex h-6 w-12 flex-shrink-0 items-center rounded-full p-1 transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'
        }`} />
    </button>
  )
}

export default function ScanPage() {
  const [selectedSession, setSelectedSession] = useState<SessionOption | null>(() => {
    const now = new Date()
    const month = now.toLocaleString('en-US', { month: 'long' })
    const day = now.getDate()

    if (month === 'June') {
      if (day === 27) return SESSION_OPTIONS[0]
      if (day === 28) return SESSION_OPTIONS[1]
      if (day === 29) return SESSION_OPTIONS[2]
      if (day === 30) return SESSION_OPTIONS[3]
    } else if (month === 'July') {
      if (day === 1) return SESSION_OPTIONS[4]
      if (day === 3) return SESSION_OPTIONS[5]
      if (day === 4) return SESSION_OPTIONS[6]
      if (day === 5) return SESSION_OPTIONS[7]
      if (day >= 6) return SESSION_OPTIONS[8]
    }
    return SESSION_OPTIONS[0]
  })
  const [scannedId, setScannedId] = useState<string>('')
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<Array<{ id: string; name: string; time: string }>>([])
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isScanModeDropdownOpen, setIsScanModeDropdownOpen] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scanModeDropdownRef = useRef<HTMLDivElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const scanInFlightRef = useRef(false)
  const loadedTrackingKeyRef = useRef<string | null>(null)
  const qrCodeRegionId = 'qr-reader'

  // Activity tracking state
  const [attendance, setAttendance] = useState(false)
  const [breakfast, setBreakfast] = useState(false)
  const [lunch, setLunch] = useState(false)
  const [catering, setCatering] = useState(false)
  const [bar, setBar] = useState(false)
  const [activityStatus, setActivityStatus] = useState<Record<string, boolean>>({})
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null)
  const [busCheckInTime, setBusCheckInTime] = useState<string | null>(null)
  const [busCheckOutTime, setBusCheckOutTime] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [existingComments, setExistingComments] = useState('')
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanMode, setScanMode] = useState<string>('view')
  const [quickScanStatus, setQuickScanStatus] = useState<{ type: 'success' | 'warning' | 'error'; message: string; name?: string } | null>(null)

  useEffect(() => {
    setScanMode('view')
    setQuickScanStatus(null)
  }, [selectedSession])

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => { })
      }
    }
  }, [isScanning])

  // Helper function to get day data from the nested tracking structure
  function getDayDataFromTracking(dayTracking: any, dayKey: string): any {
    if (!dayTracking) return null
    // add
    // Map dayKey to the nested path in tracking structure
    // Backend returns: { sessions: { day1: {...} }, conference: { day1: {...} }, openingCeremony: {...} }
    if (dayKey.startsWith('sessions.')) {
      const dayNum = dayKey.replace('sessions.', '') // e.g., 'day1'
      return dayTracking.sessions?.[dayNum] || null
    } else if (dayKey.startsWith('conference.')) {
      const dayNum = dayKey.replace('conference.', '') // e.g., 'day1'
      return dayTracking.conference?.[dayNum] || null
    } else if (dayKey === 'performanceDay') {
      return dayTracking.performanceDay || null
    } else if (dayKey === 'openingCeremony') {
      return dayTracking.openingCeremony || null
    }
    return null
  }

  // Load tracking data when session changes (if participant is already scanned)
  useEffect(() => {
    const loadSessionData = async () => {
      if (!participant || !selectedSession) return
      const trackingKey = `${participant.id}:${selectedSession.dayKey}`

      if (loadedTrackingKeyRef.current === trackingKey) return

      try {
        setLoading(true)
        const data = await api.getParticipant(participant.id, true)
        loadedTrackingKeyRef.current = trackingKey

        if (data.tracking) {
          const tracking = data.tracking

          // Reset all tracking state first
          setAttendance(false)
          setBreakfast(false)
          setLunch(false)
          setCatering(false)
          setBar(false)
          setActivityStatus({})
          setCheckInTime(null)
          setCheckOutTime(null)
          setBusCheckInTime(null)
          setBusCheckOutTime(null)
          setExistingComments('')
          setComments('')
          setNewComment('')

          // Get day data from nested structure
          const dayData = getDayDataFromTracking(tracking.dayTracking, selectedSession.dayKey)

          // Set attendance status for this session
          if (dayData) {
            setAttendance(dayData.attended || false)
            if (dayData.checkin) setCheckInTime(dayData.checkin)
            if (dayData.checkout) setCheckOutTime(dayData.checkout)
            if (dayData.busCheckIn) setBusCheckInTime(dayData.busCheckIn)
            if (dayData.busCheckOut) setBusCheckOutTime(dayData.busCheckOut)
            // Load existing comments for this session
            if (dayData.comments) {
              setExistingComments(dayData.comments)
              setComments(dayData.comments)
            }
            // Set food from dayData (lunch for sessions, breakfast/lunch for conference)
            if (dayData.lunch) setLunch(true)
            if (dayData.breakfast) setBreakfast(true)
            if (dayData.catering) setCatering(true)
            if (dayData.bar) setBar(true)
          }

          // Set activity status from games history
          if (tracking.games && Array.isArray(tracking.games)) {
            const newActivityStatus: Record<string, boolean> = {}
            tracking.games.forEach((game: any) => {
              const gameDay = game.day || game.metadata?.day
              if (gameDay === selectedSession.dayKey || !gameDay || gameDay === 'current') {
                if (game.action === 'join') {
                  newActivityStatus[game.activity] = true
                } else if (game.action === 'leave') {
                  newActivityStatus[game.activity] = false
                }
              }
            })
            setActivityStatus(newActivityStatus)
          }
        } else {
           // Reset all tracking state if no tracking data
           setAttendance(false)
           setBreakfast(false)
           setLunch(false)
           setCatering(false)
           setBar(false)
           setActivityStatus({})
          setCheckInTime(null)
          setCheckOutTime(null)
          setBusCheckInTime(null)
          setBusCheckOutTime(null)
          setExistingComments('')
          setComments('')
          setNewComment('')
        }
      } catch (err: any) {
        console.error('Failed to load session data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSessionData()
  }, [selectedSession?.dayKey, participant?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scanModeDropdownRef.current && !scanModeDropdownRef.current.contains(event.target as Node)) {
        setIsScanModeDropdownOpen(false)
      }
    }

    if (isScanModeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isScanModeDropdownOpen])

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
          if (scanInFlightRef.current) return
          scanInFlightRef.current = true
          void stopScanning()
          void handleScan(decodedText, true)
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

  const handleScan = async (participantId: string, lockAlreadyHeld = false) => {
    if (!participantId.trim() || !selectedSession) {
      if (lockAlreadyHeld) scanInFlightRef.current = false
      return
    }

    if (!lockAlreadyHeld) {
      if (scanInFlightRef.current) return
      scanInFlightRef.current = true
    }

    // Make case-insensitive - convert to uppercase for search
    const searchId = participantId.trim().toUpperCase()
    const trackingKey = `${searchId}:${selectedSession.dayKey}`

    setLoading(true)
    setError(null)
    setParticipant(null)
    loadedTrackingKeyRef.current = null
    // Reset all tracking state before loading new participant
    setAttendance(false)
    setBreakfast(false)
    setLunch(false)
    setCatering(false)
    setBar(false)
    setActivityStatus({})
    setCheckInTime(null)
    setCheckOutTime(null)
    setBusCheckInTime(null)
    setBusCheckOutTime(null)
    setExistingComments('')
    setComments('')
    setNewComment('')

    try {
      const data = await api.getParticipant(searchId, true)
 
      if (data.participant) {
        // Execute quick-action auto scan check-ins if scanMode is active
        if (scanMode !== 'view') {
          const participantName = data.participant.name
          const dayData = data.tracking ? getDayDataFromTracking(data.tracking.dayTracking, selectedSession.dayKey) : null

          let isAlreadyChecked = false
          let checkMessage = ''

          if (dayData) {
            if (scanMode === 'attendance' && dayData.attended) {
              isAlreadyChecked = true
              checkMessage = `${participantName} is already checked in for attendance in ${selectedSession.label}`
            } else if (scanMode === 'attendance_out' && dayData.checkout) {
              isAlreadyChecked = true
              checkMessage = `${participantName} is already checked out for attendance in ${selectedSession.label}`
            } else if (scanMode === 'catering' && dayData.catering) {
              isAlreadyChecked = true
              checkMessage = `${participantName} has already claimed Catering for ${selectedSession.label}`
            } else if (scanMode === 'bar' && dayData.bar) {
              isAlreadyChecked = true
              checkMessage = `${participantName} has already claimed Bar for ${selectedSession.label}`
            } else if (scanMode === 'breakfast' && dayData.breakfast) {
              isAlreadyChecked = true
              checkMessage = `${participantName} has already claimed Breakfast for ${selectedSession.label}`
            } else if (scanMode === 'lunch' && dayData.lunch) {
              isAlreadyChecked = true
              checkMessage = `${participantName} has already claimed Lunch for ${selectedSession.label}`
            } else if (scanMode === 'bus_in' && dayData.busCheckIn) {
              isAlreadyChecked = true
              checkMessage = `${participantName} is already checked in for Bus in ${selectedSession.label}`
            } else if (scanMode === 'bus_out' && dayData.busCheckOut) {
              isAlreadyChecked = true
              checkMessage = `${participantName} is already checked out for Bus in ${selectedSession.label}`
            }
          }

          if (isAlreadyChecked) {
            playAudioFeedback('warning')
            setQuickScanStatus({ type: 'warning', message: checkMessage, name: participantName })
            // Loop restart scan automatically so operator scanner doesn't freeze
            setTimeout(() => {
              setQuickScanStatus(null)
              if (lockAlreadyHeld) {
                if (scannerRef.current === null) {
                  startScanning().catch(() => {})
                }
              } else {
                setScannedId('')
                if (manualInputRef.current) {
                  manualInputRef.current.focus()
                }
              }
            }, 1800)
          } else {
            try {
              if (scanMode === 'attendance') {
                await api.updateAttendance({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  field: 'attended',
                  value: true,
                  checkIn: true
                })
                setQuickScanStatus({ type: 'success', message: 'Checked In Successfully!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'attendance_out') {
                await api.updateAttendance({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  field: 'attended',
                  value: true,
                  checkOut: true
                })
                setQuickScanStatus({ type: 'success', message: 'Checked Out Successfully!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'catering') {
                await api.updateFood({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  meal: 'catering',
                  value: true
                })
                setQuickScanStatus({ type: 'success', message: 'Catering Logged!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'bar') {
                await api.updateFood({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  meal: 'bar',
                  value: true
                })
                setQuickScanStatus({ type: 'success', message: 'Bar Logged!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'breakfast') {
                await api.updateFood({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  meal: 'breakfast',
                  value: true
                })
                setQuickScanStatus({ type: 'success', message: 'Breakfast Logged!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'lunch') {
                await api.updateFood({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  meal: 'lunch',
                  value: true
                })
                setQuickScanStatus({ type: 'success', message: 'Lunch Logged!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'bus_in') {
                await api.updateBus({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  checkIn: true,
                  value: true
                })
                setQuickScanStatus({ type: 'success', message: 'Bus Check-In Logged!', name: participantName })
                playAudioFeedback('success')
              } else if (scanMode === 'bus_out') {
                await api.updateBus({
                  participantId: searchId,
                  dayKey: selectedSession.dayKey,
                  checkOut: true,
                  value: true
                })
                setQuickScanStatus({ type: 'success', message: 'Bus Check-Out Logged!', name: participantName })
                playAudioFeedback('success')
              }

              // Fetch fresh tracking details to update UI toggles instantly
              const freshData = await api.getParticipant(searchId, true)
              if (freshData.tracking) {
                data.tracking = freshData.tracking
              }
            } catch (actionErr: any) {
              console.error('Quick scan action error:', actionErr)
              playAudioFeedback('error')
              setQuickScanStatus({ 
                type: 'error', 
                message: actionErr.message || 'Action failed!', 
                name: participantName 
              })
              setLoading(false)
              if (lockAlreadyHeld) scanInFlightRef.current = false
              return
            }
          }
        }
        // Normalize field names - PostgreSQL might return lowercase
        const normalizedParticipant = {
          ...data.participant,
          phoneNumber: data.participant.phoneNumber || data.participant.phonenumber || data.participant.phone_number || null,
          committee: data.participant.committee || null,
          role: data.participant.role || null,
          council: data.participant.council || null
        }

        // Determine if this is a delegate:
        // - Delegates have council in position field (like "PRESS", "DISEC", etc.)
        // - Delegates don't have committee
        // - If position matches a known council name and no committee, it's a delegate
        const knownCouncils = ['PRESS', 'DISEC', 'HRC', 'ICJ']
        const hasCouncilInPosition = normalizedParticipant.position && knownCouncils.includes(normalizedParticipant.position.toUpperCase())
        const isDelegate = (normalizedParticipant.council || hasCouncilInPosition) && !normalizedParticipant.committee

        // For delegates: council is in position/council field, role should always be "Delegate"
        if (isDelegate) {
          normalizedParticipant.council = normalizedParticipant.council || normalizedParticipant.position || null
          normalizedParticipant.role = 'Delegate' // Always "Delegate" for delegates
          normalizedParticipant.committee = null // Delegates don't have committees
        } else {
          // For members/invitations: extract role and committee from position if needed
          if (!normalizedParticipant.committee && normalizedParticipant.position) {
            const positionParts = normalizedParticipant.position.split(' - ')
            if (positionParts.length === 2) {
              normalizedParticipant.role = normalizedParticipant.role || positionParts[0].trim()
              normalizedParticipant.committee = normalizedParticipant.committee || positionParts[1].trim()
            } else if (positionParts.length === 1) {
              // Might be just committee name
              normalizedParticipant.committee = normalizedParticipant.committee || positionParts[0].trim()
            }
          }
          normalizedParticipant.council = null // Members/invitations don't have councils
        }

        loadedTrackingKeyRef.current = trackingKey
        setParticipant(normalizedParticipant)
        setScannedId(searchId)

        // Load existing tracking data for this session
        if (data.tracking) {
          const tracking = data.tracking

          // Get day data from nested structure
          const dayData = getDayDataFromTracking(tracking.dayTracking, selectedSession.dayKey)

          // Set attendance status
          if (dayData) {
            setAttendance(dayData.attended || false)
            if (dayData.checkin) setCheckInTime(dayData.checkin)
            if (dayData.checkout) setCheckOutTime(dayData.checkout)
            if (dayData.busCheckIn) setBusCheckInTime(dayData.busCheckIn)
            if (dayData.busCheckOut) setBusCheckOutTime(dayData.busCheckOut)
            // Load existing comments for this session
            if (dayData.comments) {
              setExistingComments(dayData.comments)
              setComments(dayData.comments)
            } else {
              setExistingComments('')
              setComments('')
            }
            // Set food from dayData (lunch for sessions, breakfast/lunch for conference)
             if (dayData.lunch) setLunch(true)
             if (dayData.breakfast) setBreakfast(true)
             if (dayData.catering) setCatering(true)
             if (dayData.bar) setBar(true)
          } else {
            setExistingComments('')
            setComments('')
          }

          // Set activity status from games history
          if (tracking.games && Array.isArray(tracking.games)) {
            const newActivityStatus: Record<string, boolean> = {}
            tracking.games.forEach((game: any) => {
              const gameDay = game.day || game.metadata?.day
              if (gameDay === selectedSession.dayKey || !gameDay || gameDay === 'current') {
                if (game.action === 'join') {
                  newActivityStatus[game.activity] = true
                } else if (game.action === 'leave') {
                  newActivityStatus[game.activity] = false
                }
              }
            })
            setActivityStatus(newActivityStatus)
          }
        } else {
           // Reset activity tracking state if no tracking data
           setAttendance(false)
           setBreakfast(false)
           setLunch(false)
           setCatering(false)
           setBar(false)
          setActivityStatus({})
          setCheckInTime(null)
          setCheckOutTime(null)
          setBusCheckInTime(null)
          setBusCheckOutTime(null)
          setComments('')
          setExistingComments('')
          setNewComment('')
        }

        // Add to scan history
        setScanHistory(prev => [
          { id: searchId, name: data.participant.name, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9) // Keep last 10 scans
        ])

        // If we did a quick scan action, setup the auto-restart or focus loop
        if (scanMode !== 'view') {
          setTimeout(() => {
            setQuickScanStatus(null)
            if (lockAlreadyHeld) {
              if (scannerRef.current === null) {
                startScanning().catch(() => {})
              }
            } else {
              setScannedId('')
              if (manualInputRef.current) {
                manualInputRef.current.focus()
              }
            }
          }, 1500)
        }
      } else {
        setError('Participant not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch participant')
      // If error occurs, show quickScanStatus as error
      playAudioFeedback('error')
      setQuickScanStatus({ type: 'error', message: err.message || 'Failed to scan participant' })
      setParticipant(null)
    } finally {
      setLoading(false)
      scanInFlightRef.current = false
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
    loadedTrackingKeyRef.current = null
    setError(null)
    setAttendance(false)
    setBreakfast(false)
    setLunch(false)
    setActivityStatus({})
    setCheckInTime(null)
    setCheckOutTime(null)
    setBusCheckInTime(null)
    setBusCheckOutTime(null)
    setComments('')
    setExistingComments('')
    setNewComment('')
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
      // Checkout does NOT mean absent - they were present and are now leaving
      // We keep attendance as true, just record the checkout time
      await api.updateAttendance({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        field: 'attended',
        value: true, // Keep attendance as true - they were present, just checking out
        checkOut: true
      })
      setCheckOutTime(timestamp)
      // Don't change attendance state - they're still marked as present
    } catch (err: any) {
      alert(`Failed to check out: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleBusCheckIn = async (value: boolean) => {
    if (!participant || !selectedSession) return

    try {
      setSaving(true)
      const timestamp = new Date().toISOString()
      await api.updateBus({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        checkIn: true,
        value
      })
      setBusCheckInTime(value ? timestamp : null)
      if (!value) {
        setBusCheckOutTime(null)
      }
    } catch (err: any) {
      alert(`Failed to update bus check-in: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleBusCheckOut = async (value: boolean) => {
    if (!participant || !selectedSession) return

    try {
      setSaving(true)
      const timestamp = new Date().toISOString()
      await api.updateBus({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        checkOut: true,
        value
      })
      setBusCheckOutTime(value ? timestamp : null)
    } catch (err: any) {
      alert(`Failed to update bus check-out: ${err.message}`)
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

  const handleToggleBar = async (value: boolean) => {
    if (!participant || !selectedSession) return

    try {
      setSaving(true)
      await api.updateFood({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        meal: 'bar',
        value
      })
      setBar(value)
    } catch (err: any) {
      alert(`Failed to update bar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivity = async (activityName: string, value: boolean) => {
    if (!participant || !selectedSession) return

    try {
      setSaving(true)
      await api.updateGame({
        participantId: participant.id,
        activity: activityName,
        day: selectedSession.dayKey,
        action: value ? 'join' : 'leave'
      })
      setActivityStatus(prev => ({ ...prev, [activityName]: value }))
    } catch (err: any) {
      alert(`Failed to update activity: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveComments = async () => {
    if (!participant || !selectedSession || !newComment.trim()) return

    try {
      setSaving(true)
      await api.updateComments({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        comments: newComment
      })

      // Update existing comments display with the new comment appended
      const updatedComments = existingComments
        ? `${existingComments}, '${newComment.trim()}'`
        : `'${newComment.trim()}'`
      setExistingComments(updatedComments)
      setComments(updatedComments)
      setNewComment('') // Clear the new comment input
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
      'performanceDay': 'performance',
      'openingCeremony': 'opening_ceremony',
      'conference.day1': 'conf_day1',
      'conference.day2': 'conf_day2',
      'conference.day3': 'conf_day3'
    }
    return mapping[dayKey] || null
  }

  const getAvailableScanModes = () => {
    if (!selectedSession) return []
    const dayKey = selectedSession.dayKey
    const modes = [
      { value: 'view', label: 'Manual / View Details' }
    ]

    // Attendance Check-in is available for all sessions except performance day
    if (dayKey !== 'performanceDay') {
      modes.push({ value: 'attendance', label: 'Auto Attendance Check-in' })
      modes.push({ value: 'attendance_out', label: 'Auto Attendance Check-out' })
    }

    if (dayKey === 'openingCeremony') {
      modes.push({ value: 'catering', label: 'Auto Catering Checkout' })
      modes.push({ value: 'bar', label: 'Auto Bar Checkout' })
    }

    if (dayKey.startsWith('conference.')) {
      modes.push({ value: 'breakfast', label: 'Auto Breakfast Checkout' })
      modes.push({ value: 'lunch', label: 'Auto Lunch Checkout' })
    } else if (dayKey.startsWith('sessions.')) {
      modes.push({ value: 'lunch', label: 'Auto Lunch Checkout' })
    }

    // Bus is available for all sessions
    modes.push({ value: 'bus_in', label: 'Auto Bus Check-in' })
    modes.push({ value: 'bus_out', label: 'Auto Bus Check-out' })

    return modes
  }

  const activeMode = getAvailableScanModes().find(m => m.value === scanMode) || { value: 'view', label: 'Manual / View Details' }

  return (
    <div className="jn-page">
      <div className="jn-shell">
        <div className="max-w-4xl mx-auto w-full overflow-x-hidden">
          <div className="mb-6 sm:mb-8 relative">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2">QR Code Scanner</h1>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg">Select a session, then scan QR code or enter participant ID</p>
          </div>

          {/* Session Selection */}
          <div className="card mb-4 sm:mb-6 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-[var(--color-primary-blue)]" />
                  <h2 className="text-lg sm:text-xl font-black">Select Session</h2>
                </div>
                <div className="w-full relative" ref={dropdownRef}>
                  {/* Custom Dropdown Button */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--jn-blue)] bg-white hover:border-[var(--jn-pink)] focus:border-[var(--jn-blue)] focus:ring-2 focus:ring-blue-100 transition-all duration-200 flex items-center justify-between text-left shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectedSession ? (
                        <>
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{selectedSession.label}</div>
                            <div className="text-sm text-gray-500">{selectedSession.date}</div>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500 font-medium">Select a session...</span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''
                        }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-[var(--jn-blue)] rounded-3xl shadow-xl overflow-hidden dropdown-menu">
                      <div className="max-h-80 overflow-y-auto scrollbar-hide">
                        {SESSION_OPTIONS.map((session) => {
                          const isSelected = selectedSession?.id === session.id
                          const isSessions = session.dayKey.startsWith('sessions.')
                          const isConference = session.dayKey.startsWith('conference.')
                          const isPerformance = session.dayKey === 'performanceDay'
                          const isOpening = session.dayKey === 'openingCeremony'

                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => {
                                setSelectedSession(session)
                                setIsDropdownOpen(false)
                              }}
                              className={`w-full px-4 py-3.5 text-left hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${isSessions ? 'bg-purple-500' :
                                    isConference ? 'bg-indigo-500' :
                                      isPerformance ? 'bg-yellow-500' :
                                      isOpening ? 'bg-orange-500' : 'bg-gray-400'
                                    }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'
                                      }`}>
                                      {session.label}
                                    </div>
                                    <div className={`text-sm mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-500'
                                      }`}>
                                      {session.date}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scan Mode Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-[var(--color-primary-blue)]" />
                  <h2 className="text-lg sm:text-xl font-black">Scan Mode</h2>
                </div>
                <div className="w-full relative" ref={scanModeDropdownRef}>
                  {/* Custom Dropdown Button */}
                  <button
                    type="button"
                    disabled={!selectedSession}
                    onClick={() => setIsScanModeDropdownOpen(!isScanModeDropdownOpen)}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-[var(--jn-blue)] bg-white hover:border-[var(--jn-pink)] focus:border-[var(--jn-blue)] focus:ring-2 focus:ring-blue-100 transition-all duration-200 flex items-center justify-between text-left shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectedSession ? (
                        <>
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{activeMode.label}</div>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500 font-medium">Select a session first...</span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isScanModeDropdownOpen ? 'transform rotate-180' : ''
                        }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isScanModeDropdownOpen && selectedSession && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-[var(--jn-blue)] rounded-3xl shadow-xl overflow-hidden dropdown-menu">
                      <div className="max-h-80 overflow-y-auto scrollbar-hide">
                        {getAvailableScanModes().map((mode) => {
                          const isSelected = scanMode === mode.value

                          return (
                            <button
                              key={mode.value}
                              type="button"
                              onClick={() => {
                                setScanMode(mode.value)
                                setIsScanModeDropdownOpen(false)
                              }}
                              className={`w-full px-4 py-3.5 text-left hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'
                                    }`}>
                                    {mode.label}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
            {quickScanStatus && (
              <div className={`mb-4 p-4 rounded-2xl border-2 shadow-lg flex items-center justify-between transition-all duration-300 animate-pulse ${
                quickScanStatus.type === 'success'
                  ? 'bg-green-50 border-green-500 text-green-800'
                  : quickScanStatus.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                  : 'bg-red-50 border-red-500 text-red-800'
              }`}>
                <div className="flex items-center gap-3">
                  {quickScanStatus.type === 'success' ? (
                    <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                  ) : quickScanStatus.type === 'warning' ? (
                    <AlertTriangle className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{quickScanStatus.message}</h3>
                    {quickScanStatus.name && (
                      <p className="text-sm opacity-90 font-medium">Participant: {quickScanStatus.name}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
              <h2 className="text-lg sm:text-xl font-black">Camera Scanner</h2>
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
                    ref={manualInputRef}
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
                    <h2 className="text-xl sm:text-2xl font-bold break-words">{participant.name}</h2>
                    {participant.role && (
                      <p className="text-gray-600 text-sm sm:text-base break-words mt-1">
                        {participant.role}
                      </p>
                    )}
                    {(participant.committee || participant.council) && (
                      <p className="text-gray-600 text-sm sm:text-base break-words">
                        {participant.council || participant.committee}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Session: {selectedSession.label} ({selectedSession.date})
                    </p>
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-4 sm:mt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">ID</p>
                  <p className="font-semibold">{participant.id}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <p className="font-semibold break-all text-sm">
                    {participant.phoneNumber && participant.phoneNumber.trim() !== ''
                      ? participant.phoneNumber
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">
                    {participant.council ? 'Council' : 'Committee'}
                  </p>
                  <p className="font-semibold break-words text-sm" title={participant.council || participant.committee || 'N/A'}>
                    {participant.council || participant.committee || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Role</p>
                  <p className="font-semibold break-words text-sm" title={participant.role || 'N/A'}>
                    {participant.role || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="font-semibold text-green-600">Active</p>
                </div>
              </div>



              {/* Activity Tracking */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold mb-4">Activity Tracking</h3>

                {/* Check-in/Check-out */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={handleCheckIn}
                    disabled={saving || attendance || !!checkOutTime}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:text-white disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    <LogIn className="w-4 h-4" />
                    Check In
                  </button>
                  <button
                    onClick={handleCheckOut}
                    disabled={saving || !attendance || !!checkOutTime}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:text-white disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    <LogOut className="w-4 h-4" />
                    {checkOutTime ? 'Checked Out' : 'Check Out'}
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

                {/* Bus Check-in/Check-out */}
                <h4 className="text-md font-semibold mt-4 mb-2">Bus Tracking</h4>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <LogIn className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Bus Check In</span>
                    </div>
                    <ToggleSwitch
                      checked={!!busCheckInTime}
                      disabled={saving}
                      label="Toggle bus check in"
                      onChange={handleToggleBusCheckIn}
                    />
                  </label>

                  <label className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-colors ${busCheckInTime ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-60'
                    }`}>
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-indigo-500" />
                      <span className="font-medium">Bus Check Out</span>
                    </div>
                    <ToggleSwitch
                      checked={!!busCheckOutTime}
                      disabled={saving || !busCheckInTime}
                      label="Toggle bus check out"
                      onChange={handleToggleBusCheckOut}
                    />
                  </label>
                </div>

                {busCheckInTime && (
                  <div className="mb-3 text-sm text-gray-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Bus Check-in: {new Date(busCheckInTime).toLocaleString()}
                  </div>
                )}
                {busCheckOutTime && (
                  <div className="mb-3 text-sm text-gray-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Bus Check-out: {new Date(busCheckOutTime).toLocaleString()}
                  </div>
                )}

                {/* Activity Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Attendance</span>
                    </div>
                    <ToggleSwitch
                      checked={attendance}
                      disabled={saving}
                      label="Toggle attendance"
                      onChange={handleToggleAttendance}
                    />
                  </label>

                  {/* Show breakfast only for conference days */}
                  {selectedSession && selectedSession.dayKey.startsWith('conference.') && (
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                        <span className="font-medium">Breakfast</span>
                      </div>
                      <ToggleSwitch
                        checked={breakfast}
                        disabled={saving}
                        label="Toggle breakfast"
                        onChange={handleToggleBreakfast}
                      />
                    </label>
                  )}

                  {/* Show lunch for sessions and conference days */}
                  {selectedSession && (selectedSession.dayKey.startsWith('sessions.') || selectedSession.dayKey.startsWith('conference.')) && (
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                        <span className="font-medium">Lunch</span>
                      </div>
                      <ToggleSwitch
                        checked={lunch}
                        disabled={saving}
                        label="Toggle lunch"
                        onChange={handleToggleLunch}
                      />
                    </label>
                  )}

                  {/* Show catering and bar for opening ceremony */}
                  {selectedSession && selectedSession.dayKey === 'openingCeremony' && (
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                          <span className="font-medium">Catering</span>
                        </div>
                        <ToggleSwitch
                          checked={catering}
                          disabled={saving}
                          label="Toggle catering"
                          onChange={handleToggleCatering}
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <GlassWater className="w-5 h-5 text-blue-500" />
                          <span className="font-medium">Bar</span>
                        </div>
                        <ToggleSwitch
                          checked={bar}
                          disabled={saving}
                          label="Toggle bar"
                          onChange={handleToggleBar}
                        />
                      </label>
                    </div>
                  )}

                  {selectedSession && DAY_ACTIVITIES[selectedSession.dayKey] ? (
                    DAY_ACTIVITIES[selectedSession.dayKey].map((activityName) => (
                      <label key={activityName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckSquare className="w-5 h-5 text-purple-500" />
                          <span className="font-medium">{activityName}</span>
                        </div>
                        <ToggleSwitch
                          checked={!!activityStatus[activityName]}
                          disabled={saving}
                          label={`Toggle ${activityName}`}
                          onChange={(value) => handleToggleActivity(activityName, value)}
                        />
                      </label>
                    ))
                  ) : (
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-purple-500" />
                        <span className="font-medium">Activity</span>
                      </div>
                      <ToggleSwitch
                        checked={!!activityStatus['Activity']}
                        disabled={saving}
                        label="Toggle activity"
                        onChange={(value) => handleToggleActivity('Activity', value)}
                      />
                    </label>
                  )}
                </div>

                {/* Comments */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </label>

                  {/* Display existing comments */}
                  {existingComments && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Existing comments:</p>
                      <p className="text-sm text-gray-700 break-words">{existingComments}</p>
                    </div>
                  )}

                  {/* Input for new comment */}
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a new comment..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base resize-none"
                  />
                  <button
                    onClick={handleSaveComments}
                    disabled={saving}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 disabled:cursor-wait disabled:opacity-80 transition-colors text-sm sm:text-base"
                  >
                    {saving ? 'Saving...' : 'Add Comment'}
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
    </div >
  )
}
