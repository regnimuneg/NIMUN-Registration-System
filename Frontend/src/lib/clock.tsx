import { useEffect, useState } from 'react'
import { API_BASE_URL } from './api'

/**
 * Server clock. Every phone uses the server's time (shown in Cairo time), so
 * the active day and scan times agree even when a phone's own clock is wrong.
 */
export const TZ = 'Africa/Cairo'
const KEY = 'oc27_clock_offset'
let offset = (() => { try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 } })()
let synced = false
const listeners = new Set<() => void>()

export const serverNow = () => new Date(Date.now() + offset)
export const isClockSynced = () => synced

export async function syncClock(): Promise<void> {
  try {
    const t0 = Date.now()
    const r = await fetch(`${API_BASE_URL}/api/time`, { cache: 'no-store' })
    const t1 = Date.now()
    const { ms } = await r.json()
    if (typeof ms !== 'number') return
    offset = Math.round(ms - (t0 + t1) / 2)
    synced = true
    try { localStorage.setItem(KEY, String(offset)) } catch { /* private mode */ }
    listeners.forEach((f) => f())
  } catch { /* offline: keep the last known offset */ }
}

/** Month (1-12) and day in Cairo, from the server clock. */
export function cairoDate(d: Date = serverNow()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'numeric', day: 'numeric' }).formatToParts(d)
  return { month: Number(parts.find((p) => p.type === 'month')?.value), day: Number(parts.find((p) => p.type === 'day')?.value) }
}

/** Today's conference day key from the server clock (24-27 Nov, Cairo), else null. */
export function todayDayKey(): string | null {
  const { month, day } = cairoDate()
  if (month !== 11) return null
  return ({ 24: 'day1', 25: 'day2', 26: 'day3', 27: 'conf_day1' } as Record<number, string>)[day] ?? null
}

export const fmtTime = (iso?: string | Date | null, seconds = false) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) }) : ''
export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Re-renders when the clock syncs; returns the offset. */
export function useClockSync() {
  const [, set] = useState(0)
  useEffect(() => {
    const f = () => set((n) => n + 1)
    listeners.add(f)
    return () => { listeners.delete(f) }
  }, [])
  return offset
}

/** Live Cairo time from the server clock, ticking every second. */
export function LiveClock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(serverNow())
  useClockSync()
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className={`oc-live-clock ${className}`} title="Server time (Cairo)">{fmtTime(now, true)} Cairo</span>
}

// Sync now, again every 5 minutes, and when the phone comes back online or to the foreground
if (typeof window !== 'undefined') {
  void syncClock()
  setInterval(() => void syncClock(), 5 * 60_000)
  window.addEventListener('online', () => void syncClock())
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void syncClock() })
}
