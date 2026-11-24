import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Inbox } from 'lucide-react'
import { DAYS } from '../lib/days'

/**
 * Shared building blocks for every OC '27 page, so headers, numbers, panels,
 * lists, empty and loading states look and read the same everywhere.
 * Styles live in app/index.css under "Shared page parts".
 */

export type Tone = 'blue' | 'good' | 'warn' | 'bad' | 'out' | 'food' | 'ink'

export function PageHeader({ eyebrow, title, meta, actions }: { eyebrow?: ReactNode; title: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="oc-page-head">
      <div className="min-w-0">
        {eyebrow && <p className="oc-eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-4xl">{title}</h1>
        {meta && <p className="oc-page-meta">{meta}</p>}
      </div>
      {actions && <div className="oc-page-actions">{actions}</div>}
    </header>
  )
}

/** Day picker used on the Live Board and Committees. Two per row on phones. */
export function DayTabs({ value, onChange, today, keys, before }: {
  value: string
  onChange: (key: string) => void
  /** today's session key, if any */
  today?: string | null
  /** which days to show (default: all four) */
  keys?: string[]
  /** extra tab shown first, e.g. "All days" */
  before?: { key: string; label: string; sub?: string }
}) {
  const days = keys ? DAYS.filter((d) => keys.includes(d.key)) : DAYS
  return (
    <div className="oc-day-tabs" role="group" aria-label="Day">
      {before && (
        <button type="button" className="oc-day-tab" aria-pressed={value === before.key} onClick={() => onChange(before.key)}>
          <span className="oc-day-tab-name">{before.label}</span>
          <span className="oc-day-tab-date">{before.sub ?? 'Summary'}</span>
        </button>
      )}
      {days.map((d) => (
        <button key={d.key} type="button" className="oc-day-tab" aria-pressed={value === d.key} onClick={() => onChange(d.key)} title={`${d.name} · ${d.date}`}>
          <span className="oc-day-tab-name">{d.short}</span>
          <span className="oc-day-tab-date">{d.date}{d.key === today && <b className="oc-today-tag">Today</b>}</span>
        </button>
      ))}
    </div>
  )
}

export function AnimatedNumber({ value }: { value: number }) {
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

/** One key number. */
export function StatTile({ label, value, sub, icon, tone = 'ink', onClick, active }: {
  label: string
  value: number | string
  sub?: ReactNode
  icon?: ReactNode
  tone?: Tone
  onClick?: () => void
  active?: boolean
}) {
  const body = (
    <>
      <p className="oc-stat-label">{icon}{label}</p>
      <p className="oc-stat-value">{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</p>
      {sub && <p className="oc-stat-sub">{sub}</p>}
    </>
  )
  const cls = `oc-stat oc-tone-${tone}${active ? ' is-active' : ''}`
  return onClick
    ? <button type="button" className={`${cls} oc-stat-button`} onClick={onClick} aria-pressed={!!active}>{body}</button>
    : <div className={cls}>{body}</div>
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 }) {
  return <div className={`oc-stat-grid oc-cols-${cols} oc-stagger`}>{children}</div>
}

/** A titled box. */
export function Panel({ title, icon, actions, children, className = '', id }: { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`oc-panel ${className}`} id={id}>
      {(title || actions) && (
        <div className="oc-panel-head">
          {title && <h2 className="oc-panel-title">{icon}{title}</h2>}
          {actions && <div className="oc-panel-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export interface Attention { tone: 'bad' | 'warn' | 'good' | 'info'; text: ReactNode }

/** "At a glance" box at the top of a page: one headline, a few facts, then anything that needs attention. */
export function Summary({ headline, facts, attention, aside }: { headline: ReactNode; facts?: ReactNode[]; attention?: Attention[]; aside?: ReactNode }) {
  const items = (attention ?? []).filter(Boolean)
  return (
    <section className="oc-summary oc-pop-in" aria-label="At a glance">
      <div className="oc-summary-main">
        <p className="oc-eyebrow">At a glance</p>
        <p className="oc-summary-headline">{headline}</p>
        {facts && facts.length > 0 && (
          <ul className="oc-summary-facts">{facts.filter(Boolean).map((f, i) => <li key={i}>{f}</li>)}</ul>
        )}
        {items.length > 0 && (
          <ul className="oc-attention">
            {items.map((a, i) => (
              <li key={i} className={`oc-attention-${a.tone}`}>
                {a.tone === 'good' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : a.tone === 'info' ? <Info className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {aside && <div className="oc-summary-aside">{aside}</div>}
    </section>
  )
}

/** Ring showing a percentage. */
export function Ring({ value, label }: { value: number; label?: string }) {
  return (
    <div className="oc-ring" style={{ ['--p' as string]: value } as CSSProperties} role="img" aria-label={`${value}% ${label ?? ''}`}>
      <div><span className="oc-big-number !text-2xl">{value}%</span></div>
    </div>
  )
}

/** Label, count and a bar. */
export function ProgressRow({ label, n, d, sub, tone = 'blue', onClick, title, second }: {
  label: ReactNode
  n: number
  d: number
  sub?: ReactNode
  tone?: 'blue' | 'food' | 'warn' | 'bad'
  onClick?: () => void
  title?: string
  /** optional second, thinner bar (e.g. food) */
  second?: { n: number; tone: 'food' | 'out'; label: string }
}) {
  const p = d > 0 ? Math.round((n / d) * 100) : 0
  const inner = (
    <>
      <div className="oc-progress-top">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums">{n} / {d} · <b>{p}%</b></span>
      </div>
      <div className={`oc-bar is-${tone}`}><span style={{ width: `${p}%` }} /></div>
      {second && <div className={`oc-bar oc-bar-thin is-${second.tone}`} title={second.label}><span style={{ width: `${d > 0 ? Math.round((second.n / d) * 100) : 0}%` }} /></div>}
      {sub && <p className="oc-progress-sub">{sub}</p>}
    </>
  )
  return onClick
    ? <button type="button" className="oc-progress oc-progress-button" onClick={onClick} title={title}>{inner}</button>
    : <div className="oc-progress" title={title}>{inner}</div>
}

export function Notice({ tone = 'info', children, onClose }: { tone?: 'info' | 'good' | 'warn' | 'bad'; children: ReactNode; onClose?: () => void }) {
  return (
    <div className={`oc-notice oc-notice-${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <span className="min-w-0">{children}</span>
      {onClose && <button type="button" className="oc-notice-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  )
}

export function EmptyState({ icon, title, text, compact }: { icon?: ReactNode; title: string; text?: ReactNode; compact?: boolean }) {
  return (
    <div className={`oc-empty${compact ? ' is-compact' : ''}`}>
      <span className="oc-empty-icon" aria-hidden="true">{icon ?? <Inbox className="w-6 h-6" />}</span>
      <p className="oc-empty-title">{title}</p>
      {text && <p className="oc-empty-text">{text}</p>}
    </div>
  )
}

export function Badge({ tone = 'ink', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span className={`oc-badge oc-tone-${tone}`} title={title}>{children}</span>
}

/** Grey placeholder blocks shown while a page loads. */
export function LoadingPage({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="jn-shell" aria-busy="true" aria-label="Loading">
      <div className="oc-skeleton h-10 w-64 mb-3" />
      <div className="oc-skeleton h-4 w-48 mb-6" />
      <div className="oc-skeleton h-28 mb-4" />
      <div className={`oc-stat-grid oc-cols-${tiles === 3 ? 3 : 4} mb-6`}>
        {Array.from({ length: tiles }, (_, i) => <div key={i} className="oc-skeleton h-24" />)}
      </div>
      <div className="oc-skeleton h-72" />
    </div>
  )
}
