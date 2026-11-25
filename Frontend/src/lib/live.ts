import { useEffect, useRef, useState } from 'react'
import { api } from './api'

const POLL_MS = 2_000
const FULL_REFRESH_MS = 30_000

/**
 * Keeps a page live: checks the server's tiny change marker every 2 seconds
 * and calls load() as soon as a scan, undo or clear happens (and at least every
 * 30 seconds). Same approach the Live Board uses. Pauses while the tab is hidden.
 * Read-only: it only reads data, it never writes.
 */
export function useLiveReload(load: () => Promise<unknown>, scope?: string) {
  const versionRef = useRef<string | null>(null)
  const lastFullRef = useRef(0)
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    let stopped = false
    let busy = false
    versionRef.current = null
    const tick = async (force = false) => {
      if (busy || stopped || (document.hidden && !force)) return
      busy = true
      try {
        const v = await api.getScanVersion(scope || undefined).catch(() => null)
        const changed = !!v?.version && v.version !== versionRef.current
        if (force || changed || Date.now() - lastFullRef.current > FULL_REFRESH_MS) {
          if (v?.version) versionRef.current = v.version
          lastFullRef.current = Date.now()
          await loadRef.current()
        }
      } finally { busy = false }
    }
    void tick(true)
    const t = setInterval(() => void tick(), POLL_MS)
    const onVisible = () => { if (!document.hidden) void tick(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stopped = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [scope])
}

/**
 * Which of these keys are new since the last update (not on first load), so
 * the page can flash them. Keys stay "new" for about 3 seconds. Pass resetKey
 * (e.g. the day shown) once data has loaded; changing it starts over without flashing.
 */
export function useFreshKeys(keys: string[], resetKey?: string): Set<string> {
  const seen = useRef<Set<string> | null>(null)
  const reset = useRef(resetKey)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const sig = keys.join('|')
  useEffect(() => {
    if (resetKey === undefined) return // data not loaded yet
    if (seen.current === null || reset.current !== resetKey) { seen.current = new Set(keys); reset.current = resetKey; setFresh(new Set()); return }
    const added = keys.filter((k) => !seen.current!.has(k))
    keys.forEach((k) => seen.current!.add(k))
    if (!added.length) return
    setFresh(new Set(added))
    const t = setTimeout(() => setFresh(new Set()), 3000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, resetKey])
  return fresh
}

/** Re-renders every second, for "updated 12 s ago" labels. */
export function useTick(ms = 1000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}
