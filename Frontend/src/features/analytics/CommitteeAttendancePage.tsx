import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Download, Search, UserCheck, UserX, LogOut, ChevronDown, ChevronRight, AlertTriangle, Star } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { fmtTime, fmtStamp } from '../../lib/clock'

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
const REFRESH_MS = 30_000

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const shortLabel = (s: Session) => s.label.replace(/^Session Day /, 'Day ').replace(/ \((.*)\)$/, '')
const dateLabel = (s: Session) => (s.label.match(/\((.*)\)/)?.[1] ?? s.date)

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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res: Report = await api.getCommitteeAttendance()
      setData(res)
      setError(null)
    } catch (e) {
      const err = e as ApiError
      setError(err.status === 403 ? 'Only the Registration Affairs and Highboard accounts can see this page.' : err.message || 'Could not load the report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-600">OC-REG and OC-HB only</p>
          <h1 className="text-2xl sm:text-4xl font-bold">Committee Attendance</h1>
          <p className="text-gray-600 mt-3 text-sm">
            {data ? `${data.members.length} OC members · updated ${fmtStamp(data.generatedAt)}` : 'Loading…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={exportSummary} disabled={!data} className="btn-secondary flex items-center gap-2 px-3 py-2 flex-1 sm:flex-none justify-center">
            <Download className="w-4 h-4" /> Summary CSV
          </button>
          <button onClick={exportMembers} disabled={!data} className="btn-secondary flex items-center gap-2 px-3 py-2 flex-1 sm:flex-none justify-center">
            <Download className="w-4 h-4" /> Members CSV
          </button>
          <button onClick={() => void load()} className="btn-primary flex items-center gap-2 px-4 py-2 justify-center" aria-label="Refresh now">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="mb-6 border border-red-700 bg-red-50 text-red-800 px-4 py-3">{error}</div>}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Group by">
            <span className="text-xs uppercase tracking-widest text-gray-600 mr-1">Group by</span>
            <button className="oc-tab" aria-pressed={groupBy === 'council'} onClick={() => setGroupBy('council')}>Council</button>
            <button className="oc-tab" aria-pressed={groupBy === 'committee'} onClick={() => setGroupBy('committee')}>Committee</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Day">
            <button className="oc-tab" aria-pressed={view === SUMMARY} onClick={() => setView(SUMMARY)}>All days summary</button>
            {sessions.map((s) => (
              <button key={s.key} className="oc-tab" aria-pressed={view === s.key} onClick={() => setView(s.key)}>
                {s.label}{s.status === 'today' ? ' · today' : ''}
              </button>
            ))}
          </div>

          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {day ? (
              <>
                <div className="card !p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Attended</p>
                  <p className="oc-big-number mt-2 text-[var(--oc-blue)]">{day.status === 'upcoming' ? '—' : all.present[day.key] ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">of {all.total} · {day.status === 'upcoming' ? 'not yet happened' : `${pct(all.present[day.key] ?? 0, all.total)}%`}</p>
                </div>
                <div className="card !p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><UserX className="w-4 h-4" /> {day.status === 'today' ? 'Not in yet' : 'Did not attend'}</p>
                  <p className="oc-big-number mt-2">{day.status === 'upcoming' ? '—' : all.total - (all.present[day.key] ?? 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">{dateLabel(day)}</p>
                </div>
              </>
            ) : (
              <>
                <div className="card !p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><Star className="w-4 h-4" /> Every day so far</p>
                  <p className="oc-big-number mt-2 text-[var(--oc-blue)]">{started.length ? all.perfect : '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">of {all.total} · {started.length} of {sessions.length} days started</p>
                </div>
                <div className="card !p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Missed every day</p>
                  <p className="oc-big-number mt-2 text-red-800">{started.length ? all.missed : '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">so far</p>
                </div>
              </>
            )}
            <div className="card !p-4 col-span-2">
              <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">Each day, everyone</p>
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <div key={s.key} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 font-bold">{shortLabel(s)}</span>
                    <div className="oc-bar flex-1"><span style={{ width: `${s.status === 'upcoming' ? 0 : pct(all.present[s.key] ?? 0, all.total)}%` }} /></div>
                    <span className="w-24 text-right tabular-nums">{s.status === 'upcoming' ? 'not yet' : `${all.present[s.key] ?? 0}/${all.total} · ${pct(all.present[s.key] ?? 0, all.total)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, council or committee" className="w-full pl-9 pr-3 py-2 text-sm" />
          </div>

          <div className="space-y-4">
            {groups.map((g) => {
              const isOpen = open.has(g.name) || !!q
              const total = g.members.length
              const present = day ? g.perDay[day.key].present : 0
              return (
                <div key={g.name} className="card !p-0 overflow-hidden">
                  <button className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3" onClick={() => toggle(g.name)} aria-expanded={isOpen}>
                    <div className="flex items-center gap-2 sm:w-64 shrink-0">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-bold text-lg">{g.name}</span>
                      <span className="text-xs text-gray-500">{total} members</span>
                    </div>
                    {day ? (
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{day.status === 'upcoming' ? 'Not yet happened' : `${present} attended · ${total - present} ${day.status === 'today' ? 'not in yet' : 'did not attend'}`}</span>
                          <span className="tabular-nums font-bold">{day.status === 'upcoming' ? '—' : `${present} / ${total} · ${pct(present, total)}%`}</span>
                        </div>
                        <div className="oc-bar"><span style={{ width: `${day.status === 'upcoming' ? 0 : pct(present, total)}%` }} /></div>
                        {day.status !== 'upcoming' && <p className="text-xs text-[#6b21a8] mt-1 flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> {g.perDay[day.key].out} checked out</p>}
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {sessions.map((s) => (
                          <div key={s.key}>
                            <div className="flex justify-between mb-0.5"><span className="font-bold">{shortLabel(s)}</span><span className="tabular-nums">{s.status === 'upcoming' ? '—' : `${g.perDay[s.key].present}/${total}`}</span></div>
                            <div className="oc-bar"><span style={{ width: `${s.status === 'upcoming' ? 0 : pct(g.perDay[s.key].present, total)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/20 p-4 sm:p-5 bg-[#faf6f0]">
                      {day ? <DayLists group={g} day={day} otherBy={otherBy} /> : <SummaryTable group={g} sessions={sessions} started={started} otherBy={otherBy} />}
                    </div>
                  )}
                </div>
              )
            })}
            {groups.length === 0 && <p className="text-sm text-gray-600">No members match.</p>}
          </div>
        </>
      )}
    </div>
  )
}

function DayLists({ group, day, otherBy }: { group: Group; day: Session; otherBy: GroupBy }) {
  if (day.status === 'upcoming') return <p className="text-sm text-gray-600">{day.label} has not happened yet.</p>
  const attended = group.members.filter((m) => m.days[day.key].present)
  const missing = group.members.filter((m) => !m.days[day.key].present)
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="min-w-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--oc-blue)] mb-2 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Attended ({attended.length})</h3>
        {attended.length === 0 ? <p className="text-sm text-gray-600">No one yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b border-black"><th className="py-1 pr-2">ID</th><th className="py-1 pr-2">Name</th><th className="py-1 pr-2 capitalize">{otherBy}</th><th className="py-1 pr-2">In</th><th className="py-1">Out</th></tr></thead>
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
        <h3 className="text-sm font-bold uppercase tracking-widest text-red-800 mb-2 flex items-center gap-2"><UserX className="w-4 h-4" /> {day.status === 'today' ? 'Not in yet' : 'Did not attend'} ({missing.length})</h3>
        {missing.length === 0 ? <p className="text-sm text-gray-600">Everyone attended.</p> : (
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
        <div className="border border-red-700/50 bg-white px-3 py-2"><p className="text-xs uppercase tracking-widest text-gray-600">Missed every day</p><p className="font-bold text-red-800">{group.missedAll.length} of {group.members.length}</p></div>
      </div>
      {group.missedAll.length > 0 && (
        <p className="text-sm"><span className="font-bold text-red-800">Missed every day so far:</span> {group.missedAll.map((m) => `${m.name} (${m.id})`).join(', ')}</p>
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
              {sessions.map((s) => <th key={s.key} className="py-1 pr-2 text-center">{shortLabel(s)}</th>)}
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
                    <td key={s.key} className="py-1 pr-2 text-center" title={d.present ? `In ${d.in ? fmtTime(d.in) : ''}${d.out ? `, out ${fmtTime(d.out)}` : ''}` : 'Did not attend'}>
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
