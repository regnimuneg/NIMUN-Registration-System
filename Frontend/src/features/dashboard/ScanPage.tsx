import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { api, ApiError, tokenManager } from '../../lib/api'
import { serverNow, fmtTime, todayDayKey, cairoDate, useClockSync, LiveClock } from '../../lib/clock'
import { PageHeader } from '../../components/ui'
import { QrCode, Search, CheckCircle, XCircle, RefreshCw, User, Camera, CameraOff, Calendar, UtensilsCrossed, Clock, LogIn, LogOut, MessageSquare, CheckSquare, Square, ChevronDown, Check, GlassWater, AlertTriangle, Undo2, WifiOff, CloudUpload, Loader2 } from 'lucide-react'

interface SessionOption {
  id: string
  label: string
  date: string
  dayKey: string
}

// OC Conference '27 days (24-27 November 2026)
const SESSION_OPTIONS: SessionOption[] = [
  { id: 'sessions-day1', label: 'Session Day One', date: 'Tue 24 Nov', dayKey: 'sessions.day1' },
  { id: 'sessions-day2', label: 'Session Day Two', date: 'Wed 25 Nov', dayKey: 'sessions.day2' },
  { id: 'sessions-day3', label: 'Session Day Three', date: 'Thu 26 Nov', dayKey: 'sessions.day3' },
  { id: 'conference-day1', label: 'Conference Day', date: 'Fri 27 Nov', dayKey: 'conference.day1' }
]

// One shared AudioContext. Phones start it muted until a tap, so it is
// unlocked on the first touch/click (e.g. Start Camera) and then camera
// scans can beep too. Creating a new context per beep also stops working
// after a few dozen scans in Chrome.
let sharedAudio: AudioContext | null = null
function audioCtx(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return null
    if (!sharedAudio) sharedAudio = new AudioContextClass()
    if (sharedAudio.state === 'suspended') void sharedAudio.resume().catch(() => {})
    return sharedAudio
  } catch {
    return null
  }
}
const unlockAudio = () => { audioCtx() }

function beep(ctx: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(vol, start)
  gain.gain.exponentialRampToValueAtTime(0.01, start + dur)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur)
}

const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
  try {
    const ctx = audioCtx()
    if (!ctx) return
    const t = ctx.currentTime
    if (type === 'success') {
      beep(ctx, 880, t, 0.1, 0.1) // short high beep
    } else if (type === 'warning') {
      beep(ctx, 330, t, 0.08, 0.15) // double low beep
      beep(ctx, 330, t + 0.12, 0.08, 0.15)
    } else {
      beep(ctx, 180, t, 0.3, 0.1, 'sawtooth') // low buzzer
    }
  } catch (e) {
    console.error('Audio feedback failed to play:', e)
  }
}

/**
 * Tidy a typed ID so desks can type fast: "prs1", "PRS 1" and "prs-1" all
 * become "PRS-01". Anything else (staff IDs, QR contents) is only trimmed
 * and upper-cased, as before.
 */
export function normalizeId(raw: string): string {
  const code = raw.trim().toUpperCase()
  const m = code.match(/^([A-Z]{3})[\s-]*(\d{1,2})$/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : code
}

// Phones and tablets: don't pop the keyboard up over the camera after each scan
const isTouchDevice = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
const CAMERA_PREF_KEY = 'oc27_camera_on'
const MODE_PREF_KEY = 'oc27_scan_mode'
const SCAN_TIMEOUT_MS = 8000

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

// ---------- '27 quick scan helpers: offline queue ----------
type QuickMode = 'attendance' | 'checkout' | 'lunch'
interface QueuedScan { id: string; dayKey: string; mode: QuickMode; value: boolean; at: string }
const QUEUE_KEY = 'oc27_scan_queue'
function readQueue(): QueuedScan[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}
function writeQueue(q: QueuedScan[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch { /* storage full or blocked */ }
}
// live = a scan at the desk right now: one request that checks and saves, with a
// time limit so bad Wi-Fi falls back to the offline queue instead of hanging.
// Queued replays are sent exactly as before.
function sendScan(item: QueuedScan, live = false) {
  const timeout = live ? SCAN_TIMEOUT_MS : undefined
  if (item.mode === 'attendance') {
    return api.updateAttendance({
      participantId: item.id, dayKey: item.dayKey, field: 'attended', value: item.value,
      ...(item.value ? { checkIn: true } : {}), ...(live && item.value ? { rejectIfPresent: true } : {}), scannedAt: item.at,
    }, timeout)
  }
  if (item.mode === 'checkout') {
    // value false = undo the check-out (attendance itself stays)
    return api.updateAttendance({
      participantId: item.id, dayKey: item.dayKey, field: 'attended', value: item.value, checkOut: true, scannedAt: item.at,
    }, timeout)
  }
  return api.updateFood({ participantId: item.id, dayKey: item.dayKey, meal: 'lunch', value: item.value, scannedAt: item.at }, timeout)
}
const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern) } catch { /* not supported */ } }
const timeOf = (iso?: string | null) => fmtTime(iso)
const modeLabel = (m: QuickMode) => (m === 'lunch' ? 'Food' : m === 'checkout' ? 'Check-out' : 'Attendance')

function sessionForToday(): SessionOption {
  const key = todayDayKey()
  if (key === 'day2') return SESSION_OPTIONS[1]
  if (key === 'day3') return SESSION_OPTIONS[2]
  if (key === 'conf_day1') return SESSION_OPTIONS[3]
  const { month, day } = cairoDate()
  if (month === 11 && day > 27) return SESSION_OPTIONS[3]
  return SESSION_OPTIONS[0]
}

export default function ScanPage() {
  const [selectedSession, setSelectedSession] = useState<SessionOption | null>(sessionForToday)
  // When the server clock arrives, move to the server's day unless someone already picked one
  const sessionPickedRef = useRef(false)
  const clockOffset = useClockSync()
  useEffect(() => { if (!sessionPickedRef.current) setSelectedSession(sessionForToday()) }, [clockOffset])
  const [scannedId, setScannedId] = useState<string>('')
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<Array<{ id: string; name: string; time: string }>>([])
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const scanInFlightRef = useRef(false)
  const cameraStartingRef = useRef(false)
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
  const [scanMode, setScanMode] = useState<string>('attendance')
  const deskName: string = tokenManager.getUser()?.name ?? ''
  const [quickScanStatus, setQuickScanStatus] = useState<{ type: 'success' | 'warning' | 'error' | 'queued' | 'duplicate' | 'pending'; message: string; name?: string; detail?: string } | null>(null)
  // '27 quick scan: last action (for undo), offline queue, camera de-bounce
  const [lastAction, setLastAction] = useState<(QueuedScan & { name: string }) | null>(null)
  const [pendingCount, setPendingCount] = useState(() => readQueue().length)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [syncing, setSyncing] = useState(false)
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const statusTimerRef = useRef<number | null>(null)

  // Keep the desk's mode (e.g. Food) for the day across page reloads,
  // otherwise start each day on Attendance
  useEffect(() => {
    let saved: { dayKey?: string; mode?: string } = {}
    try { saved = JSON.parse(localStorage.getItem(MODE_PREF_KEY) || '{}') } catch { /* ignore */ }
    const ok = saved.dayKey === selectedSession?.dayKey && getAvailableScanModes().some(m => m.value === saved.mode)
    setScanMode(ok && saved.mode ? saved.mode : 'attendance')
    setQuickScanStatus(null)
  }, [selectedSession])

  const chooseScanMode = (mode: string) => {
    setScanMode(mode)
    setQuickScanStatus(null)
    try { localStorage.setItem(MODE_PREF_KEY, JSON.stringify({ dayKey: selectedSession?.dayKey, mode })) } catch { /* storage blocked */ }
    // Typing desks: straight back to the ID box
    if (!isTouchDevice()) window.setTimeout(() => manualInputRef.current?.focus(), 0)
  }

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


  // auto: reopening the page with the camera left on last time
  const startScanning = async (auto = false) => {
    if (scannerRef.current || cameraStartingRef.current) return
    cameraStartingRef.current = true
    unlockAudio()
    try {
      setCameraError(null)
      const html5QrCode = new Html5Qrcode(qrCodeRegionId, {
        verbose: false,
        // Only look for QR codes (not every barcode type), and use the phone's
        // built-in fast detector where the browser has one (Android Chrome)
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      })
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 15,
          // Scan box sized to the screen (most of the view), so less aiming
          qrbox: (w: number, h: number) => {
            const side = Math.max(160, Math.floor(Math.min(w, h) * 0.8))
            return { width: side, height: side }
          },
          // QR codes on phones/paper are never mirrored: skip the second, flipped pass
          disableFlip: true,
        },
        (decodedText) => {
          if (scanInFlightRef.current) return
          const code = decodedText.trim().toUpperCase()
          const now = Date.now()
          // Ignore the same code held in front of the camera for a few seconds
          if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < 4000) return
          lastCodeRef.current = { code, at: now }
          scanInFlightRef.current = true
          if (scanModeRef.current !== 'view') {
            // Quick modes keep the camera running for the next person
            void quickScanRef.current(code).finally(() => { scanInFlightRef.current = false })
            return
          }
          void stopScanning()
          void handleScan(decodedText, true)
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent while scanning)
        }
      )
      setIsScanning(true)
      try { localStorage.setItem(CAMERA_PREF_KEY, '1') } catch { /* storage blocked */ }
    } catch (err: any) {
      scannerRef.current = null
      // A failed automatic start just leaves the Start Camera button there
      if (!auto) setCameraError(err?.message || String(err || '') || 'Failed to start camera')
      setIsScanning(false)
    } finally {
      cameraStartingRef.current = false
    }
  }

  // userAction: the Stop Camera button, so next time the camera stays off
  const stopScanning = async (userAction = false) => {
    if (userAction === true) {
      try { localStorage.removeItem(CAMERA_PREF_KEY) } catch { /* storage blocked */ }
    }
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

  // Show a status, then clear it after a moment (longer for problems)
  const showStatus = (st: NonNullable<typeof quickScanStatus>, ms = 2200) => {
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
    setQuickScanStatus(st)
    if (st.type !== 'pending') {
      statusTimerRef.current = window.setTimeout(() => setQuickScanStatus(null), ms)
    }
  }

  const enqueue = (item: QueuedScan) => {
    const q = [...readQueue(), item]
    writeQueue(q)
    setPendingCount(q.length)
  }

  const syncQueue = async () => {
    if (syncing) return
    let q = readQueue()
    if (q.length === 0) return
    setSyncing(true)
    try {
      while (q.length > 0) {
        try {
          await sendScan(q[0])
        } catch (e: any) {
          if (e instanceof ApiError && e.network) break // still offline: try later
          // 409 duplicate or other refusal: drop it, the server already has the truth
        }
        q = q.slice(1)
        writeQueue(q)
        setPendingCount(q.length)
      }
    } finally {
      setSyncing(false)
    }
  }
  const startScanningRef = useRef(startScanning)
  startScanningRef.current = startScanning
  const syncRef = useRef(syncQueue)
  syncRef.current = syncQueue

  useEffect(() => {
    const on = () => { setIsOnline(true); void syncRef.current() }
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const t = window.setInterval(() => { if (readQueue().length) void syncRef.current() }, 15000)
    // Camera was on last time: start it again without a tap
    let camPref = false
    try { camPref = localStorage.getItem(CAMERA_PREF_KEY) === '1' } catch { /* storage blocked */ }
    if (camPref) void startScanningRef.current(true)
    void syncRef.current()
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.clearInterval(t) }
  }, [])

  const quickScan = async (rawCode: string, fromKeyboard = false) => {
    if (!selectedSession) return
    const code = normalizeId(rawCode)
    if (!code) return
    const mode: QuickMode = scanMode === 'lunch' ? 'lunch' : scanMode === 'checkout' ? 'checkout' : 'attendance'
    const item: QueuedScan = { id: code, dayKey: selectedSession.dayKey, mode, value: true, at: serverNow().toISOString() }
    const what = modeLabel(mode)
    showStatus({ type: 'pending', message: 'Checking…', name: code })
    // The typed box is free for the next ID straight away
    setScannedId('')
    try {
      // One request: the server checks (already scanned, not checked in, inactive,
      // unknown ID) and saves in the same call, and sends the name back
      const res: any = await sendScan(item, true)
      const name = res?.name || code
      playAudioFeedback('success'); buzz(40)
      showStatus({ type: 'success', message: mode === 'lunch' ? 'Food logged' : mode === 'checkout' ? 'Checked out' : 'Marked present', name, detail: `${code} · ${selectedSession.label}` })
      setLastAction({ ...item, name })
      setScanHistory(prev => [{ id: code, name: `${name} · ${what}`, time: fmtTime(serverNow(), true) }, ...prev.slice(0, 19)])
    } catch (e: any) {
      const who = e instanceof ApiError && e.data?.name && e.data.name !== code ? `${e.data.name} · ${code}` : code
      if (e instanceof ApiError && e.network) {
        enqueue(item)
        playAudioFeedback('success'); buzz([30, 40, 30])
        showStatus({ type: 'queued', message: 'Saved offline', name: code, detail: 'It will sync when the connection is back' }, 2600)
        setScanHistory(prev => [{ id: code, name: `${code} · ${what} (offline)`, time: fmtTime(serverNow(), true) }, ...prev.slice(0, 19)])
      } else if (e instanceof ApiError && e.status === 409 && e.data?.alreadyPresent) {
        playAudioFeedback('warning'); buzz([60, 60, 60])
        showStatus({ type: 'warning', message: 'Already marked present', name: e.data.name || code, detail: `${code}${e.data.checkedInAt ? ` · scanned at ${timeOf(e.data.checkedInAt)}` : ''}` }, 3200)
      } else if (e instanceof ApiError && e.status === 409 && e.data?.notCheckedIn) {
        playAudioFeedback('error'); buzz([200, 80, 200])
        showStatus({ type: 'error', message: 'Not checked in today', name: who, detail: 'Scan them in with Attendance first. No check-out saved.' }, 4500)
      } else if (e instanceof ApiError && e.status === 409 && e.data?.duplicate && mode === 'checkout') {
        playAudioFeedback('warning'); buzz([60, 60, 60])
        showStatus({ type: 'warning', message: 'Already checked out', name: who, detail: e.data.checkedOutAt ? `Checked out at ${timeOf(e.data.checkedOutAt)}` : undefined }, 4000)
      } else if (e instanceof ApiError && e.status === 409 && e.data?.duplicate) {
        playAudioFeedback('error'); buzz([200, 80, 200])
        showStatus({ type: 'duplicate', message: 'Already got food', name: who, detail: e.data.claimedAt ? `First claimed at ${timeOf(e.data.claimedAt)}. Do not serve again.` : 'Do not serve again.' }, 4500)
      } else if (e instanceof ApiError && e.data?.inactive) {
        playAudioFeedback('error'); buzz([200, 80, 200])
        showStatus({ type: 'error', message: 'Inactive: do not admit', name: code, detail: 'This person was removed from the OC list' }, 4000)
      } else if (e instanceof ApiError && e.status === 404) {
        playAudioFeedback('error'); buzz([200, 80, 200])
        showStatus({ type: 'error', message: 'Unknown QR code', name: code, detail: 'No one has this ID' }, 3500)
      } else {
        playAudioFeedback('error')
        showStatus({ type: 'error', message: e?.message || 'Scan failed', name: code }, 3500)
      }
    } finally {
      // Typed IDs and desktop keyboards/USB scanners: ready for the next one.
      // Phones scanning by camera: leave the keyboard down.
      if (fromKeyboard || !isTouchDevice()) manualInputRef.current?.focus()
    }
  }
  const quickScanRef = useRef(quickScan)
  quickScanRef.current = quickScan
  const scanModeRef = useRef(scanMode)
  scanModeRef.current = scanMode

  const undoLast = async () => {
    if (!lastAction) return
    const item: QueuedScan = { ...lastAction, value: false, at: serverNow().toISOString() }
    setLastAction(null)
    try {
      await sendScan(item)
      playAudioFeedback('warning')
      showStatus({ type: 'warning', message: 'Scan undone', name: lastAction.name, detail: `${lastAction.id} · ${modeLabel(lastAction.mode)} removed` })
    } catch (e: any) {
      if (e instanceof ApiError && e.network) {
        enqueue(item)
        showStatus({ type: 'queued', message: 'Undo saved offline', name: lastAction.name })
      } else {
        showStatus({ type: 'error', message: e?.message || 'Undo failed', name: lastAction.name }, 3500)
      }
    }
  }

  const handleScan = async (participantId: string, lockAlreadyHeld = false) => {
    if (scanMode !== 'view') {
      // Typed / keyboard-wedge entry. Don't block it while the camera is busy.
      try { await quickScan(participantId, !lockAlreadyHeld) } finally { if (lockAlreadyHeld) scanInFlightRef.current = false }
      return
    }
    if (!participantId.trim() || !selectedSession) {
      if (lockAlreadyHeld) scanInFlightRef.current = false
      return
    }

    if (!lockAlreadyHeld) {
      if (scanInFlightRef.current) return
      scanInFlightRef.current = true
    }

    // Make case-insensitive - convert to uppercase for search ("prs1" -> "PRS-01")
    const searchId = normalizeId(participantId)
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
              checkMessage = `${participantName} has already claimed Food for ${selectedSession.label}`
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
                setQuickScanStatus({ type: 'success', message: 'Food Logged!', name: participantName })
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
          { id: searchId, name: data.participant.name, time: fmtTime(serverNow(), true) },
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
    if (e.key === 'Enter' && scannedId.trim()) {
      e.preventDefault()
      void handleScan(scannedId)
    }
  }

  // Laptops / USB scanners: the ID box is ready to type into on arrival
  useEffect(() => {
    if (!isTouchDevice()) manualInputRef.current?.focus()
  }, [])

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
      const timestamp = serverNow().toISOString()
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

  // Manual / View Details: switch check-out on (record now) or off (undo it)
  const handleToggleCheckOut = async (value: boolean) => {
    if (!participant || !selectedSession) return
    if (value && !attendance && !checkInTime) {
      alert('Not checked in today. Switch on Attendance first.')
      return
    }
    try {
      setSaving(true)
      await api.updateAttendance({
        participantId: participant.id,
        dayKey: selectedSession.dayKey,
        field: 'attended',
        value,
        checkOut: true
      })
      setCheckOutTime(value ? serverNow().toISOString() : null)
    } catch (err: any) {
      alert(`Failed to update check-out: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCheckOut = async () => {
    if (!participant || !selectedSession) return

    try {
      setSaving(true)
      const timestamp = serverNow().toISOString()
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
      const timestamp = serverNow().toISOString()
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
      const timestamp = serverNow().toISOString()
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
        setCheckInTime(serverNow().toISOString())
      }
      if (!value) {
        // switching attendance off also clears that day's check-in and check-out
        setCheckInTime(null)
        setCheckOutTime(null)
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

  // '27: every day has one attendance scan. Conference Day also has a food scan
  // (stored as that day's lunch). Manual / View Details stays for lookups.
  const getAvailableScanModes = () => {
    if (!selectedSession) return []
    const modes = [
      { value: 'attendance', label: 'Attendance' },
      { value: 'checkout', label: 'Check-out' }
    ]
    if (selectedSession.dayKey.startsWith('conference.')) {
      modes.push({ value: 'lunch', label: 'Food' })
    }
    modes.push({ value: 'view', label: 'Manual / View Details' })
    return modes
  }


  return (
    <div className="jn-page">
      <div className="jn-shell">
        <div className="max-w-4xl mx-auto w-full overflow-x-hidden">
          <PageHeader
            eyebrow={<><span className={`oc-live-dot${isOnline ? '' : ' is-off'}`} aria-hidden="true" />{isOnline ? 'Online' : 'Offline · scans saved on this phone'} · <LiveClock /></>}
            title="Scanner"
            meta={<>
              {selectedSession ? <>Scanning <b>{selectedSession.label}</b> · {selectedSession.date} · <b>{getAvailableScanModes().find((m) => m.value === scanMode)?.label ?? scanMode}</b></> : 'Pick the day and mode, then scan a QR code or type an ID.'}
              {deskName ? <> · {deskName}</> : null}
            </>}
          />

          {/* Session Selection */}
          <div className="card mb-4 sm:mb-6 relative z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-[var(--color-primary-blue)]" />
                  <h2 className="text-lg sm:text-xl font-black">Day</h2>
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
                                sessionPickedRef.current = true; setSelectedSession(session)
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
                {/* One tap to switch: no dropdown */}
                <div className="oc-mode-row" role="radiogroup" aria-label="Scan mode">
                  {getAvailableScanModes().map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      role="radio"
                      aria-checked={scanMode === mode.value}
                      disabled={!selectedSession}
                      onClick={() => chooseScanMode(mode.value)}
                      className={`oc-mode-btn oc-mode-${mode.value} ${scanMode === mode.value ? 'is-active' : ''}`}
                    >
                      {mode.value === 'attendance' ? <LogIn className="w-4 h-4" />
                        : mode.value === 'checkout' ? <LogOut className="w-4 h-4" />
                        : mode.value === 'lunch' ? <UtensilsCrossed className="w-4 h-4" />
                        : <Search className="w-4 h-4" />}
                      <span>{mode.value === 'view' ? 'Manual' : mode.label}</span>
                    </button>
                  ))}
                </div>
                {scanMode === 'view' && (
                  <p className="mt-2 text-xs text-gray-600">Manual / View Details: shows the person's details. Nothing is recorded until you switch something on.</p>
                )}
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
            {/* Connection + offline queue */}
            {(!isOnline || pendingCount > 0) && (
              <div className={`oc-offline-bar ${isOnline ? 'is-syncing' : ''}`} role="status">
                {isOnline ? <CloudUpload className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="flex-1">
                  {isOnline
                    ? `${pendingCount} offline scan${pendingCount === 1 ? '' : 's'} waiting to sync`
                    : `Offline. Scans are saved on this phone${pendingCount ? ` (${pendingCount} waiting)` : ''}`}
                </span>
                {isOnline && pendingCount > 0 && (
                  <button type="button" onClick={() => void syncQueue()} disabled={syncing} className="oc-chip-btn">
                    {syncing ? 'Syncing…' : 'Sync now'}
                  </button>
                )}
              </div>
            )}

            {/* Scan result: big, colour-coded, readable at arm's length */}
            <div className="oc-scan-result-slot" aria-live="assertive">
              {quickScanStatus && (
                <div key={`${quickScanStatus.type}-${quickScanStatus.name}-${quickScanStatus.message}`} className={`oc-scan-result oc-scan-${quickScanStatus.type}`}>
                  <div className="oc-scan-icon">
                    {quickScanStatus.type === 'success' ? <CheckCircle className="w-9 h-9" />
                      : quickScanStatus.type === 'pending' ? <Loader2 className="w-9 h-9 oc-spin" />
                      : quickScanStatus.type === 'queued' ? <CloudUpload className="w-9 h-9" />
                      : quickScanStatus.type === 'warning' ? <AlertTriangle className="w-9 h-9" />
                      : <XCircle className="w-9 h-9" />}
                  </div>
                  <div className="min-w-0">
                    <p className="oc-scan-title">{quickScanStatus.message}</p>
                    {quickScanStatus.name && <p className="oc-scan-name">{quickScanStatus.name}</p>}
                    {quickScanStatus.detail && <p className="oc-scan-detail">{quickScanStatus.detail}</p>}
                  </div>
                </div>
              )}
            </div>

            {lastAction && (
              <div className="oc-last-action">
                <span className="truncate">
                  Last: <strong>{lastAction.name}</strong> · {modeLabel(lastAction.mode)}
                </span>
                <button type="button" onClick={() => void undoLast()} className="oc-chip-btn">
                  <Undo2 className="w-4 h-4" /> Undo
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
              <h2 className="text-lg sm:text-xl font-black">Camera Scanner</h2>
              {!isScanning ? (
                <button
                  onClick={() => void startScanning()}
                  disabled={!selectedSession}
                  className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4" />
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={() => void stopScanning(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  <CameraOff className="w-4 h-4" />
                  Stop Camera
                </button>
              )}
            </div>

            {/* Frame turns green / amber / red with the result, so the desk sees it while aiming */}
            <div className={`oc-cam-frame w-full max-w-md mx-auto ${isScanning ? 'is-on' : ''} ${quickScanStatus ? `oc-cam-${quickScanStatus.type}` : ''}`}>
              <div id={qrCodeRegionId} className="w-full" />
            </div>

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
                    onKeyDown={handleKeyPress}
                    placeholder="Type an ID, e.g. PRS-01 or prs1"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    enterKeyHint="go"
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
                      {scanMode === 'view' ? <Search className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      {scanMode === 'view' ? 'Search' : 'Record'}
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
                {tokenManager.getUserRole() === 'admin' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <p className="font-semibold break-all text-sm">
                    {participant.phoneNumber && participant.phoneNumber.trim() !== ''
                      ? participant.phoneNumber
                      : 'N/A'}
                  </p>
                </div>
                )}
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

                {/* Activity Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Attendance</span>
                      {attendance && checkInTime && <span className="text-xs text-gray-500">in at {timeOf(checkInTime)}</span>}
                    </div>
                    <ToggleSwitch
                      checked={attendance}
                      disabled={saving}
                      label="Toggle attendance"
                      onChange={handleToggleAttendance}
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Check-out</span>
                      {checkOutTime && <span className="text-xs text-gray-500">left at {timeOf(checkOutTime)}</span>}
                    </div>
                    <ToggleSwitch
                      checked={!!checkOutTime}
                      disabled={saving || (!attendance && !checkInTime && !checkOutTime)}
                      label="Toggle check-out"
                      onChange={handleToggleCheckOut}
                    />
                  </label>

                  {/* '27: one food scan on Conference Day (stored as lunch) */}
                  {selectedSession && selectedSession.dayKey.startsWith('conference.') && (
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                        <span className="font-medium">Food</span>
                      </div>
                      <ToggleSwitch
                        checked={lunch}
                        disabled={saving}
                        label="Toggle food"
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
