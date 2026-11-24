import { useEffect, useRef, useState } from 'react'
import { Search, X, UserCheck, Utensils, Undo2, CircleDashed, LogOut, Hand, Loader2 } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { fmtTime, fmtStamp } from '../../lib/clock'

interface Hit { id: string; name: string; council: string | null; committee: string | null }
interface Day { key: string; label: string; attended: boolean; checkIn: string | null; checkOut: string | null; meals: Record<string, boolean>; date?: string; manual?: boolean; checkedInBy?: string | null }
interface HistoryRow { type: 'attendance' | 'food'; value: boolean; checkOut?: boolean; dayKey: string | null; scannedBy: string | null; scannedByName: string | null; manual?: boolean; at: string }
interface PersonData { person: Hit; days: Day[]; attendedDays: number; totalDays: number; history: HistoryRow[]; canManual?: boolean; today?: string }
type ManualAction = 'checkin' | 'checkout' | 'undo-checkin' | 'undo-checkout'
const ACTION_DONE: Record<ManualAction, string> = {
  checkin: 'Marked present by hand',
  checkout: 'Checked out by hand',
  'undo-checkin': 'Check-in removed',
  'undo-checkout': 'Check-out removed',
}

const DAY_LABELS: Record<string, string> = {
  'sessions.day1': 'Session Day One',
  'sessions.day2': 'Session Day Two',
  'sessions.day3': 'Session Day Three',
  'conference.day1': 'Conference Day',
}
const shortDay = (label: string) => label.replace(/^Session Day (\w+) \((.*)\)$/, 'Day $1 · $2').replace(/^Conference Day \((.*)\)$/, 'Conference · $1')

/** Search one member by name, ID or username and show their own attendance, food and scan history. */
export default function MemberLookup({ council, openId, onOpened, refreshKey, onChanged }: { council?: string; openId?: string | null; onOpened?: () => void; refreshKey?: string | number; onChanged?: () => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [data, setData] = useState<PersonData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [reload, setReload] = useState(0)
  const seq = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  // Debounced server search (works for the whole council, not just today's list)
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setHits([]); setSearching(false); return }
    const my = ++seq.current
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const r = await api.searchScanPeople(term, council || undefined)
        if (my === seq.current) { setHits(r.results ?? []); setOpen(true) }
      } catch { if (my === seq.current) setHits([]) }
      finally { if (my === seq.current) setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q, council])

  // Opening from the board's table
  useEffect(() => {
    if (openId) { setSelectedId(openId); onOpened?.(); setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  }, [openId, onOpened])

  // Load the person, and reload when the board sees new scans
  useEffect(() => {
    if (!selectedId) { setData(null); return }
    let alive = true
    setError(null)
    api.getScanPerson(selectedId)
      .then((r) => { if (alive) setData(r) })
      .catch((e: any) => { if (alive) { setData(null); setError(e?.message || 'Could not load this person') } })
    return () => { alive = false }
  }, [selectedId, refreshKey, reload])

  useEffect(() => { setNotice(null); setConfirmUndo(null) }, [selectedId])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])
  useEffect(() => {
    if (!confirmUndo) return
    const t = setTimeout(() => setConfirmUndo(null), 5000)
    return () => clearTimeout(t)
  }, [confirmUndo])

  const pick = (h: Hit) => { setSelectedId(h.id); setOpen(false); setQ('') }

  // Manual check-in / check-out (admins and Secretariats). Undos ask for a second tap.
  const runManual = async (d: Day, action: ManualAction) => {
    if (!data || busy) return
    const tag = `${d.key}:${action}`
    if (action.startsWith('undo') && confirmUndo !== tag) { setConfirmUndo(tag); return }
    setConfirmUndo(null)
    setBusy(tag)
    setNotice(null)
    try {
      await api.manualCheckIn({ id: data.person.id, session: d.key, action })
      setNotice({ ok: true, text: `${ACTION_DONE[action]} · ${shortDay(d.label)}` })
    } catch (e: any) {
      setNotice({ ok: e instanceof ApiError && e.status === 409, text: e?.message || 'Could not save' })
    } finally {
      setBusy(null)
      setReload((n) => n + 1)
      onChanged?.()
    }
  }
  const dayOpen = (d: Day) => !d.date || !data?.today || d.date <= data.today

  return (
    <div ref={cardRef} className="card !p-4 sm:!p-5 mb-6 scroll-mt-4 !z-30">
      <h2 className="text-lg mb-3">Find a member</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) pick(hits[0]); if (e.key === 'Escape') setOpen(false) }}
          placeholder="Name, ID (CCJ-10) or username"
          className="w-full pl-9 pr-9 py-2.5 text-base sm:text-sm"
          aria-label="Find a member"
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1" onClick={() => { setQ(''); setHits([]) }} aria-label="Clear search"><X className="w-4 h-4" /></button>}
        {open && q.trim().length >= 2 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-[#fffdf9] border border-black shadow-[4px_4px_0_#000] max-h-72 overflow-y-auto" role="listbox">
            {hits.map((h) => (
              <li key={h.id}>
                <button className="w-full text-left px-3 py-2.5 hover:bg-[#f3ead9] focus:bg-[#f3ead9] flex justify-between gap-3" onClick={() => pick(h)} role="option">
                  <span className="min-w-0"><span className="font-bold">{h.name}</span><span className="block text-xs text-gray-600 truncate">{h.committee ?? h.council ?? ''}</span></span>
                  <span className="text-sm font-bold whitespace-nowrap">{h.id}</span>
                </button>
              </li>
            ))}
            {!searching && hits.length === 0 && <li className="px-3 py-3 text-sm text-gray-500">No one matches{council ? ` in ${council}` : ''}.</li>}
            {searching && hits.length === 0 && <li className="px-3 py-3 text-sm text-gray-500">Searching…</li>}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-800">{error}</p>}

      {data && (
        <div className="mt-4 oc-pop-in">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight">{data.person.name}</p>
              <p className="text-sm text-gray-600">{data.person.id} · {data.person.council ?? '—'}{data.person.committee ? ` · ${data.person.committee}` : ''}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="oc-big-number !text-3xl text-[var(--oc-blue)]">{data.attendedDays}/{data.totalDays}</p>
              <p className="text-xs text-gray-500">days present</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            {data.days.map((d) => (
              <div key={d.key} className={`border p-3 ${d.attended ? 'border-[#0f5c38] bg-[#eaf6ef]' : 'border-black/20'}`}>
                <p className="text-xs uppercase tracking-wider text-gray-600">{shortDay(d.label)}</p>
                <p className={`mt-1 font-bold flex items-center gap-1.5 ${d.attended ? 'text-[#0f5c38]' : 'text-gray-400'}`}>
                  {d.attended ? <UserCheck className="w-4 h-4" /> : <CircleDashed className="w-4 h-4" />}
                  {d.attended ? (d.checkIn ? fmtTime(d.checkIn) : 'Present') : 'Not scanned'}
                </p>
                {d.checkOut && (
                  <p className="text-sm mt-1 flex items-center gap-1.5 text-[#6b21a8] font-bold">
                    <LogOut className="w-3.5 h-3.5" /> Out {fmtTime(d.checkOut)}
                  </p>
                )}
                {d.attended && d.manual && (
                  <p className="text-xs mt-1 text-[#7a4b00]">By hand{d.checkedInBy ? ` · ${d.checkedInBy}` : ''}</p>
                )}
                {'food' in d.meals && (
                  <p className={`text-sm mt-1 flex items-center gap-1.5 ${d.meals.food ? 'text-[#c2410c] font-bold' : 'text-gray-400'}`}>
                    <Utensils className="w-3.5 h-3.5" /> {d.meals.food ? 'Got food' : 'No food yet'}
                  </p>
                )}
                {data.canManual && dayOpen(d) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(!d.attended
                      ? [['checkin', 'Mark present']]
                      : [
                          d.checkOut ? ['undo-checkout', 'Undo check-out'] : ['checkout', 'Check out'],
                          ['undo-checkin', 'Undo check-in'],
                        ]
                    ).map(([action, label]) => {
                      const tag = `${d.key}:${action}`
                      const confirming = confirmUndo === tag
                      return (
                        <button
                          key={action}
                          type="button"
                          disabled={!!busy}
                          onClick={() => void runManual(d, action as ManualAction)}
                          className={`${action === 'checkin' ? 'btn-primary' : 'btn-secondary'} !px-2 !py-1 text-xs flex items-center gap-1 ${confirming ? '!bg-[#7a4b00] !text-white' : ''}`}
                        >
                          {busy === tag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : action === 'checkin' ? <Hand className="w-3.5 h-3.5" /> : action === 'checkout' ? <LogOut className="w-3.5 h-3.5" /> : <Undo2 className="w-3.5 h-3.5" />}
                          {confirming ? 'Tap again to confirm' : label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {notice && (
            <div className={`mt-3 border px-3 py-2 text-sm ${notice.ok ? 'border-[#0f5c38] bg-[#eaf6ef] text-[#0f5c38]' : 'border-red-700 bg-red-50 text-red-800'}`} role="status">{notice.text}</div>
          )}
          {data.canManual && <p className="text-xs text-gray-500 mt-2">Manual check-ins are saved with your name and marked "by hand" on the board and in exports.</p>}

          <h3 className="text-sm font-bold mt-4 mb-1">Scan history</h3>
          {data.history.length === 0 ? (
            <p className="text-sm text-gray-500">No scans yet.</p>
          ) : (
            <ul className="divide-y divide-black/10 max-h-64 overflow-y-auto">
              {data.history.map((h, i) => (
                <li key={`${h.at}-${i}`} className="py-2 text-sm flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1">
                      {!h.value && <Undo2 className="w-3.5 h-3.5 text-[#7a4b00]" />}
                      {h.value && h.checkOut && <LogOut className="w-3.5 h-3.5 text-[#6b21a8]" />}
                      {h.type === 'food' ? 'Food' : h.checkOut ? 'Check-out' : 'Check-in'}{h.manual ? ' (manual)' : ''}{h.dayKey ? ` · ${DAY_LABELS[h.dayKey] ?? h.dayKey}` : ''}{!h.value ? ' · undone' : ''}
                    </span>
                    <span className="block text-xs text-gray-500">{h.manual ? 'by hand, by' : 'by'} {h.scannedByName ?? h.scannedBy ?? 'unknown'}</span>
                  </span>
                  <span className="text-gray-500 whitespace-nowrap tabular-nums">{fmtStamp(h.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <button className="mt-3 text-sm underline" onClick={() => setSelectedId(null)}>Close</button>
        </div>
      )}
    </div>
  )
}
