import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Download, Search, UserX, UserCheck, Utensils, History, Undo2, LogOut, Hand, Loader2, DoorOpen, CalendarClock, PartyPopper } from 'lucide-react'
import { api, ApiError, tokenManager } from '../../lib/api'
import { serverNow, fmtTime, fmtStamp, todayDayKey, LiveClock } from '../../lib/clock'
import { dayMeta, dayStatus, missingWord, fmtWhen, ago, pct, cairoIso } from '../../lib/days'
import { downloadCsv } from '../../lib/csv'
import { PageHeader, DayTabs, StatTile, StatGrid, Panel, Summary, Ring, ProgressRow, Notice, EmptyState, Badge, LoadingPage } from '../../components/ui'
import type { Attention } from '../../components/ui'
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
  outManual?: boolean
  checkedOutBy?: string | null
  kind?: 'member' | 'delegate'
}

interface ScanAnalytics {
  scope: { council: string | null; team?: string | null; locked: boolean }
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
const stamp = (iso: string) => fmtStamp(iso)
const scanKind = (r: { type: string; checkOut?: boolean }) => (r.type === 'food' ? 'Food' : r.checkOut ? 'Check-out' : 'Check-in')

const todayKey = todayDayKey

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

  const markPresent = (p: Person) => markManual(p, 'checkin')
  const markCheckedOut = (p: Person) => markManual(p, 'checkout')
  const markManual = async (p: Person, action: 'checkin' | 'checkout') => {
    if (!selected || marking) return
    setMarking(`${p.id}:${action}`)
    setNotice(null)
    try {
      await api.manualCheckIn({ id: p.id, session: selected.key, action })
      setNotice({ ok: true, text: `${p.name} (${p.id}) ${action === 'checkin' ? 'marked present' : 'checked out'} by hand for ${dayMeta(selected.key)?.name ?? selected.label}.` })
    } catch (e: any) {
      const conflict = e instanceof ApiError && e.status === 409
      const msg = !conflict ? `${p.name}: ${e?.message || 'could not save'}`
        : e.data?.notCheckedIn ? `${p.name} (${p.id}) is not checked in on this day.`
        : action === 'checkin' ? `${p.name} (${p.id}) is already marked present.` : `${p.name} (${p.id}) is already checked out.`
      setNotice({ ok: conflict && !e.data?.notCheckedIn, text: msg })
    } finally {
      setMarking(null)
      void load()
    }
  }

  const exportDay = () => {
    if (!selected) return
    const rows: (string | boolean | null)[][] = [['ID', 'Name', 'Council', 'Committee', 'Present', 'Scanned at', 'Checked in how', 'Checked in by', 'Checked out at', 'Checked out how', 'Checked out by', ...(hasFood ? ['Food'] : [])]]
    for (const p of allPeople) rows.push([p.id, p.name, p.council, p.committee, isIn(p), p.checkIn ? stamp(p.checkIn) : '', isIn(p) ? (p.manual ? 'Manual' : 'QR scan') : '', isIn(p) ? (p.checkedInBy ?? '') : '', p.checkOut ? stamp(p.checkOut) : '', p.checkOut ? (p.outManual ? 'Manual' : 'QR scan') : '', p.checkOut ? (p.checkedOutBy ?? '') : '', ...(hasFood ? [!!p.food] : [])])
    downloadCsv(`oc27-${selected.key}-${(data?.scope.team ?? data?.scope.council ?? 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, rows)
  }

  const exportAll = async () => {
    setExporting(true)
    try {
      const res = await api.getScanExport(council || undefined)
      const sessions: { key: string; label: string; meals: string[] }[] = res.sessions
      const header = ['ID', 'First name', 'Last name', 'Council', 'Committee']
      for (const s of sessions) {
        header.push(`${s.label} present`, `${s.label} scanned at`, `${s.label} checked in how`, `${s.label} checked in by`, `${s.label} checked out at`, `${s.label} checked out how`, `${s.label} checked out by`)
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
            p[`${s.key}.checkOut`] ? (p[`${s.key}.outManual`] ? 'Manual' : 'QR scan') : '',
            p[`${s.key}.checkOut`] ? (p[`${s.key}.outBy`] ?? '') : '',
          )
          for (const m of s.meals) r.push(!!p[`${s.key}.${m}`])
        }
        rows.push(r)
      }
      downloadCsv(`oc27-all-days-${(res.scope.team ?? res.scope.council ?? 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, rows as any)
    } catch (e: any) {
      setError(e?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }


  if (loading && !data) return <LoadingPage tiles={4} />

  const scopeLabel = data?.scope.team ? `${data.scope.team} team` : data?.scope.council ?? 'All councils'
  const today = data?.today ?? cairoIso()
  const meta = selected ? dayMeta(selected.key) : null
  const status = selected ? dayStatus(selected.key, today) : 'today'
  const missWord = missingWord(status)
  const stillHere = Math.max(0, present - left)
  const byHand = allPeople.filter((p) => isIn(p) && p.manual).length
  const dayLog = meta ? log.filter((r) => r.dayKey === meta.dayKey && r.value) : []
  const lastScan = dayLog[0]?.at ?? null
  const lastScanMins = lastScan ? (serverNow().getTime() - new Date(lastScan).getTime()) / 60_000 : null

  // What needs attention on this day
  const attention: Attention[] = []
  if (selected && status !== 'upcoming') {
    const ranked = byCouncil.map(([name, v]) => ({ name, ...v, p: pct(v.present, v.total) })).sort((a, b) => a.p - b.p)
    const overall = pct(present, total)
    if (ranked.length > 1 && present > 0 && ranked[0].p < overall - 10) {
      attention.push({ tone: 'warn', text: <>Lowest council: <b>{ranked[0].name}</b>, {ranked[0].present} of {ranked[0].total} in ({ranked[0].p}%).</> })
    }
    if (status === 'today' && present === 0) attention.push({ tone: 'info', text: 'No one has been scanned in yet today.' })
    else if (status === 'today' && lastScanMins !== null && lastScanMins > 30 && missing > 0) {
      attention.push({ tone: 'warn', text: <>No scans for {ago(lastScan)}: last at {fmtTime(lastScan)}. Is every desk open?</> })
    }
    if (byHand > 0) attention.push({ tone: 'info', text: <>{byHand} checked in by hand (no QR) on this day.</> })
    if (hasFood && present > 0 && fed < present) attention.push({ tone: 'info', text: <>{present - fed} people who are in have not had food yet.</> })
    if (total > 0 && missing === 0) attention.push({ tone: 'good', text: 'Everyone is in.' })
  }

  const headline = !selected || !meta ? null
    : status === 'upcoming' ? <>{meta.name} is on <b>{meta.date}</b>. Nothing to show until it starts.</>
    : status === 'today' ? <><b>{present} of {total}</b> are in today ({pct(present, total)}%). <b>{stillHere}</b> still here, <b>{missing}</b> not in yet.</>
    : <><b>{present} of {total}</b> came on {meta.name} ({pct(present, total)}%). <b>{missing}</b> absent.</>

  return (
    <div className="jn-shell">
      <PageHeader
        eyebrow={<><span className="oc-live-dot" aria-hidden="true" /> Live · <LiveClock /></>}
        title="Live Board"
        meta={<>{scopeLabel}{user?.name ? ` · ${user.name}` : ''}{updatedAt ? ` · updated ${fmtTime(updatedAt, true)}` : ''}</>}
        actions={<>
          {data && !data.scope.locked && (
            <select value={council} onChange={(e) => setCouncil(e.target.value)} className="px-3 py-2" aria-label="Council">
              <option value="">All councils</option>
              {data.councils.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={exportDay} className="btn-secondary flex items-center gap-2 px-3 py-2" title="Download this day as a spreadsheet">
            <Download className="w-4 h-4" /> This day
          </button>
          <button onClick={() => void exportAll()} disabled={exporting} className="btn-secondary flex items-center gap-2 px-3 py-2" title="Download all four days as a spreadsheet">
            <Download className="w-4 h-4" /> {exporting ? 'Preparing…' : 'All days'}
          </button>
          <button onClick={() => void load()} className="btn-primary flex items-center gap-2 px-4 py-2" aria-label="Refresh now" title="Refresh now">
            <RefreshCw className="w-4 h-4" />
          </button>
        </>}
      />

      <DayTabs value={sessionKey} onChange={setSessionKey} today={todayKey()} keys={data?.sessions.map((s) => s.key)} />

      {error && <Notice tone="bad">{error}</Notice>}

      {data && selected && meta && (
        <>
          <Summary
            headline={headline}
            facts={status === 'upcoming' ? [] : [
              <>Checked out <b>{left}</b></>,
              ...(hasFood ? [<>Got food <b>{fed}</b></>] : []),
              <>Last scan <b>{lastScan ? `${fmtTime(lastScan)} (${ago(lastScan)})` : 'none yet'}</b></>,
            ]}
            attention={attention}
            aside={status === 'upcoming' ? <CalendarClock className="w-14 h-14 text-[var(--oc-blue)]" /> : <Ring value={pct(present, total)} label="present" />}
          />

          {status !== 'upcoming' && (
            <StatGrid cols={hasFood ? 5 : 4}>
              <StatTile label="Present" icon={<UserCheck />} tone="blue" value={present} sub={`of ${total} · ${pct(present, total)}%`} onClick={() => setFilter('in')} active={filter === 'in'} />
              <StatTile label="Still here" icon={<DoorOpen />} tone="good" value={stillHere} sub="in, not checked out" />
              <StatTile label="Checked out" icon={<LogOut />} tone="out" value={left} sub={`of ${present} who came`} />
              <StatTile label={missWord} icon={<UserX />} tone={status === 'past' ? 'bad' : 'warn'} value={missing} sub={status === 'past' ? 'no check-in that day' : 'still to scan'} onClick={() => setFilter('missing')} active={filter === 'missing'} />
              {hasFood && <StatTile label="Got food" icon={<Utensils />} tone="food" value={fed} sub={`of ${total}`} />}
            </StatGrid>
          )}

          <MemberLookup council={council || undefined} openId={openPerson} onOpened={clearOpenPerson} refreshKey={updatedAt?.getTime()} onChanged={load} />

          {byCouncil.length > 1 && status !== 'upcoming' && (
            <Panel title="By council" actions={data.scope.locked ? undefined : <span className="text-xs text-gray-600">Tap a council to show only it</span>}>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {byCouncil.map(([name, v]) => (
                  <ProgressRow
                    key={name}
                    label={name}
                    n={v.present}
                    d={v.total}
                    onClick={data.scope.locked ? undefined : () => setCouncil(name)}
                    title={data.scope.locked ? undefined : `Show only ${name}`}
                    second={hasFood ? { n: v.food, tone: 'food', label: 'Got food' } : undefined}
                    sub={`${v.total - v.present} ${missWord.toLowerCase()}${hasFood ? ` · ${v.food} got food` : ''}`}
                  />
                ))}
              </div>
            </Panel>
          )}

          <div className="grid lg:grid-cols-3 gap-x-6">
            {/* People */}
            <Panel
              className="lg:col-span-2"
              title={<>{filter === 'missing' ? missWord : filter === 'in' ? 'Present' : 'Everyone'} · {meta.short}</>}
              actions={
                <div className="oc-seg" role="group" aria-label="Show">
                  {(['missing', 'in', 'all'] as const).map((f) => (
                    <button key={f} className="oc-tab" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === 'missing' ? `${missWord} (${missing})` : f === 'in' ? `Present (${present})` : `Everyone (${total})`}
                    </button>
                  ))}
                </div>
              }
            >
              {canManualDay && filter === 'missing' && (
                <p className="text-xs text-gray-600 mb-2 flex items-center gap-1"><Hand className="w-3.5 h-3.5 shrink-0" /> No QR? Tap <b>Mark present</b> to check someone in by hand. It is logged with your name.</p>
              )}
              {canManualDay && filter === 'in' && (
                <p className="text-xs text-gray-600 mb-2 flex items-center gap-1"><LogOut className="w-3.5 h-3.5 shrink-0" /> Leaving without a QR? Tap <b>Mark checked out</b>. It is logged with your name.</p>
              )}
              {notice && <Notice tone={notice.ok ? 'good' : 'bad'} onClose={() => setNotice(null)}>{notice.text}</Notice>}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID or committee" className="w-full pl-9 pr-3 py-2 text-sm" aria-label="Search the list" />
              </div>
              {people.length === 0 || (status === 'upcoming' && filter !== 'all') ? (
                status === 'upcoming' && filter !== 'all'
                  ? <EmptyState icon={<CalendarClock className="w-6 h-6" />} title={`${meta.name} has not started`} text={`It is on ${meta.date}.`} />
                  : filter === 'missing' && !search
                    ? <EmptyState icon={<PartyPopper className="w-6 h-6" />} title="Everyone is in" text="No one is missing on this day." />
                    : filter === 'in' && !search
                      ? <EmptyState icon={<UserX className="w-6 h-6" />} title="No one is in yet" text="People show up here as soon as they are scanned." />
                      : <EmptyState title="No one matches" text="Try a different name, ID or committee." />
              ) : (
                <div className="oc-scroll">
                  <table className="oc-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th className="hidden sm:table-cell">Committee</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        {hasFood && <th>Food</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((p) => (
                        <tr key={p.id} className="is-link" onClick={() => setOpenPerson(p.id)} title="Show this person's days">
                          <td className="is-id">{p.id}</td>
                          <td>{p.name}<span className="block sm:hidden text-xs text-gray-500">{p.committee ?? ''}</span></td>
                          <td className="hidden sm:table-cell is-muted">{p.committee ?? '—'}</td>
                          <td className="oc-time">
                            {isIn(p) ? (
                              <span className="oc-yes">
                                {p.checkIn ? fmtTime(p.checkIn) : 'Yes'}
                                {p.manual && <> <Badge tone="warn" title={`Checked in by hand${p.checkedInBy ? ` by ${p.checkedInBy}` : ''}`}>manual</Badge></>}
                              </span>
                            ) : canManualDay && p.kind !== 'delegate' ? (
                              <button
                                type="button"
                                className="btn-secondary !px-2 !py-1 text-xs flex items-center gap-1 whitespace-nowrap"
                                disabled={!!marking}
                                onClick={(e) => { e.stopPropagation(); void markPresent(p) }}
                                title="Check this person in without their QR"
                              >
                                {marking === `${p.id}:checkin` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hand className="w-3.5 h-3.5" />} Mark present
                              </button>
                            ) : <span className="oc-none">—</span>}
                          </td>
                          <td className="oc-time">
                            {p.checkOut ? (
                              <span className="oc-outc">
                                {fmtTime(p.checkOut)}
                                {p.outManual && <> <Badge tone="warn" title={`Checked out by hand${p.checkedOutBy ? ` by ${p.checkedOutBy}` : ''}`}>manual</Badge></>}
                              </span>
                            ) : isIn(p) && canManualDay && p.kind !== 'delegate' ? (
                              <button
                                type="button"
                                className="btn-secondary !px-2 !py-1 text-xs flex items-center gap-1 whitespace-nowrap"
                                disabled={!!marking}
                                onClick={(e) => { e.stopPropagation(); void markCheckedOut(p) }}
                                title="Check this person out without their QR"
                              >
                                {marking === `${p.id}:checkout` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />} Mark checked out
                              </button>
                            ) : <span className="oc-none">—</span>}
                          </td>
                          {hasFood && <td>{p.food ? <span className="oc-foodc">Yes</span> : <span className="oc-none">—</span>}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">Showing {people.length} of {total}. Tap a row to see that person's four days.</p>
            </Panel>

            {/* Recent scans */}
            <Panel title="Recent scans" icon={<History />}>
              {log.length === 0 ? (
                <EmptyState compact icon={<History className="w-6 h-6" />} title="No scans yet" text="Each check-in, check-out and food scan shows up here with who scanned it." />
              ) : (
                <ul className="max-h-[34rem] overflow-y-auto divide-y divide-black/10">
                  {log.map((r, i) => (
                    <li key={`${r.id}-${r.at}-${i}`} className="py-2.5 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold truncate">{r.name}</span>
                        <span className="text-gray-500 oc-time">{fmtWhen(r.at)}</span>
                      </div>
                      <p className="text-gray-700 flex flex-wrap items-center gap-1">
                        {!r.value && <Undo2 className="w-3.5 h-3.5 text-[var(--oc-warn)]" />}
                        {r.value && r.checkOut && <LogOut className="w-3.5 h-3.5 text-[var(--oc-out)]" />}
                        <span>{r.id} · {scanKind(r)}{r.dayKey ? ` · ${dayMeta(r.dayKey)?.short ?? r.dayKey}` : ''}</span>
                        {r.manual && <Badge tone="warn">manual</Badge>}
                        {!r.value && <Badge tone="warn">undone</Badge>}
                      </p>
                      <p className="text-xs text-gray-500">by {r.scannedByName ?? r.scannedBy ?? 'unknown'}</p>
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin && <p className="text-xs text-gray-500 mt-3">To undo a scan, tap Undo in the scanner right after it, or switch off Attendance, Check-out or Food in Manual / View Details.</p>}
              {data.canManual && <p className="text-xs text-gray-500 mt-3">To undo a check-in or check-out, open the person (Find a member or tap their row) and use the buttons on that day.</p>}
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
