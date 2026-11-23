import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

/**
 * Scan analytics for OC Conference '27.
 *
 * GET /api/scan-analytics?council=UNICEF&session=conf_day1
 *
 * Analytics accounts (Press Head, Secretariats) are always limited to the
 * council on their account; a council query parameter from them is ignored.
 * Full-access accounts may pick any council, or leave it empty for all.
 *
 * People counted: OC members (role "OC Member (<council>)") and delegates.
 * Phone numbers are never returned here.
 */
const router = express.Router()

interface SessionDef {
  key: string
  label: string
  attended: string
  meals: Record<string, string>
}

// Fixed whitelist: column names below are the only ones ever put into SQL.
const SESSIONS: SessionDef[] = [
  { key: 'day1', label: 'Session Day One (Nov 24)', attended: 'day1_session_attended', meals: {} },
  { key: 'day2', label: 'Session Day Two (Nov 25)', attended: 'day2_session_attended', meals: {} },
  { key: 'day3', label: 'Session Day Three (Nov 26)', attended: 'day3_session_attended', meals: {} },
  { key: 'conf_day1', label: 'Conference Day (Nov 27)', attended: 'conf_day1_attended', meals: { food: 'conf_day1_lunch' } },
]

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
    SELECT * FROM people WHERE $1::text IS NULL OR LOWER(council) = LOWER($1::text)
  )`

const n = (v: unknown) => Number(v ?? 0)

router.get('/', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const requested = typeof req.query.council === 'string' && req.query.council.trim() ? req.query.council.trim() : null
    const council = auth.access === 'analytics' ? auth.council : requested
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
        ? Promise.resolve({ rows: [{ council: auth.council }] })
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
      attended: n(t[`${s.key}.attended`]),
      checkedIn: n(t[`${s.key}.checkedIn`]),
      checkedOut: n(t[`${s.key}.checkedOut`]),
      meals: Object.fromEntries(Object.keys(s.meals).map((meal) => [meal, n(t[`${s.key}.meal.${meal}`])])),
    }))

    let people: any[] | undefined
    if (selected) {
      const r = await query(
        `${PEOPLE_CTE}
         SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS name, p.council, p.committee,
                COALESCE(p.${selected.attended}, FALSE) AS attended,
                p.${selected.key}_checkin AS "checkIn", p.${selected.key}_checkout AS "checkOut"${Object.entries(selected.meals).map(([meal, col]) => `, COALESCE(p.${col}, FALSE) AS "${meal}"`).join('')}
         FROM scoped p JOIN users u ON u.id = p.user_id
         ORDER BY p.id`,
        [council],
      )
      people = r.rows
    }

    res.json({
      scope: { council, locked: auth.access === 'analytics' },
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
    const requested = typeof req.query.council === 'string' && req.query.council.trim() ? req.query.council.trim() : null
    const council = auth.access === 'analytics' ? auth.council : requested
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
    const requested = typeof req.query.council === 'string' && req.query.council.trim() ? req.query.council.trim() : null
    const council = auth.access === 'analytics' ? auth.council : requested
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000)
    const r = await query(
      `${PEOPLE_CTE}
       SELECT p.id, CONCAT(u.first_name, ' ', u.last_name) AS name, p.council,
              a.activity_type AS type, a.title, a.description,
              COALESCE((a.metadata->>'value')::boolean, TRUE) AS value,
              a.metadata->>'dayKey' AS "dayKey",
              a.metadata->>'scannedBy' AS "scannedBy",
              NULLIF(CONCAT(su.first_name, ' ', su.last_name), ' ') AS "scannedByName",
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
    res.json({ scope: { council, locked: auth.access === 'analytics' }, entries: r.rows })
  } catch (error) {
    console.error('Scan log error:', error)
    res.status(500).json({ error: 'Failed to load scan log' })
  }
})

// Every person in scope with each day's attendance and food, for spreadsheet export
router.get('/export', async (req: Request, res: Response) => {
  try {
    const auth = req.auth!
    const requested = typeof req.query.council === 'string' && req.query.council.trim() ? req.query.council.trim() : null
    const council = auth.access === 'analytics' ? auth.council : requested
    const cols = SESSIONS.flatMap((s) => [
      `COALESCE(p.${s.attended}, FALSE) AS "${s.key}.attended"`,
      `p.${s.key}_checkin AS "${s.key}.checkIn"`,
      ...Object.entries(s.meals).map(([meal, col]) => `COALESCE(p.${col}, FALSE) AS "${s.key}.${meal}"`),
    ]).join(', ')
    const r = await query(
      `${PEOPLE_CTE}
       SELECT p.id, u.first_name AS "firstName", u.last_name AS "lastName", p.council, p.committee, ${cols}
       FROM scoped p JOIN users u ON u.id = p.user_id
       ORDER BY p.id`,
      [council],
    )
    res.json({
      scope: { council, locked: auth.access === 'analytics' },
      sessions: SESSIONS.map((s) => ({ key: s.key, label: s.label, meals: Object.keys(s.meals) })),
      people: r.rows,
    })
  } catch (error) {
    console.error('Scan export error:', error)
    res.status(500).json({ error: 'Failed to export' })
  }
})

export default router
