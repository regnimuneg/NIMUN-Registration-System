import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { RefreshCw, Download, Search, UserCheck, UserX, LogOut, ChevronDown, ChevronRight, AlertTriangle, Star, DoorOpen, CalendarClock } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { fmtTime } from '../../lib/clock'
import { dayMeta, missingWord, fmtWhen, pct } from '../../lib/days'
import { downloadCsv } from '../../lib/csv'
import { PageHeader, DayTabs, StatTile, StatGrid, Panel, Summary, Ring, ProgressRow, Notice, EmptyState, LoadingPage } from '../../components/ui'
import type { Attention } from '../../components/ui'
import { LiveStatus } from '../../components/ui'
import { useLiveReload } from '../../lib/live'
import { serverNow } from '../../lib/clock'

/**
 * Committee attendance report (OC-REG and OC-HB only; the server refuses
 * everyone else). For each council or committee: how many members attended
 * each day, who attended and who did not, check-in and check-out times, and a
 * summary of days attended per member.
 */

type Status = 'past' | 'today' | 'upcoming'
interface Session { key: string; label: string; date: string; status: Status }
interface Day { present: boolean; in: string | null; out: string | null }
interface Member { id: string; name: string; council: string; committee: string; days: Record<string, Day> }
interface Report { today: string; generatedAt: string; sessions: Session[]; members: Member[] }

type GroupBy = 'council' | 'committee'
const SUMMARY = 'summary'

const shortLabel = (s: Session) => s.label.replace(/^Session Day /, 'Day ').replace(/ \((.*)\)$/, '')
const dateLabel = (s: Session) => (s.label.match(/\((.*)\)/)?.[1] ?? s.date)

interface Group {
  name: string
  members: Member[]
  /** per session key: present and checked-out counts */
  perDay: Record<string, { present: number; out: number }>
  /** days attended per member, counted over days that have started */
  attendedDays: Map<string, number>
  missedAll: Member[]
  perfect: Member[]
}

function buildGroups(members: Member[], sessions: Session[], by: GroupBy): Group[] {
  const started = sessions.filter((s) => s.status !== 'upcoming')
  const map = new Map<string, Member[]>()
  for (const m of members) {
    const k = m[by]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(m)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, list]) => {
    const perDay = Object.fromEntries(sessions.map((s) => [s.key, {
      present: list.filter((m) => m.days[s.key]?.present).length,
      out: list.filter((m) => m.days[s.key]?.out).length,
    }]))
    const attendedDays = new Map(list.map((m) => [m.id, started.filter((s) => m.days[s.key]?.present).length]))
    return {
      name,
      members: list,
      perDay,
      attendedDays,
      missedAll: started.length ? list.filter((m) => attendedDays.get(m.id) === 0) : [],
      perfect: started.length ? list.filter((m) => attendedDays.get(m.id) === started.length) : [],
    }
  })
}

export default function CommitteeAttendancePage() {
  const [data, setData] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('council')
  const [view, setView] = useState<string>(SUMMARY)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res: Report = await api.getCommitteeAttendance()
      setData(res)
      setError(null)
      setUpdatedAt(serverNow())
    } catch (e) {
      const err = e as ApiError
      setError(err.status === 403 ? 'Only the Registration Affairs and Highboard accounts can see this page.' : err.message || 'Could not load the report')
    } finally {
      setLoading(false)
    }
  }, [])

  // Updates within ~2 seconds of any scan
  useLiveReload(load)

  // Start on today's day when the conference is on, else the summary
  const [picked, setPicked] = useState(false)
  useEffect(() => {
    if (!data || picked) return
    const today = data.sessions.find((s) => s.status === 'today')
    if (today) setView(today.key)
    setPicked(true)
  }, [data, picked])

  const sessions = data?.sessions ?? []
  const started = sessions.filter((s) => s.status !== 'upcoming')
  const day = sessions.find((s) => s.key === view) ?? null
  const otherBy: GroupBy = groupBy === 'council' ? 'committee' : 'council'

  const q = search.trim().toLowerCase()
  const members = useMemo(() => (data?.members ?? []).filter((m) =>
    !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.committee.toLowerCase().includes(q) || m.council.toLowerCase().includes(q),
  ), [data, q])
  const groups = useMemo(() => buildGroups(members, sessions, groupBy), [members, sessions, groupBy])
  const all = useMemo(() => groups.reduce(
    (acc, g) => {
      acc.total += g.members.length
      acc.missed += g.missedAll.length
      acc.perfect += g.perfect.length
      for (const s of sessions) acc.present[s.key] = (acc.present[s.key] ?? 0) + g.perDay[s.key].present
      return acc
    },
    { total: 0, missed: 0, perfect: 0, present: {} as Record<string, number> },
  ), [groups, sessions])

  const toggle = (name: string) => setOpen((prev) => {
    const next = new Set(prev)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })

  const exportMembers = () => {
    if (!data) return
    const head = ['ID', 'Name', 'Council', 'Committee', ...sessions.flatMap((s) => [`${shortLabel(s)} present`, `${shortLabel(s)} check-in`, `${shortLabel(s)} check-out`]), 'Days attended', 'Days so far']
    const rows = members.map((m) => [
      m.id, m.name, m.council, m.committee,
      ...sessions.flatMap((s) => {
        const d = m.days[s.key]
        return [s.status === 'upcoming' ? 'Not yet' : d.present ? 'Yes' : 'No', d.in ? fmtTime(d.in) : '', d.out ? fmtTime(d.out) : '']
      }),
      started.filter((s) => m.days[s.key].present).length, started.length,
    ])
    downloadCsv(`oc27-committee-attendance-members-${data.today}.csv`, [head, ...rows])
  }

  const exportSummary = () => {
    if (!data) return
    const head = [groupBy === 'council' ? 'Council' : 'Committee', 'Members', ...sessions.flatMap((s) => [`${shortLabel(s)} attended`, `${shortLabel(s)} %`, `${shortLabel(s)} checked out`]), 'Attended every day so far', 'Missed every day so far']
    const rows = groups.map((g) => [
      g.name, g.members.length,
      ...sessions.flatMap((s) => s.status === 'upcoming' ? ['Not yet', '', ''] : [g.perDay[s.key].present, `${pct(g.perDay[s.key].present, g.members.length)}%`, g.perDay[s.key].out]),
      g.perfect.length, g.missedAll.length,
    ])
    downloadCsv(`oc27-committee-attendance-by-${groupBy}-${data.today}.csv`, [head, ...rows])
  }

  if (!data && !error) return <LoadingPage tiles={4} />

  const today = sessions.find((s) => s.status === 'today')?.key ?? null
  const groupWord = groupBy === 'council' ? 'council' : 'committee'
  const missWord = day ? missingWord(day.status) : ''
  const dayPresent = day ? all.present[day.key] ?? 0 : 0
  const dayOut = day ? groups.reduce((a, g) => a + g.perDay[day.key].out, 0) : 0
  const meta = day ? dayMeta(day.key) : null
  const ranked = day && day.status !== 'upcoming'
    ? groups.filter((g) => g.members.length).map((g) => ({ name: g.name, n: g.perDay[day.key].present, d: g.members.length, p: pct(g.perDay[day.key].present, g.members.length) })).sort((a, b) => a.p - b.p)
    : []

  const attention: Attention[] = []
  let headline: ReactNode = null
  if (data && day && meta) {
    if (day.status === 'upcoming') headline = <>{meta.name} is on <b>{meta.date}</b>. Nothing to show until it starts.</>
    else {
      headline = <><b>{dayPresent} of {all.total}</b> OC members {day.status === 'today' ? 'are in today' : `came on ${meta.name}`} ({pct(dayPresent, all.total)}%). <b>{all.total - dayPresent}</b> {missWord.toLowerCase()}.</>
      if (ranked.length > 1 && dayPresent > 0) {
        const low = ranked[0], high = ranked[ranked.length - 1]
        if (low.p < high.p) attention.push({ tone: 'warn', text: <>Lowest {groupWord}: <b>{low.name}</b>, {low.n} of {low.d} ({low.p}%). Highest: {high.name}, {high.p}%.</> })
      }
      if (day.status === 'past' && dayPresent - dayOut > 0) attention.push({ tone: 'info', text: <>{dayPresent - dayOut} came but have no check-out time on this day.</> })
      if (all.total > 0 && dayPresent === all.total) attention.push({ tone: 'good', text: 'Everyone was present.' })
    }
  } else if (data) {
    if (!started.length) headline = <>The conference has not started yet. Day One is on <b>{dayMeta('day1')?.date}</b>.</>
    else {
      const avg = all.total ? started.reduce((a, s) => a + (all.present[s.key] ?? 0), 0) / all.total : 0
      headline = <><b>{all.perfect} of {all.total}</b> came every day so far ({started.length} of {sessions.length} days). On average, each member came <b>{avg.toFixed(1)}</b> days.</>
      const missed = groups.flatMap((g) => g.missedAll)
      if (missed.length) attention.push({ tone: 'bad', text: <><b>{missed.length}</b> have not come on any day yet: {missed.slice(0, 6).map((m) => `${m.name} (${m.id})`).join(', ')}{missed.length > 6 ? `, and ${missed.length - 6} more` : ''}.</> })
      const worst = groups.filter((g) => g.members.length).map((g) => ({ name: g.name, p: pct(started.reduce((a, s) => a + g.perDay[s.key].present, 0), g.members.length * started.length) })).sort((a, b) => a.p - b.p)
      if (worst.length > 1 && worst[0].p < worst[worst.length - 1].p) attention.push({ tone: 'warn', text: <>Lowest {groupWord} over all days so far: <b>{worst[0].name}</b> ({worst[0].p}% of member-days).</> })
      if (!missed.length && all.total) attention.push({ tone: 'good', text: 'Every member has come at least once.' })
    }
  }

  return (
    <div className="jn-shell">
      <PageHeader
        eyebrow={<LiveStatus updatedAt={updatedAt} error={!!error} />}
        title="Committee Attendance"
        meta={data ? `${data.members.length} OC members · Registration Affairs and Highboard only` : 'Loading…'}
        actions={<>
          <button onClick={exportSummary} disabled={!data} className="btn-secondary flex items-center gap-2 px-3 py-2" title={`One row per ${groupWord}`}>
            <Download className="w-4 h-4" /> Summary CSV
          </button>
          <button onClick={exportMembers} disabled={!data} className="btn-secondary flex items-center gap-2 px-3 py-2" title="One row per member">
            <Download className="w-4 h-4" /> Members CSV
          </button>
          <button onClick={() => void load()} className="btn-primary flex items-center gap-2 px-4 py-2" aria-label="Refresh now" title="Refresh now">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </>}
      />

      {error && <Notice tone="bad">{error}</Notice>}

      {data && (
        <>
          <DayTabs value={view} onChange={setView} today={today} keys={sessions.map((s) => s.key)} before={{ key: SUMMARY, label: 'All days', sub: 'Summary' }} />

          <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Group by">
            <span className="oc-eyebrow !mb-0 mr-1">Group by</span>
            <button className="oc-tab" aria-pressed={groupBy === 'council'} onClick={() => setGroupBy('council')}>Council</button>
            <button className="oc-tab" aria-pressed={groupBy === 'committee'} onClick={() => setGroupBy('committee')}>Committee</button>
            <span className="text-xs text-gray-600 basis-full sm:basis-auto sm:ml-2">{groupBy === 'council' ? 'Council = UNICEF, IAEA, CCPCJ or Press' : 'Committee = OC team, e.g. Media & Design'}</span>
          </div>

          <Summary
            headline={headline}
            attention={attention}
            aside={day ? (day.status === 'upcoming' ? <CalendarClock className="w-14 h-14 text-[var(--oc-blue)]" /> : <Ring value={pct(dayPresent, all.total)} label="present" />) : (started.length ? <Ring value={pct(all.perfect, all.total)} label="came every day" /> : undefined)}
          />

          {day ? (
            day.status !== 'upcoming' && (
              <StatGrid cols={4}>
                <StatTile label="Present" icon={<UserCheck />} tone="blue" value={dayPresent} sub={`of ${all.total} · ${pct(dayPresent, all.total)}%`} />
                <StatTile label={missWord} icon={<UserX />} tone={day.status === 'past' ? 'bad' : 'warn'} value={all.total - dayPresent} sub={meta?.date} />
                <StatTile label="Checked out" icon={<LogOut />} tone="out" value={dayOut} sub={`of ${dayPresent} who came`} />
                <StatTile label="Still here" icon={<DoorOpen />} tone="good" value={Math.max(0, dayPresent - dayOut)} sub={day.status === 'today' ? 'in, not checked out' : 'no check-out time'} />
              </StatGrid>
            )
          ) : (
            <>
              <StatGrid cols={3}>
                <StatTile label="Every day so far" icon={<Star />} tone="blue" value={started.length ? all.perfect : '—'} sub={`of ${all.total} · ${started.length} of ${sessions.length} days started`} />
                <StatTile label="Not come yet" icon={<AlertTriangle />} tone="bad" value={started.length ? all.missed : '—'} sub="no check-in on any day" />
                <StatTile label="Days started" icon={<CalendarClock />} tone="ink" value={`${started.length}/${sessions.length}`} sub={started.length ? `latest: ${dayMeta(started[started.length - 1].key)?.short}` : 'starts Tue 24 Nov'} />
              </StatGrid>
              <Panel title="Each day, all members">
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                  {sessions.map((s) => (
                    <ProgressRow key={s.key} label={`${dayMeta(s.key)?.short ?? shortLabel(s)} · ${dayMeta(s.key)?.date ?? dateLabel(s)}`} n={s.status === 'upcoming' ? 0 : all.present[s.key] ?? 0} d={all.total} sub={s.status === 'upcoming' ? 'Not started' : s.status === 'today' ? 'Today, still going' : `${all.total - (all.present[s.key] ?? 0)} absent`} />
                  ))}
                </div>
              </Panel>
            </>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, council or committee" className="w-full pl-9 pr-3 py-2 text-sm" aria-label="Search members" />
          </div>
          <p className="text-xs text-gray-600 mb-2">Tap a {groupWord} to see who {day ? 'was present and who was not' : 'came on which day'}.</p>

          <div className="space-y-3">
            {groups.map((g) => {
              const isOpen = open.has(g.name) || !!q
              const total = g.members.length
              const present = day ? g.perDay[day.key].present : 0
              return (
                <div key={g.name} className="oc-panel !p-0 !mb-0 overflow-hidden">
                  <button className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3" onClick={() => toggle(g.name)} aria-expanded={isOpen}>
                    <div className="flex items-center gap-2 sm:w-64 shrink-0">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-bold text-lg">{g.name}</span>
                      <span className="text-xs text-gray-500">{total} members</span>
                    </div>
                    {day ? (
                      <div className="flex-1 min-w-0">
                        {day.status === 'upcoming'
                          ? <p className="text-sm text-gray-600">Not started</p>
                          : <ProgressRow label={`${present} present · ${total - present} ${missWord.toLowerCase()}`} n={present} d={total} sub={<span className="text-[var(--oc-out)] inline-flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> {g.perDay[day.key].out} checked out</span>} />}
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {sessions.map((s) => (
                          <div key={s.key}>
                            <div className="flex justify-between mb-0.5"><span className="font-bold">{dayMeta(s.key)?.short ?? shortLabel(s)}</span><span className="tabular-nums">{s.status === 'upcoming' ? '—' : `${g.perDay[s.key].present}/${total}`}</span></div>
                            <div className="oc-bar"><span style={{ width: `${s.status === 'upcoming' ? 0 : pct(g.perDay[s.key].present, total)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/20 p-4 sm:p-5 bg-[#fffdf9]">
                      {day ? <DayLists group={g} day={day} otherBy={otherBy} /> : <SummaryTable group={g} sessions={sessions} started={started} otherBy={otherBy} />}
                    </div>
                  )}
                </div>
              )
            })}
            {groups.length === 0 && <EmptyState title="No members match" text="Try a different name, ID, council or committee." />}
          </div>
        </>
      )}
    </div>
  )
}

function DayLists({ group, day, otherBy }: { group: Group; day: Session; otherBy: GroupBy }) {
  if (day.status === 'upcoming') return <p className="text-sm text-gray-600">{dayMeta(day.key)?.name ?? day.label} has not started yet.</p>
  const attended = group.members.filter((m) => m.days[day.key].present)
  const missing = group.members.filter((m) => !m.days[day.key].present)
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="min-w-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--oc-blue)] mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Present ({attended.length})</h3>
        {attended.length === 0 ? <p className="text-sm text-gray-600">No one yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b border-black"><th className="py-1 pr-2">ID</th><th className="py-1 pr-2">Name</th><th className="py-1 pr-2 capitalize">{otherBy}</th><th className="py-1 pr-2">Check-in</th><th className="py-1">Check-out</th></tr></thead>
              <tbody>
                {attended.map((m) => (
                  <tr key={m.id} className="border-b border-black/10">
                    <td className="py-1 pr-2 font-mono text-xs">{m.id}</td>
                    <td className="py-1 pr-2">{m.name}</td>
                    <td className="py-1 pr-2 text-xs text-gray-600">{m[otherBy]}</td>
                    <td className="py-1 pr-2 tabular-nums">{m.days[day.key].in ? fmtTime(m.days[day.key].in) : '✓'}</td>
                    <td className="py-1 tabular-nums text-[#6b21a8]">{m.days[day.key].out ? fmtTime(m.days[day.key].out) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-red-800 mb-2 flex items-center gap-2"><UserX className="w-4 h-4" /> {missingWord(day.status)} ({missing.length})</h3>
        {missing.length === 0 ? <p className="text-sm text-gray-600">Everyone was present.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b border-black"><th className="py-1 pr-2">ID</th><th className="py-1 pr-2">Name</th><th className="py-1 capitalize">{otherBy}</th></tr></thead>
              <tbody>
                {missing.map((m) => (
                  <tr key={m.id} className="border-b border-black/10">
                    <td className="py-1 pr-2 font-mono text-xs">{m.id}</td>
                    <td className="py-1 pr-2">{m.name}</td>
                    <td className="py-1 text-xs text-gray-600">{m[otherBy]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryTable({ group, sessions, started, otherBy }: { group: Group; sessions: Session[]; started: Session[]; otherBy: GroupBy }) {
  const avg = group.members.length ? [...group.attendedDays.values()].reduce((a, b) => a + b, 0) / group.members.length : 0
  // Sub-groups: committees inside a council, or councils inside a committee
  const sub = new Map<string, Member[]>()
  for (const m of group.members) {
    if (!sub.has(m[otherBy])) sub.set(m[otherBy], [])
    sub.get(m[otherBy])!.push(m)
  }
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="border border-black/30 bg-white px-3 py-2"><p className="text-xs uppercase tracking-widest text-gray-600">Average</p><p className="font-bold">{started.length ? `${avg.toFixed(1)} of ${started.length} days` : 'No days yet'}</p></div>
        <div className="border border-black/30 bg-white px-3 py-2"><p className="text-xs uppercase tracking-widest text-gray-600">Every day so far</p><p className="font-bold">{group.perfect.length} of {group.members.length}</p></div>
        <div className="border border-red-700/50 bg-white px-3 py-2"><p className="text-xs uppercase tracking-widest text-gray-600">Not come yet</p><p className="font-bold text-red-800">{group.missedAll.length} of {group.members.length}</p></div>
      </div>
      {group.missedAll.length > 0 && (
        <p className="text-sm"><span className="font-bold text-red-800">Not come on any day yet:</span> {group.missedAll.map((m) => `${m.name} (${m.id})`).join(', ')}</p>
      )}
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-600 mb-1">By {otherBy}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {[...sub.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, list]) => (
            <span key={name}><b>{name}</b>: {started.map((s) => `${list.filter((m) => m.days[s.key].present).length}/${list.length}`).join(' · ') || `${list.length} members`}</span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-black">
              <th className="py-1 pr-2">ID</th><th className="py-1 pr-2">Name</th><th className="py-1 pr-2 capitalize">{otherBy}</th>
              {sessions.map((s) => <th key={s.key} className="py-1 pr-2 text-center">{dayMeta(s.key)?.short ?? shortLabel(s)}</th>)}
              <th className="py-1 text-right">Days</th>
            </tr>
          </thead>
          <tbody>
            {[...group.members].sort((a, b) => (group.attendedDays.get(a.id)! - group.attendedDays.get(b.id)!) || a.id.localeCompare(b.id)).map((m) => (
              <tr key={m.id} className="border-b border-black/10">
                <td className="py-1 pr-2 font-mono text-xs">{m.id}</td>
                <td className="py-1 pr-2">{m.name}</td>
                <td className="py-1 pr-2 text-xs text-gray-600">{m[otherBy]}</td>
                {sessions.map((s) => {
                  const d = m.days[s.key]
                  if (s.status === 'upcoming') return <td key={s.key} className="py-1 pr-2 text-center text-gray-400">·</td>
                  return (
                    <td key={s.key} className="py-1 pr-2 text-center" title={d.present ? `Check-in ${d.in ? fmtTime(d.in) : ''}${d.out ? `, check-out ${fmtTime(d.out)}` : ''}` : missingWord(s.status)}>
                      {d.present ? <span className="text-[var(--oc-blue)] font-bold">✓</span> : <span className="text-red-800">✗</span>}
                    </td>
                  )
                })}
                <td className="py-1 text-right tabular-nums font-bold">{group.attendedDays.get(m.id)}/{started.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
