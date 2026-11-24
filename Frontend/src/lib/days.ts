import { TZ, serverNow } from './clock'

/**
 * The four OC '27 days, with one set of names used on every page.
 * Session keys match the API (day1, day2, day3, conf_day1); dayKeys match
 * the scanner's activity log (sessions.day1 ... conference.day1).
 * Display only: nothing here changes which day a scan is saved to.
 */
export interface DayMeta {
  key: string
  dayKey: string
  /** "Session Day One" */
  name: string
  /** "Day One" */
  short: string
  /** "Tue 24 Nov" */
  date: string
  /** YYYY-MM-DD, Cairo */
  iso: string
}

export const DAYS: DayMeta[] = [
  { key: 'day1', dayKey: 'sessions.day1', name: 'Session Day One', short: 'Day One', date: 'Tue 24 Nov', iso: '2026-11-24' },
  { key: 'day2', dayKey: 'sessions.day2', name: 'Session Day Two', short: 'Day Two', date: 'Wed 25 Nov', iso: '2026-11-25' },
  { key: 'day3', dayKey: 'sessions.day3', name: 'Session Day Three', short: 'Day Three', date: 'Thu 26 Nov', iso: '2026-11-26' },
  { key: 'conf_day1', dayKey: 'conference.day1', name: 'Conference Day', short: 'Conference', date: 'Fri 27 Nov', iso: '2026-11-27' },
]

const byKey = new Map(DAYS.flatMap((d) => [[d.key, d], [d.dayKey, d]] as [string, DayMeta][]))

/** Day info from a session key or scanner dayKey. */
export const dayMeta = (key?: string | null): DayMeta | null => (key ? byKey.get(key) ?? null : null)
/** "Session Day Two" for a key; falls back to the key itself. */
export const dayName = (key?: string | null, fallback?: string) => dayMeta(key)?.name ?? fallback ?? key ?? ''
/** "Session Day Two · Wed 25 Nov" */
export const dayFull = (key?: string | null, fallback?: string) => {
  const d = dayMeta(key)
  return d ? `${d.name} · ${d.date}` : fallback ?? key ?? ''
}

/** Today's date in Cairo (server clock), YYYY-MM-DD. */
export function cairoIso(d: Date = serverNow()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export type DayStatus = 'past' | 'today' | 'upcoming'
export function dayStatus(key: string, today: string = cairoIso()): DayStatus {
  const d = dayMeta(key)
  if (!d) return 'past'
  return d.iso < today ? 'past' : d.iso === today ? 'today' : 'upcoming'
}

/** Word for people with no check-in, by day status. */
export const missingWord = (s: DayStatus) => (s === 'today' ? 'Not in yet' : s === 'past' ? 'Absent' : 'Not started')

/**
 * One time format everywhere, in Cairo time: "14:05" for today,
 * "24 Nov, 14:05" for other days.
 */
export function fmtWhen(iso?: string | Date | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  if (cairoIso(d) === cairoIso()) return time
  return `${d.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' })}, ${time}`
}

/** "just now", "4 min ago", "2 h ago" from the server clock. */
export function ago(iso?: string | Date | null) {
  if (!iso) return ''
  const mins = Math.floor((serverNow().getTime() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h ago`
  return fmtWhen(iso)
}

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
