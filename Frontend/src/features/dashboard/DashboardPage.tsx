import { useCallback, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Users, UserCheck, UserX, LogOut, Smartphone, BarChart3, ClipboardList, Trash2, RefreshCw, ArrowRight, CalendarClock } from 'lucide-react'
import { api, tokenManager } from '../../lib/api'
import { LiveClock, todayDayKey, fmtTime } from '../../lib/clock'
import { DAYS, dayMeta, dayStatus, missingWord, pct, cairoIso, ago } from '../../lib/days'
import { PageHeader, StatTile, StatGrid, Panel, Summary, Ring, ProgressRow, Notice, LoadingPage, LiveStatus } from '../../components/ui'
import { useLiveReload } from '../../lib/live'
import { serverNow } from '../../lib/clock'

interface SessionStat { key: string; label: string; date?: string; attended: number; checkedIn: number; checkedOut: number }
interface Person { id: string; council: string | null; attended: boolean; checkIn: string | null; checkOut: string | null; kind?: string }
interface Board { total: number; today?: string; sessions: SessionStat[]; people?: Person[]; recent?: { at: string }[] }


/** The day the dashboard talks about: today during the conference, else the nearest one. */
function focusDay() {
  return todayDayKey() ?? (cairoIso() < DAYS[0].iso ? DAYS[0].key : DAYS[DAYS.length - 1].key)
}

export default function DashboardPage() {
  const [board, setBoard] = useState<Board | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [dayKey] = useState(focusDay)
  const user = tokenManager.getUser()

  const load = useCallback(async () => {
    try {
      setError(null)
      const [res, logRes] = await Promise.all([
        api.getScanAnalytics({ session: dayKey }),
        api.getScanLog({ limit: 1 }).catch(() => null),
      ])
      setBoard(res)
      setLastScan(logRes?.entries?.[0]?.at ?? null)
      setUpdatedAt(serverNow())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard')
    } finally {
      setLoading(false)
    }
  }, [dayKey])

  // Updates within ~2 seconds of any scan, like the Live Board
  useLiveReload(load)

  const handleClearTracking = async (dataType: string) => {
    if (!confirm(`Are you sure you want to clear all ${dataType} tracking data? This action cannot be undone.`)) {
      return
    }

    try {
      setClearing(dataType)
      await api.clearTrackingData(dataType)
      alert(`${dataType} tracking data cleared successfully`)
      void load()
    } catch (err) {
      alert(`Failed to clear ${dataType} tracking data`)
      console.error(err)
    } finally {
      setClearing(null)
    }
  }

  const people = board?.people ?? []
  const isIn = (p: Person) => p.attended || !!p.checkIn
  const byCouncil = useMemo(() => {
    const m = new Map<string, { total: number; present: number }>()
    for (const p of people) {
      const k = p.council ?? 'Other'
      const v = m.get(k) ?? { total: 0, present: 0 }
      v.total++
      if (isIn(p)) v.present++
      m.set(k, v)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [people])

  if (loading && !board) return <LoadingPage tiles={4} />

  const total = board?.total ?? 0
  const present = people.filter(isIn).length
  const out = people.filter((p) => !!p.checkOut).length
  const missing = Math.max(0, total - present)
  const today = board?.today ?? cairoIso()
  const status = dayStatus(dayKey, today)
  const meta = dayMeta(dayKey)!
  const missWord = missingWord(status)
  const lowest = byCouncil.map(([name, v]) => ({ name, ...v, p: pct(v.present, v.total) })).sort((a, b) => a.p - b.p)[0]

  const headline = status === 'upcoming'
    ? <>The conference starts on <b>{meta.date}</b> with {meta.name}. <b>{total}</b> OC members are registered.</>
    : status === 'today'
      ? <>Today is <b>{meta.name}</b>. <b>{present} of {total}</b> are in ({pct(present, total)}%), <b>{missing}</b> not in yet.</>
      : <>The conference is over. On {meta.name}, <b>{present} of {total}</b> came ({pct(present, total)}%).</>

  const links = [
    { href: '/member/scanner', icon: Smartphone, title: 'Scanner', text: 'Check people in, out and food' },
    { href: '/analytics/scans', icon: BarChart3, title: 'Live Board', text: 'Who is in, who is missing, live' },
    ...(tokenManager.canSeeCommitteeReport() ? [{ href: '/analytics/committees', icon: ClipboardList, title: 'Committees', text: 'Attendance by council or committee' }] : []),
    { href: '/admin/participants', icon: Users, title: 'Participants', text: 'Member list, QR codes, edits' },
  ]

  return (
    <div className="jn-shell">
      <PageHeader
        eyebrow={<><LiveStatus updatedAt={updatedAt} error={!!error} /> · <LiveClock /></>}
        title="Dashboard"
        meta={<>OC Conference &apos;27{user?.name ? ` · ${user.name}` : ''}</>}
        actions={
          <button onClick={() => void load()} className="btn-primary flex items-center gap-2 px-4 py-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      {error && <Notice tone="bad">{error}</Notice>}

      {board && (
        <>
          <Summary
            headline={headline}
            facts={status === 'upcoming' ? [] : [
              <>Checked out <b>{out}</b></>,
              <>Still here <b>{Math.max(0, present - out)}</b></>,
              <>Last scan <b>{lastScan ? `${fmtTime(lastScan)} (${ago(lastScan)})` : 'none yet'}</b></>,
            ]}
            attention={status === 'upcoming' ? [] : [
              ...(lowest && byCouncil.length > 1 && present > 0 ? [{ tone: 'warn' as const, text: <>Lowest council {status === 'today' ? 'today' : 'that day'}: <b>{lowest.name}</b>, {lowest.present} of {lowest.total} ({lowest.p}%).</> }] : []),
              { tone: 'info' as const, text: <a href="/analytics/scans" className="underline inline-flex items-center gap-1">Open the Live Board for names and the scan log <ArrowRight className="w-3.5 h-3.5" /></a> },
            ]}
            aside={status === 'upcoming' ? <CalendarClock className="w-14 h-14 text-[var(--oc-blue)]" /> : <Ring value={pct(present, total)} label="present" />}
          />

          <StatGrid cols={4}>
            <StatTile label="OC members" icon={<Users />} tone="ink" value={total} sub="active, all councils" />
            <StatTile label="Present" icon={<UserCheck />} tone="blue" value={status === 'upcoming' ? '—' : present} sub={status === 'upcoming' ? 'not started' : `${meta.short} · ${pct(present, total)}%`} />
            <StatTile label={missWord} icon={<UserX />} tone={status === 'past' ? 'bad' : 'warn'} value={status === 'upcoming' ? '—' : missing} sub={status === 'upcoming' ? meta.date : meta.short} />
            <StatTile label="Checked out" icon={<LogOut />} tone="out" value={status === 'upcoming' ? '—' : out} sub={status === 'upcoming' ? '' : `of ${present} who came`} />
          </StatGrid>

          <div className="grid lg:grid-cols-2 gap-x-6">
            <Panel title={<>By council · {meta.short}</>}>
              <div className="space-y-4">
                {byCouncil.map(([name, v]) => (
                  <ProgressRow key={name} label={name} n={status === 'upcoming' ? 0 : v.present} d={v.total} sub={status === 'upcoming' ? `${v.total} members` : `${v.total - v.present} ${missWord.toLowerCase()}`} />
                ))}
              </div>
            </Panel>
            <Panel title="All four days">
              <div className="space-y-4">
                {DAYS.map((d) => {
                  const s = board.sessions.find((x) => x.key === d.key)
                  const st = dayStatus(d.key, today)
                  const n = s ? Math.max(s.attended ?? 0, s.checkedIn ?? 0) : 0
                  return (
                    <ProgressRow
                      key={d.key}
                      label={`${d.short} · ${d.date}`}
                      n={st === 'upcoming' ? 0 : n}
                      d={total}
                      sub={st === 'upcoming' ? 'Not started' : st === 'today' ? 'Today, still going' : `${Math.max(0, total - n)} absent`}
                    />
                  )
                })}
              </div>
            </Panel>
          </div>
        </>
      )}

      <h2 className="oc-panel-title mt-2 mb-3">Go to</h2>
      <div className="oc-links oc-stagger mb-8">
        {links.map(({ href, icon: Icon, title, text }) => (
          <a key={href} href={href} className="oc-link-card">
            <Icon />
            <span className="oc-link-title">{title}</span>
            <span className="oc-link-text">{text}</span>
          </a>
        ))}
      </div>

      {/* Data management: unchanged actions, full-access accounts only (the page itself is admin-only) */}
      <Panel title="Data management" className="!border-[var(--oc-bad)]">
        <p className="text-xs sm:text-sm text-gray-600 mb-3">Clears every scan of that kind for everyone. This cannot be undone.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleClearTracking('attendance')}
            disabled={clearing !== null}
            className="jn-sticker-button px-4 py-3"
            style={{ '--button-color': 'var(--oc-bad)' } as CSSProperties}
          >
            <Trash2 className="w-4 h-4" />
            {clearing === 'attendance' ? 'Clearing...' : 'Clear Attendance'}
          </button>
          <button
            onClick={() => handleClearTracking('food')}
            disabled={clearing !== null}
            className="jn-sticker-button px-4 py-3"
            style={{ '--button-color': 'var(--jn-orange)' } as CSSProperties}
          >
            <Trash2 className="w-4 h-4" />
            {clearing === 'food' ? 'Clearing...' : 'Clear Food'}
          </button>
        </div>
      </Panel>
    </div>
  )
}
