import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { RefreshCw, Users, UserCheck, LogIn, LogOut, Utensils } from 'lucide-react'
import { api, tokenManager } from '../../lib/api'

interface SessionStat {
  key: string
  label: string
  attended: number
  checkedIn: number
  checkedOut: number
  meals: Record<string, number>
}

interface ScanAnalytics {
  scope: { council: string | null; locked: boolean }
  councils: string[]
  total: number
  sessions: SessionStat[]
  byCommittee: { committee: string; total: number; attended: Record<string, number> }[]
  recent: { id: string; name: string; council: string | null; committee: string | null; type: string; title: string; at: string }[]
  session?: string
  people?: { id: string; name: string; council: string | null; committee: string | null; attended: boolean; checkIn: string | null; checkOut: string | null }[]
}

const REFRESH_MS = 30_000
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

function Stat({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: typeof Users; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" style={{ color }} />
      </div>
    </div>
  )
}

export default function ScanAnalyticsPage() {
  const user = tokenManager.getUser()
  const [data, setData] = useState<ScanAnalytics | null>(null)
  const [council, setCouncil] = useState('')
  const [sessionKey, setSessionKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [filter, setFilter] = useState<'all' | 'in' | 'missing'>('all')

  const load = useCallback(async (s?: string) => {
    try {
      setError(null)
      const result: ScanAnalytics = await api.getScanAnalytics({ council: council || undefined, session: s ?? (sessionKey || undefined) })
      setData(result)
      setUpdatedAt(new Date())
      // Default to the busiest session so the people list is useful straight away
      if (!sessionKey && !s && result.sessions.length) {
        const busiest = [...result.sessions].sort((a, b) => b.attended + b.checkedIn - (a.attended + a.checkedIn))[0]
        const pick = busiest.attended + busiest.checkedIn > 0 ? busiest.key : 'conf_day1'
        setSessionKey(pick)
        void load(pick)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load scan analytics')
    } finally {
      setLoading(false)
    }
  }, [council, sessionKey])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  const selected = useMemo(() => data?.sessions.find((s) => s.key === sessionKey) ?? null, [data, sessionKey])
  const people = useMemo(() => {
    const list = data?.people ?? []
    if (filter === 'in') return list.filter((p) => p.attended || p.checkIn)
    if (filter === 'missing') return list.filter((p) => !p.attended && !p.checkIn)
    return list
  }, [data, filter])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--jn-blue)]" />
      </div>
    )
  }

  const scopeLabel = data?.scope.council ?? 'All councils'
  const total = data?.total ?? 0
  const present = selected ? Math.max(selected.attended, selected.checkedIn) : 0

  return (
    <div className="jn-shell">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl font-bold">Scan Analytics</h1>
          <p className="text-gray-600 mt-1">
            {scopeLabel}
            {user?.name ? ` · signed in as ${user.name}` : ''}
            {updatedAt ? ` · updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {data && !data.scope.locked && (
            <select
              value={council}
              onChange={(e) => setCouncil(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white flex-1 sm:flex-none"
              aria-label="Council"
            >
              <option value="">All councils</option>
              {data.councils.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select
            value={sessionKey}
            onChange={(e) => { setSessionKey(e.target.value); void load(e.target.value) }}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white flex-1 sm:flex-none"
            aria-label="Session"
          >
            {data?.sessions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button
            onClick={() => void load()}
            className="jn-sticker-button flex items-center gap-2 px-4 py-2 text-sm justify-center"
            style={{ '--button-color': 'var(--jn-blue)' } as CSSProperties}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">{error}</div>}

      {data && selected && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Stat label="People" value={total} icon={Users} color="#4E8ECB" />
            <Stat label={`Present · ${selected.label}`} value={present} sub={`${pct(present, total)}% of ${total}`} icon={UserCheck} color="#16a34a" />
            <Stat label="Checked in" value={selected.checkedIn} icon={LogIn} color="#7c3aed" />
            <Stat label="Checked out" value={selected.checkedOut} icon={LogOut} color="#ea580c" />
          </div>

          {Object.keys(selected.meals).length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold">Meals · {selected.label}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(selected.meals).map(([meal, count]) => (
                  <div key={meal}>
                    <p className="text-sm text-gray-600 capitalize">{meal}</p>
                    <p className="text-xl font-bold tabular-nums">{count} <span className="text-sm font-normal text-gray-500">/ {total}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 min-w-0">
              <h2 className="text-lg font-semibold mb-3">Attendance by session</h2>
              <div className="space-y-3">
                {data.sessions.map((s) => {
                  const n = Math.max(s.attended, s.checkedIn)
                  return (
                    <button key={s.key} onClick={() => { setSessionKey(s.key); void load(s.key) }} className="w-full text-left group">
                      <div className="flex justify-between text-sm mb-1">
                        <span className={s.key === sessionKey ? 'font-bold' : 'text-gray-700 group-hover:text-gray-900'}>{s.label}</span>
                        <span className="tabular-nums text-gray-600">{n} / {total}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--jn-blue)]" style={{ width: `${pct(n, total)}%`, opacity: s.key === sessionKey ? 1 : 0.55 }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 min-w-0">
              <h2 className="text-lg font-semibold mb-3">By committee · {selected.label}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-2 font-medium">Committee</th>
                      <th className="py-2 px-2 font-medium text-right">Present</th>
                      <th className="py-2 pl-2 font-medium text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCommittee.map((c) => (
                      <tr key={c.committee} className="border-b last:border-0">
                        <td className="py-2 pr-2">{c.committee}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{c.attended[selected.key] ?? 0} / {c.total}</td>
                        <td className="py-2 pl-2 text-right tabular-nums">{pct(c.attended[selected.key] ?? 0, c.total)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 lg:col-span-2 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold">People · {selected.label}</h2>
                <div className="flex gap-1 text-sm">
                  {(['all', 'in', 'missing'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full border ${filter === f ? 'bg-[var(--jn-blue)] text-white border-transparent' : 'border-gray-300 text-gray-700'}`}
                    >
                      {f === 'all' ? 'All' : f === 'in' ? 'Present' : 'Not yet'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-2 font-medium">ID</th>
                      <th className="py-2 px-2 font-medium">Name</th>
                      <th className="py-2 px-2 font-medium hidden sm:table-cell">Committee</th>
                      <th className="py-2 px-2 font-medium">In</th>
                      <th className="py-2 pl-2 font-medium hidden sm:table-cell">Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-mono whitespace-nowrap">{p.id}</td>
                        <td className="py-2 px-2">{p.name}</td>
                        <td className="py-2 px-2 hidden sm:table-cell text-gray-600">{p.committee ?? p.council ?? '—'}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {p.checkIn ? time(p.checkIn) : p.attended ? <span className="text-green-700">Present</span> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 pl-2 whitespace-nowrap hidden sm:table-cell">{time(p.checkOut)}</td>
                      </tr>
                    ))}
                    {people.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">Nobody here yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 min-w-0">
              <h2 className="text-lg font-semibold mb-3">Latest scans</h2>
              {data.recent.length === 0 ? (
                <p className="text-gray-500 text-sm">No scans yet.</p>
              ) : (
                <ul className="space-y-3 max-h-[28rem] overflow-y-auto">
                  {data.recent.map((r, i) => (
                    <li key={`${r.id}-${r.at}-${i}`} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium truncate">{r.name}</span>
                        <span className="text-gray-500 whitespace-nowrap">{time(r.at)}</span>
                      </div>
                      <p className="text-gray-600 truncate"><span className="font-mono">{r.id}</span> · {r.title}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
