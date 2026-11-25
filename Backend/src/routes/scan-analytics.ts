import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

/**
 * Scan analytics for OC Conference '27.
 *
 * GET /api/scan-analytics?council=UNICEF&session=conf_day1
 *
 * Analytics accounts are always limited to the scope on their account: Press
 * Head and Secretariats to their council, OC team heads to their OC team
 * (members.committee, so they see OC members of that team in every council
 * and no delegates). A council query parameter from them is ignored.
 * Full-access accounts may pick any council, or leave it empty for all.
 *
 * People counted: OC members (role "OC Member (<council>)") and delegates.
 * Phone numbers are never returned here.
 */
const router = express.Router()

export interface SessionDef {
  key: string
  label: string
  attended: string
  meals: Record<string, string>
  /** dayKey the scanner stores in activity_timeline.metadata */
  dayKey: string
  /** Cairo date of the day (YYYY-MM-DD) */
  date: string
}

// Fixed whitelist: column names below are the only ones ever put into SQL.
export const SESSIONS: SessionDef[] = [
  { key: 'day1', label: 'Session Day One (Nov 24)', attended: 'day1_session_attended', meals: {}, dayKey: 'sessions.day1', date: '2026-11-24' },
  { key: 'day2', label: 'Session Day Two (Nov 25)', attended: 'day2_session_attended', meals: {}, dayKey: 'sessions.day2', date: '2026-11-25' },
  { key: 'day3', label: 'Session Day Three (Nov 26)', attended: 'day3_session_attended', meals: {}, dayKey: 'sessions.day3', date: '2026-11-26' },
  { key: 'conf_day1', label: 'Conference Day (Nov 27)', attended: 'conf_day1_attended', meals: { food: 'conf_day1_lunch' }, dayKey: 'conference.day1', date: '2026-11-27' },
]

/** Today's date in Cairo as YYYY-MM-DD, from the server clock. */
export const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

/**
 * How this person's current check-in for one day was recorded: the newest
 * check-in entry in the scan log for that day (QR scan or manual) and who did it.
 * Adds columns "<key>.inManual" and "<key>.inBy". Joined LATERAL on p.
 */
const lastCheckInJoin = (s: SessionDef) => `
  LEFT JOIN LATERAL (
    SELECT COALESCE((a.metadata->>'manual')::boolean, FALSE) AS manual,
           COALESCE(NULLIF(CONCAT(su.first_name, ' ', su.last_name), ' '), a.metadata->>'scannedBy') AS by
    FROM activity_timeline a
    LEFT JOIN members sm ON sm.id = a.metadata->>'scannedBy'
    LEFT JOIN users su ON su.id = sm.user_id
    WHERE a.user_id = p.user_id AND a.activity_type = 'attendance'
      AND a.metadata->>'dayKey' = '${s.dayKey}'
      AND NOT COALESCE((a.metadata->>'checkOut')::boolean, FALSE)
      AND COALESCE((a.metadata->>'value')::boolean, TRUE)
    ORDER BY a.created_at DESC
    LIMIT 1
  ) li_${s.key} ON COALESCE(p.${s.attended}, FALSE) OR p.${s.key}_checkin IS NOT NULL`
/** Same for the current check-out: columns "<key>.outManual" and "<key>.outBy". */
const lastCheckOutJoin = (s: SessionDef) => `
  LEFT JOIN LATERAL (
    SELECT COALESCE((a.metadata->>'manual')::boolean, FALSE) AS manual,
           COALESCE(NULLIF(CONCAT(su.first_name, ' ', su.last_name), ' '), a.metadata->>'scannedBy') AS by
    FROM activity_timeline a
    LEFT JOIN members sm ON sm.id = a.metadata->>'scannedBy'
    LEFT JOIN users su ON su.id = sm.user_id
    WHERE a.user_id = p.user_id AND a.activity_type = 'attendance'
      AND a.metadata->>'dayKey' = '${s.dayKey}'
      AND COALESCE((a.metadata->>'checkOut')::boolean, FALSE)
      AND COALESCE((a.metadata->>'value')::boolean, TRUE)
    ORDER BY a.created_at DESC
    LIMIT 1
  ) lo_${s.key} ON p.${s.key}_checkout IS NOT NULL`
const lastCheckOutCols = (s: SessionDef) => `COALESCE(lo_${s.key}.manual, FALSE) AS "${s.key}.outManual", lo_${s.key}.by AS "${s.key}.outBy"`
const lastCheckInCols = (s: SessionDef) => `COALESCE(li_${s.key}.manual, FALSE) AS "${s.key}.inManual", li_${s.key}.by AS "${s.key}.inBy"`

const sessionColumns = SESSIONS.flatMap((s) => [s.attended, `${s.key}_checkin`, `${s.key}_checkout`, ...Object.values(s.meals)])
const colList = (alias: string) => sessionColumns.map((c) => `${alias}.${c}`).join(', ')

const PEOPLE_CTE = `
  WITH people AS (
    SELECT m.id, m.user_id, substring(m.role from '^OC Member \\((.*)\\)$') AS council, m.committee, 'member' AS kind, ${colList('m')}
    FROM members m
    WHERE m.role LIKE 'OC Member (%' AND NOT m.inactive
    UNION ALL
    SELECT d.id, d.user_id, d.council, NULL::varchar AS committee, 'delegate' AS kind, ${colList('d')}
    FROM delegates d
  ),
  scoped AS (
    SELECT * FROM people
    WHERE $1::text IS NULL
       OR CASE WHEN $1::text LIKE 'team:%'
               THEN LOWER(committee) = LOWER(substr($1::text, 6))
               ELSE LOWER(council) = LOWER($1::text) END
  )`

/**
 * The value for PEOPLE_CTE's $1: a council name, "team:<OC team>" for a team
 * head, or null for everyone. Analytics accounts always get their own scope;
 * full-access accounts may pass ?council= to narrow the board.
 */
const TEAM_PREFIX = 'team:'
type Auth = NonNullable<Request['auth']>
const lockedScope = (auth: Auth): string | null =>
  auth.access === 'analytics' ? (auth.team ? `${TEAM_PREFIX}${auth.team}` : auth.council) : null
function scopeFor(req: Request): string | null {
  const auth = req.auth!
  if (auth.access === 'analytics') return lockedScope(auth)
  return typeof req.query.council === 'string' && req.query.council.trim() ? req.query.council.trim() : null
}
/** What the page shows as the scope: council or team, and whether it is fixed. */
const scopeOut = (auth: Auth, key: string | null) => ({
  council: key && !key.startsWith(TEAM_PREFIX) ? key : null,
  team: key && key.startsWith(TEAM_PREFIX) ? key.slice(TEAM_PREFIX.length) : null,
  locked: auth.access === 'analytics',
})
const scopeName = (key: string | null) => (key && key.startsWith(TEAM_PREFIX) ? key.slice(TEAM_PREFIX.length) : key)

const n = (v: unknown) => Number(v ?? 0)

router.get('/', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const council = scopeFor(req)
    const sessionKey = typeof req.query.session === 'string' ? req.query.session : null
    const selected = SESSIONS.find((s) => s.key === sessionKey) ?? null

    const sums = SESSIONS.map((s) => [
      `COUNT(*) FILTER (WHERE ${s.attended}) AS "${s.key}.attended"`,
      `COUNT(${s.key}_checkin) AS "${s.key}.checkedIn"`,
      `COUNT(${s.key}_checkout) AS "${s.key}.checkedOut"`,
      ...Object.entries(s.meals).map(([meal, col]) => `COUNT(*) FILTER (WHERE ${col}) AS "${s.key}.meal.${meal}"`),
    ].join(', ')).join(', ')

    const [totalsRes, committeeRes, councilsRes, recentRes] = await Promise.all([
      query(`${PEOPLE_CTE} SELECT COUNT(*) AS total, ${sums} FROM scoped`, [council]),
      query(
        `${PEOPLE_CTE}
         SELECT COALESCE(committee, 'Delegates') AS committee, COUNT(*) AS total,
                ${SESSIONS.map((s) => `COUNT(*) FILTER (WHERE ${s.attended}) AS "${s.key}"`).join(', ')}
         FROM scoped GROUP BY 1 ORDER BY 1`,
        [council],
      ),
      auth.access === 'analytics'
        ? Promise.resolve({ rows: auth.council ? [{ council: auth.council }] : [] })
        : query(`${PEOPLE_CTE} SELECT DISTINCT council FROM people WHERE council IS NOT NULL ORDER BY 1`, [null]),
      query(
        `${PEOPLE_CTE}
         SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS name, p.council, p.committee,
                a.activity_type AS type, a.title, a.created_at AS "at"
         FROM activity_timeline a
         JOIN scoped p ON p.user_id = a.user_id
         JOIN users u ON u.id = p.user_id
         ORDER BY a.created_at DESC
         LIMIT 30`,
        [council],
      ),
    ])

    const t: any = totalsRes.rows[0] ?? {}
    const sessions = SESSIONS.map((s) => ({
      key: s.key,
      label: s.label,
      date: s.date,
      attended: n(t[`${s.key}.attended`]),
      checkedIn: n(t[`${s.key}.checkedIn`]),
      checkedOut: n(t[`${s.key}.checkedOut`]),
      meals: Object.fromEntries(Object.keys(s.meals).map((meal) => [meal, n(t[`${s.key}.meal.${meal}`])])),
    }))

    let people: any[] | undefined
    if (selected) {
      const r = await query(
        `${PEOPLE_CTE}
         SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS name, p.council, p.committee, p.kind,
                COALESCE(p.${selected.attended}, FALSE) AS attended,
                p.${selected.key}_checkin AS "checkIn", p.${selected.key}_checkout AS "checkOut"${Object.entries(selected.meals).map(([meal, col]) => `, COALESCE(p.${col}, FALSE) AS "${meal}"`).join('')},
                COALESCE(li_${selected.key}.manual, FALSE) AS "manual", li_${selected.key}.by AS "checkedInBy",
                COALESCE(lo_${selected.key}.manual, FALSE) AS "outManual", lo_${selected.key}.by AS "checkedOutBy"
         FROM scoped p JOIN users u ON u.id = p.user_id
         ${lastCheckInJoin(selected)}
         ${lastCheckOutJoin(selected)}
         ORDER BY p.id`,
        [council],
      )
      people = r.rows
    }

    res.json({
      scope: scopeOut(auth, council),
      canManual: auth.manualCheckin,
      today: cairoToday(),
      councils: councilsRes.rows.map((r: any) => r.council),
      total: n(t.total),
      sessions,
      byCommittee: committeeRes.rows.map((r: any) => ({
        committee: r.committee,
        total: n(r.total),
        attended: Object.fromEntries(SESSIONS.map((s) => [s.key, n(r[s.key])])),
      })),
      recent: recentRes.rows,
      ...(people ? { session: selected!.key, meals: Object.keys(selected!.meals), people } : {}),
    })
  } catch (error) {
    console.error('Scan analytics error:', error)
    res.status(500).json({ error: 'Failed to load scan analytics' })
  }
})

// Tiny change marker so the board can poll every couple of seconds cheaply
// and only reload when something was scanned, undone or cleared.
router.get('/version', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const council = scopeFor(req)
    const r = await query(
      `${PEOPLE_CTE}
       SELECT COUNT(a.*) AS n, MAX(a.created_at) AS last
       FROM activity_timeline a JOIN scoped p ON p.user_id = a.user_id
       WHERE a.activity_type IN ('attendance', 'food')`,
      [council],
    )
    const row: any = r.rows[0] ?? {}
    res.set('Cache-Control', 'no-store')
    res.json({ version: `${row.n ?? 0}:${row.last ? new Date(row.last).getTime() : 0}`, serverTime: new Date().toISOString() })
  } catch (error) {
    console.error('Scan version error:', error)
    res.status(500).json({ error: 'Failed' })
  }
})

// Who scanned whom and when (attendance and food, including undos), newest first
router.get('/log', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const council = scopeFor(req)
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000)
    const r = await query(
      `${PEOPLE_CTE}
       SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS name, p.council,
              a.activity_type AS type, a.title, a.description,
              COALESCE((a.metadata->>'value')::boolean, TRUE) AS value,
              COALESCE((a.metadata->>'checkOut')::boolean, FALSE) AS "checkOut",
              a.metadata->>'dayKey' AS "dayKey",
              a.metadata->>'scannedBy' AS "scannedBy",
              NULLIF(CONCAT(su.first_name, ' ', su.last_name), ' ') AS "scannedByName",
              COALESCE((a.metadata->>'manual')::boolean, FALSE) AS "manual",
              a.created_at AS "at"
       FROM activity_timeline a
       JOIN scoped p ON p.user_id = a.user_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN members sm ON sm.id = a.metadata->>'scannedBy'
       LEFT JOIN users su ON su.id = sm.user_id
       WHERE a.activity_type IN ('attendance', 'food')
       ORDER BY a.created_at DESC
       LIMIT ${limit}`,
      [council],
    )
    res.json({ scope: scopeOut(auth, council), entries: r.rows })
  } catch (error) {
    console.error('Scan log error:', error)
    res.status(500).json({ error: 'Failed to load scan log' })
  }
})

// Every person in scope with each day's attendance and food, for spreadsheet export
router.get('/export', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const council = scopeFor(req)
    const cols = SESSIONS.flatMap((s) => [
      `COALESCE(p.${s.attended}, FALSE) AS "${s.key}.attended"`,
      `p.${s.key}_checkin AS "${s.key}.checkIn"`,
      `p.${s.key}_checkout AS "${s.key}.checkOut"`,
      ...Object.entries(s.meals).map(([meal, col]) => `COALESCE(p.${col}, FALSE) AS "${s.key}.${meal}"`),
      lastCheckInCols(s),
      lastCheckOutCols(s),
    ]).join(', ')
    const r = await query(
      `${PEOPLE_CTE}
       SELECT p.id, u.first_name AS "firstName", u.last_name AS "lastName", p.council, p.committee, ${cols}
       FROM scoped p JOIN users u ON u.id = p.user_id
       ${SESSIONS.map(lastCheckInJoin).join('\n')}
       ${SESSIONS.map(lastCheckOutJoin).join('\n')}
       ORDER BY p.id`,
      [council],
    )
    res.json({
      scope: scopeOut(auth, council),
      sessions: SESSIONS.map((s) => ({ key: s.key, label: s.label, meals: Object.keys(s.meals) })),
      people: r.rows,
    })
  } catch (error) {
    console.error('Scan export error:', error)
    res.status(500).json({ error: 'Failed to export' })
  }
})

// Find people in scope by name, ID (CCJ-10) or username (their login email)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const council = scopeFor(req)
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : ''
    if (q.length < 2) return res.json({ results: [] })
    const like = `%${q.toLowerCase().replace(/[\\%_]/g, (c) => '\\' + c)}%`
    const r = await query(
      `${PEOPLE_CTE}
       SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS name, p.council, p.committee, p.kind
       FROM scoped p JOIN users u ON u.id = p.user_id
       WHERE LOWER(p.id) LIKE $2
          OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $2
          OR LOWER(split_part(COALESCE(u.email, ''), '@', 1)) LIKE $2
          OR LOWER(COALESCE(u.email, '')) = LOWER($3)
       ORDER BY (LOWER(p.id) = LOWER($3)) DESC, (LOWER(p.id) LIKE LOWER($3) || '%') DESC,
                CASE WHEN LOWER(p.id) LIKE LOWER($3) || '%' THEN p.id ELSE CONCAT(u.first_name, ' ', u.last_name) END
       LIMIT 12`,
      [council, like, q],
    )
    res.set('Cache-Control', 'no-store')
    res.json({ results: r.rows })
  } catch (error) {
    console.error('Scan search error:', error)
    res.status(500).json({ error: 'Search failed' })
  }
})

// One person's analytics: every day's attendance and scan time, food, and full scan history
router.get('/person/:id', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const council = lockedScope(auth)
    const id = String(req.params.id || '').trim().slice(0, 40)
    const r = await query(
      `${PEOPLE_CTE}
       SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) AS name, ${SESSIONS.map(lastCheckInCols).join(', ')}, ${SESSIONS.map(lastCheckOutCols).join(', ')}
       FROM scoped p JOIN users u ON u.id = p.user_id
       ${SESSIONS.map(lastCheckInJoin).join('\n')}
       ${SESSIONS.map(lastCheckOutJoin).join('\n')}
       WHERE UPPER(p.id) = UPPER($2)
       LIMIT 1`,
      [council, id],
    )
    const p: any = r.rows[0]
    if (!p) return res.status(404).json({ error: council ? `No one with that ID in ${scopeName(council)}` : 'No one with that ID' })

    const history = await query(
      `SELECT a.activity_type AS type, a.title,
              COALESCE((a.metadata->>'value')::boolean, TRUE) AS value,
              COALESCE((a.metadata->>'checkOut')::boolean, FALSE) AS "checkOut",
              a.metadata->>'dayKey' AS "dayKey",
              a.metadata->>'scannedBy' AS "scannedBy",
              NULLIF(CONCAT(su.first_name, ' ', su.last_name), ' ') AS "scannedByName",
              COALESCE((a.metadata->>'manual')::boolean, FALSE) AS "manual",
              a.created_at AS "at"
       FROM activity_timeline a
       LEFT JOIN members sm ON sm.id = a.metadata->>'scannedBy'
       LEFT JOIN users su ON su.id = sm.user_id
       WHERE a.user_id = $1 AND a.activity_type IN ('attendance', 'food')
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [p.user_id],
    )

    const days = SESSIONS.map((s) => ({
      key: s.key,
      label: s.label,
      attended: !!p[s.attended] || !!p[`${s.key}_checkin`],
      checkIn: p[`${s.key}_checkin`] ?? null,
      checkOut: p[`${s.key}_checkout`] ?? null,
      meals: Object.fromEntries(Object.entries(s.meals).map(([meal, col]) => [meal, !!p[col]])),
      date: s.date,
      manual: !!p[`${s.key}.inManual`],
      checkedInBy: p[`${s.key}.inBy`] ?? null,
      outManual: !!p[`${s.key}.outManual`],
      checkedOutBy: p[`${s.key}.outBy`] ?? null,
    }))
    res.set('Cache-Control', 'no-store')
    res.json({
      canManual: auth.manualCheckin && p.kind === 'member',
      today: cairoToday(),
      person: { id: p.id, name: p.name, council: p.council, committee: p.committee, kind: p.kind },
      days,
      attendedDays: days.filter((d) => d.attended).length,
      totalDays: days.length,
      history: history.rows,
    })
  } catch (error) {
    console.error('Scan person error:', error)
    res.status(500).json({ error: 'Failed to load this person' })
  }
})

/**
 * Manual check-in: mark an OC member present (or checked out) without their QR.
 *
 * POST /api/scan-analytics/manual  { id: "CCJ-10", session: "day1", action }
 *   action: "checkin" | "checkout" | "undo-checkin" | "undo-checkout"
 *
 * Only accounts with manual check-in (full access and the Secretariats, see
 * canManualCheckin) and only for people in their own scope (a Secretariat's
 * own council). Not for days that have not started yet. Duplicates get a 409
 * like the scanner's. Every change goes into the scan log with who did it and
 * manual: true, so it shows on the Live Board, history and exports.
 */
router.post('/manual', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    if (!auth.manualCheckin) return res.status(403).json({ error: 'Your account cannot check people in manually' })

    const id = String(req.body?.id ?? '').trim().toUpperCase().slice(0, 40)
    const s = SESSIONS.find((x) => x.key === req.body?.session)
    const action = String(req.body?.action ?? '')
    if (!id || !s || !['checkin', 'checkout', 'undo-checkin', 'undo-checkout'].includes(action)) {
      return res.status(400).json({ error: 'Need id, session and action' })
    }
    if (s.date > cairoToday()) return res.status(400).json({ error: `${s.label} has not started yet`, notYet: true })

    // Scope: same people the account sees on the Live Board (own council for
    // Secretariats, inactive members hidden). Only OC members are changed here.
    const council = lockedScope(auth)
    const found = await query(
      `${PEOPLE_CTE}
       SELECT p.id, p.user_id, p.kind, CONCAT(u.first_name, ' ', u.last_name) AS name
       FROM scoped p JOIN users u ON u.id = p.user_id
       WHERE UPPER(p.id) = $2 LIMIT 1`,
      [council, id],
    )
    const person: any = found.rows[0]
    if (!person) return res.status(404).json({ error: council ? `No one with ID ${id} in ${scopeName(council)}` : `No one with ID ${id}` })
    if (person.kind !== 'member') return res.status(400).json({ error: 'Manual check-in is for OC members only' })

    const att = s.attended
    const cin = `${s.key}_checkin`
    const cout = `${s.key}_checkout`
    const isIn = `(COALESCE(${att}, FALSE) OR ${cin} IS NOT NULL)`
    // Each update only applies when the change makes sense, so two people
    // pressing at the same time (or a QR scan at the same moment) cannot double up.
    // Column names come from the fixed SESSIONS whitelist only.
    let sql: string
    if (action === 'checkin') {
      sql = `UPDATE members SET ${att} = TRUE, ${cin} = COALESCE(${cin}, NOW()) WHERE id = $1 AND NOT ${isIn} RETURNING ${cin} AS at`
    } else if (action === 'checkout') {
      sql = `UPDATE members SET ${cout} = NOW() WHERE id = $1 AND ${isIn} AND ${cout} IS NULL RETURNING ${cout} AS at`
    } else if (action === 'undo-checkin') {
      sql = `UPDATE members SET ${att} = FALSE, ${cin} = NULL, ${cout} = NULL WHERE id = $1 AND ${isIn} RETURNING NOW() AS at`
    } else {
      sql = `UPDATE members SET ${cout} = NULL WHERE id = $1 AND ${cout} IS NOT NULL RETURNING NOW() AS at`
    }
    const upd = await query(sql, [person.id])

    if (upd.rows.length === 0) {
      const cur: any = (await query(`SELECT ${isIn} AS "in", ${cin} AS "checkIn", ${cout} AS "checkOut" FROM members WHERE id = $1`, [person.id])).rows[0] ?? {}
      if (action === 'checkin') return res.status(409).json({ error: 'Already marked present', duplicate: true, checkedInAt: cur.checkIn ?? null })
      if (action === 'checkout' && !cur.in) return res.status(409).json({ error: 'Not checked in on this day', notCheckedIn: true })
      if (action === 'checkout') return res.status(409).json({ error: 'Already checked out', duplicate: true, checkedOutAt: cur.checkOut ?? null })
      if (action === 'undo-checkin') return res.status(409).json({ error: 'Not checked in on this day, nothing to undo', nothing: true })
      return res.status(409).json({ error: 'Not checked out on this day, nothing to undo', nothing: true })
    }

    const checkOut = action === 'checkout' || action === 'undo-checkout'
    const value = action === 'checkin' || action === 'checkout'
    const description = { checkin: 'Checked in (manual)', checkout: 'Checked out (manual)', 'undo-checkin': 'Marked as absent (manual)', 'undo-checkout': 'Check-out undone (manual)' }[action]
    await query(
      `INSERT INTO activity_timeline (user_id, activity_type, title, description, metadata, created_at)
       VALUES ($1, 'attendance', $2, $3, $4, NOW())`,
      [
        person.user_id,
        `${s.dayKey} Attendance`,
        description,
        JSON.stringify({
          dayKey: s.dayKey,
          field: 'attendance',
          value,
          ...(checkOut ? { checkOut: true } : { checkIn: value }),
          scannedBy: auth.memberId,
          manual: true,
        }),
      ],
    )
    console.log(`[MANUAL] ${auth.memberId} ${action} ${person.id} ${s.key}`)
    res.json({ success: true, id: person.id, name: person.name, session: s.key, action, at: (upd.rows[0] as any).at })
  } catch (error) {
    console.error('Manual check-in error:', error)
    res.status(500).json({ error: 'Manual check-in failed' })
  }
})

export default router
