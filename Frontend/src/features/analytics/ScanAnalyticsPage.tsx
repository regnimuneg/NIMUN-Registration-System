import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Download, Search, UserX, UserCheck, Utensils, History, Undo2, LogOut, Hand, Loader2 } from 'lucide-react'
import { api, ApiError, tokenManager } from '../../lib/api'
import { serverNow, fmtTime, fmtStamp, todayDayKey, LiveClock } from '../../lib/clock'
import MemberLookup from './MemberLookup'

interface SessionStat {
  key: string
  label: string
  date?: string
  attended: number
  checkedIn: number
  checkedOut: number
  meals: Record<string, number>
}

interface Person {
  id: string
  name: string
  council: string | null
  committee: string | null
  attended: boolean
  checkIn: string | null
  checkOut: string | null
  food?: boolean
  manual?: boolean
  checkedInBy?: string | null
  kind?: 'member' | 'delegate'
}

interface ScanAnalytics {
  scope: { council: string | null; locked: boolean }
  /** This account may check people in by hand (admins, Secretariats) */
  canManual?: boolean
  /** Cairo date on the server, YYYY-MM-DD */
  today?: string
  councils: string[]
  total: number
  sessions: SessionStat[]
  session?: string
  meals?: string[]
  people?: Person[]
}

interface LogEntry {
  id: string
  name: string
  council: string | null
  type: 'attendance' | 'food'
  value: boolean
  checkOut?: boolean
  dayKey: string | null
  scannedBy: string | null
  scannedByName: string | null
  manual?: boolean
  at: string
}

const POLL_MS = 2_000          // quick change check
const FULL_REFRESH_MS = 30_000  // full reload even without changes
const DAY_LABELS: Record<string, string> = {
  'sessions.day1': 'Session Day One',
  'sessions.day2': 'Session Day Two',
  'sessions.day3': 'Session Day Three',
  'conference.day1': 'Conference Day',
}
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const clock = (iso: string | null) => (iso ? fmtTime(iso) : '—')
const stamp = (iso: string) => fmtStamp(iso)
const scanKind = (r: { type: string; checkOut?: boolean }) => (r.type === 'food' ? 'Food' : r.checkOut ? 'Check-out' : 'Check-in')

const todayKey = todayDayKey

/** CSV that Excel and Google Sheets open directly (UTF-8 with BOM). */
function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || from.current === value) { setShown(value); from.current = value; return }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 500)
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown}</>
}

export default function ScanAnalyticsPage() {
  const user = tokenManager.getUser()
  const isAdmin = tokenManager.getUserRole() === 'admin'
  const [data, setData] = useState<ScanAnalytics | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [council, setCouncil] = useState('')
  const [sessionKey, setSessionKey] = useState(() => todayKey() ?? 'day1')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [filter, setFilter] = useState<'missing' | 'in' | 'all'>('missing')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [openPerson, setOpenPerson] = useState<string | null>(null)
  const clearOpenPerson = useCallback(() => setOpenPerson(null), [])
  const [marking, setMarking] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  const load = useCallback(async () => {
    try {
      setError(null)
      const [result, logRes] = await Promise.all([
        api.getScanAnalytics({ council: council || undefined, session: sessionKey }),
        api.getScanLog({ council: council || undefined, limit: 60 }),
      ])
      setData(result)
      setLog(logRes.entries ?? [])
      setUpdatedAt(serverNow())
    } catch (e: any) {
      setError(e?.message || 'Could not load the live board')
    } finally {
      setLoading(false)
    }
  }, [council, sessionKey])

  // Near-instant updates: check a tiny change marker every 2 seconds and reload
  // the board only when a scan, undo or clear happened (plus a full reload every 30s).
  const versionRef = useRef<string | null>(null)
  const lastFullRef = useRef(0)
  useEffect(() => {
    let stopped = false
    let busy = false
    versionRef.current = null
    const tick = async (force = false) => {
      if (busy || stopped || (document.hidden && !force)) return
      busy = true
      try {
        const v = await api.getScanVersion(council || undefined).catch(() => null)
        const changed = !!v?.version && v.version !== versionRef.current
        if (force || changed || Date.now() - lastFullRef.current > FULL_REFRESH_MS) {
          if (v?.version) versionRef.current = v.version
          lastFullRef.current = Date.now()
          await load()
        }
      } finally { busy = false }
    }
    void tick(true)
    const t = setInterval(() => void tick(), POLL_MS)
    const onVisible = () => { if (!document.hidden) void tick(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stopped = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [load, council])

  const selected = useMemo(() => data?.sessions.find((s) => s.key === sessionKey) ?? null, [data, sessionKey])
  const allPeople = data?.people ?? []
  const isIn = (p: Person) => p.attended || !!p.checkIn
  const people = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allPeople
      .filter((p) => (filter === 'in' ? isIn(p) : filter === 'missing' ? !isIn(p) : true))
      .filter((p) => !q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.committee ?? '').toLowerCase().includes(q))
  }, [allPeople, filter, search])

  // Per-council progress, from the people list
  const byCouncil = useMemo(() => {
    const m = new Map<string, { total: number; present: number; food: number }>()
    for (const p of allPeople) {
      const k = p.council ?? 'Other'
      const v = m.get(k) ?? { total: 0, present: 0, food: 0 }
      v.total++
      if (isIn(p)) v.present++
      if (p.food) v.food++
      m.set(k, v)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [allPeople])

  const total = data?.total ?? 0
  const present = allPeople.filter(isIn).length
  const missing = Math.max(0, total - present)
  const hasFood = (data?.meals ?? []).includes('food')
  const fed = allPeople.filter((p) => p.food).length
  const left = allPeople.filter((p) => !!p.checkOut).length
  // Manual check-in: admins and Secretariats, on today or a day that has passed
  const canManualDay = !!data?.canManual && !!selected && (!selected.date || !data?.today || selected.date <= data.today)

  const markPresent = async (p: Person) => {
    if (!selected || marking) return
    setMarking(p.id)
    setNotice(null)
    try {
      await api.manualCheckIn({ id: p.id, session: selected.key, action: 'checkin' })
      setNotice({ ok: true, text: `${p.name} (${p.id}) marked present by hand for ${selected.label}.` })
    } catch (e: any) {
      const already = e instanceof ApiError && e.status === 409
      setNotice({ ok: already, text: already ? `${p.name} (${p.id}) is already marked present.` : `${p.name}: ${e?.message || 'could not mark present'}` })
    } finally {
      setMarking(null)
      void load()
    }
  }

  const exportDay = () => {
    if (!selected) return
    const rows: (string | boolean | null)[][] = [['ID', 'Name', 'Council', 'Committee', 'Present', 'Scanned at', 'Checked in how', 'Checked in by', 'Checked out at', ...(hasFood ? ['Food'] : [])]]
    for (const p of allPeople) rows.push([p.id, p.name, p.council, p.committee, isIn(p), p.checkIn ? stamp(p.checkIn) : '', isIn(p) ? (p.manual ? 'Manual' : 'QR scan') : '', isIn(p) ? (p.checkedInBy ?? '') : '', p.checkOut ? stamp(p.checkOut) : '', ...(hasFood ? [!!p.food] : [])])
    downloadCsv(`oc27-${selected.key}-${(data?.scope.council ?? 'all').toLowerCase()}.csv`, rows)
  }

  const exportAll = async () => {
    setExporting(true)
    try {
      const res = await api.getScanExport(council || undefined)
      const sessions: { key: string; label: string; meals: string[] }[] = res.sessions
      const header = ['ID', 'First name', 'Last name', 'Council', 'Committee']
      for (const s of sessions) {
        header.push(`${s.label} present`, `${s.label} scanned at`, `${s.label} checked in how`, `${s.label} checked in by`, `${s.label} checked out at`)
        for (const m of s.meals) header.push(`${s.label} ${m}`)
      }
      const rows: unknown[][] = [header]
      for (const p of res.people) {
        const r: unknown[] = [p.id, p.firstName, p.lastName, p.council, p.committee]
        for (const s of sessions) {
          const present = p[`${s.key}.attended`] || !!p[`${s.key}.checkIn`]
          r.push(
            present,
            p[`${s.key}.checkIn`] ? stamp(p[`${s.key}.checkIn`]) : '',
            present ? (p[`${s.key}.inManual`] ? 'Manual' : 'QR scan') : '',
            present ? (p[`${s.key}.inBy`] ?? '') : '',
            p[`${s.key}.checkOut`] ? stamp(p[`${s.key}.checkOut`]) : '',
          )
          for (const m of s.meals) r.push(!!p[`${s.key}.${m}`])
        }
        rows.push(r)
      }
      downloadCsv(`oc27-all-days-${(res.scope.council ?? 'all').toLowerCase()}.csv`, rows as any)
    } catch (e: any) {
      setError(e?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="jn-shell">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => <div key={i} className="oc-skeleton h-28" />)}
        </div>
        <div className="oc-skeleton h-72" />
      </div>
    )
  }

  const scopeLabel = data?.scope.council ?? 'All councils'

  return (
    <div className="jn-shell">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] mb-2">
            <span className="oc-live-dot" aria-hidden="true" /> Live · <LiveClock />
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold">Live Board</h1>
          <p className="text-gray-600 mt-3 text-sm">
            {scopeLabel}
            {user?.name ? ` · ${user.name}` : ''}
            {updatedAt ? ` · updated ${fmtTime(updatedAt, true)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {data && !data.scope.locked && (
            <select value={council} onChange={(e) => setCouncil(e.target.value)} className="px-3 py-2 flex-1 sm:flex-none" aria-label="Council">
              <option value="">All councils</option>
              {data.councils.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={exportDay} className="btn-secondary flex items-center gap-2 px-3 py-2 flex-1 sm:flex-none justify-center">
            <Download className="w-4 h-4" /> This day
          </button>
          <button onClick={() => void exportAll()} disabled={exporting} className="btn-secondary flex items-center gap-2 px-3 py-2 flex-1 sm:flex-none justify-center">
            <Download className="w-4 h-4" /> {exporting ? 'Preparing…' : 'All days'}
          </button>
          <button onClick={() => void load()} className="btn-primary flex items-center gap-2 px-4 py-2 justify-center" aria-label="Refresh now">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Day">
        {data?.sessions.map((s) => (
          <button key={s.key} className="oc-tab" aria-pressed={s.key === sessionKey} onClick={() => setSessionKey(s.key)}>
            {s.label}{s.key === todayKey() ? ' · today' : ''}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 border border-red-700 bg-red-50 text-red-800 px-4 py-3">{error}</div>}

      {data && selected && (
        <>
          <MemberLookup council={council || undefined} openId={openPerson} onOpened={clearOpenPerson} refreshKey={updatedAt?.getTime()} onChanged={load} />

          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 oc-stagger">
            <div className="card !p-4 flex items-center gap-4 col-span-2 lg:col-span-1">
              <div className="oc-ring" style={{ ['--p' as any]: pct(present, total) }}>
                <div><span className="oc-big-number !text-2xl">{pct(present, total)}%</span></div>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-gray-600">Present</p>
                <p className="text-sm mt-1">{selected.label}</p>
              </div>
            </div>
            <div className="card !p-4">
              <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Scanned in</p>
              <p className="oc-big-number mt-2 text-[var(--oc-blue)]"><AnimatedNumber value={present} /></p>
              <p className="text-xs text-gray-500 mt-1">of {total}</p>
              <p className="text-xs text-[#6b21a8] mt-1 flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> {left} checked out · {Math.max(0, present - left)} still here</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><UserX className="w-4 h-4" /> Not yet</p>
              <p className="oc-big-number mt-2"><AnimatedNumber value={missing} /></p>
              <p className="text-xs text-gray-500 mt-1">still to scan</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><Utensils className="w-4 h-4" /> Food</p>
              <p className="oc-big-number mt-2 text-[#c2410c]">{hasFood ? <AnimatedNumber value={fed} /> : '—'}</p>
              <p className="text-xs text-gray-500 mt-1">{hasFood ? `of ${total}` : 'Conference Day only'}</p>
            </div>
          </div>

          {/* Council progress */}
          {byCouncil.length > 1 && (
            <div className="card !p-4 sm:!p-5 mb-6">
              <h2 className="text-lg mb-4">By council</h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {byCouncil.map(([name, v]) => (
                  <button key={name} className="text-left group" onClick={() => !data.scope.locked && setCouncil(name)} title={`Show only ${name}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold group-hover:underline">{name}</span>
                      <span className="tabular-nums">{v.present} / {v.total} · {pct(v.present, v.total)}%</span>
                    </div>
                    <div className="oc-bar"><span style={{ width: `${pct(v.present, v.total)}%` }} /></div>
                    {hasFood && (
                      <div className="oc-bar is-food mt-1" title="Food"><span style={{ width: `${pct(v.food, v.total)}%` }} /></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* People / not yet scanned */}
            <div className="card !p-4 sm:!p-5 lg:col-span-2 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-lg">{filter === 'missing' ? 'Not yet scanned' : filter === 'in' ? 'Scanned in' : 'Everyone'} · {selected.label}</h2>
                <div className="flex gap-1">
                  {(['missing', 'in', 'all'] as const).map((f) => (
                    <button key={f} className="oc-tab" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === 'missing' ? `Not yet (${missing})` : f === 'in' ? `In (${present})` : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              {canManualDay && filter === 'missing' && (
                <p className="text-xs text-gray-600 mb-2 flex items-center gap-1"><Hand className="w-3.5 h-3.5" /> No QR? Tap <b>Mark present</b> to check someone in by hand. It is logged with your name.</p>
              )}
              {notice && (
                <div className={`mb-3 border px-3 py-2 text-sm ${notice.ok ? 'border-[#0f5c38] bg-[#eaf6ef] text-[#0f5c38]' : 'border-red-700 bg-red-50 text-red-800'}`} role="status">{notice.text}</div>
              )}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID or committee" className="w-full pl-9 pr-3 py-2 text-sm" />
              </div>
              <div className="overflow-x-auto max-h-[30rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#faf6f0]">
                    <tr className="text-left border-b border-black">
                      <th className="py-2 pr-2">ID</th>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2 hidden sm:table-cell">Committee</th>
                      <th className="py-2 px-2">In</th>
                      <th className="py-2 px-2">Out</th>
                      {hasFood && <th className="py-2 pl-2">Food</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.id} className="border-b border-black/10 last:border-0 cursor-pointer hover:bg-[#f3ead9]" onClick={() => setOpenPerson(p.id)} title="Show this person's analytics">
                        <td className="py-2 pr-2 whitespace-nowrap font-bold">{p.id}</td>
                        <td className="py-2 px-2">{p.name}</td>
                        <td className="py-2 px-2 hidden sm:table-cell text-gray-600">{p.committee ?? '—'}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {isIn(p) ? (
                            <span className="text-[#0f5c38] font-bold">
                              {p.checkIn ? clock(p.checkIn) : 'Yes'}
                              {p.manual && <span className="ml-1 text-[10px] uppercase tracking-wider font-bold text-[#7a4b00] border border-[#7a4b00] px-1" title={`Checked in by hand${p.checkedInBy ? ` by ${p.checkedInBy}` : ''}`}>manual</span>}
                            </span>
                          ) : canManualDay && p.kind !== 'delegate' ? (
                            <button
                              type="button"
                              className="btn-secondary !px-2 !py-1 text-xs flex items-center gap-1 whitespace-nowrap"
                              disabled={!!marking}
                              onClick={(e) => { e.stopPropagation(); void markPresent(p) }}
                              title="Check this person in without their QR"
                            >
                              {marking === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hand className="w-3.5 h-3.5" />} Mark present
                            </button>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {p.checkOut ? <span className="text-[#6b21a8] font-bold">{clock(p.checkOut)}</span> : <span className="text-gray-400">—</span>}
                        </td>
                        {hasFood && <td className="py-2 pl-2">{p.food ? <span className="text-[#c2410c] font-bold">Yes</span> : <span className="text-gray-400">—</span>}</td>}
                      </tr>
                    ))}
                    {people.length === 0 && (
                      <tr><td colSpan={6} className="py-10 text-center text-gray-500">{filter === 'missing' && !search ? 'Everyone is scanned in.' : 'No one matches.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scan log */}
            <div className="card !p-4 sm:!p-5 min-w-0">
              <h2 className="text-lg mb-3 flex items-center gap-2"><History className="w-5 h-5" /> Scan log</h2>
              {log.length === 0 ? (
                <p className="text-gray-500 text-sm">No scans yet.</p>
              ) : (
                <ul className="max-h-[34rem] overflow-y-auto divide-y divide-black/10">
                  {log.map((r, i) => (
                    <li key={`${r.id}-${r.at}-${i}`} className="py-2.5 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold truncate">{r.name}</span>
                        <span className="text-gray-500 whitespace-nowrap tabular-nums">{stamp(r.at)}</span>
                      </div>
                      <p className="text-gray-700 truncate flex items-center gap-1">
                        {!r.value && <Undo2 className="w-3.5 h-3.5 text-[#7a4b00]" />}
                        {r.value && r.checkOut && <LogOut className="w-3.5 h-3.5 text-[#6b21a8]" />}
                        <span>{r.id} · {scanKind(r)}{r.manual ? ' (manual)' : ''}{r.dayKey ? ` · ${DAY_LABELS[r.dayKey] ?? r.dayKey}` : ''}{!r.value ? ' · undone' : ''}</span>
                      </p>
                      <p className="text-xs text-gray-500">{r.manual ? 'by hand, by' : 'by'} {r.scannedByName ?? r.scannedBy ?? 'unknown'}</p>
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin && <p className="text-xs text-gray-500 mt-3">To undo a scan, tap Undo in the scanner right after it, or switch off Attendance, Check-out or Food in Manual / View Details.</p>}
              {data.canManual && <p className="text-xs text-gray-500 mt-3">To undo a check-in or check-out, open the person (Find a member or tap their row) and use the buttons on that day.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
