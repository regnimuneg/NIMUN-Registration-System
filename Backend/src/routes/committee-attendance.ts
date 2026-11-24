import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import { SESSIONS, cairoToday } from './scan-analytics.js'

/**
 * Committee attendance report for OC Conference '27.
 *
 * GET /api/committee-attendance
 *
 * Only OC-REG and OC-HB reach this (index.ts: FULL + requireCommitteeReport).
 * Returns every active OC member with their council, committee and, for each
 * day, whether they were present, when they checked in and when they checked
 * out. The page groups them by council or by committee and builds the lists
 * and summaries. Phone numbers and emails are never returned.
 *
 * Present on a day = the attended flag or a check-in time (same rule as the
 * Live Board and the person view).
 */
const router = express.Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Column names come only from the fixed SESSIONS whitelist.
    const cols = SESSIONS.flatMap((s) => [
      `(COALESCE(m.${s.attended}, FALSE) OR m.${s.key}_checkin IS NOT NULL) AS "${s.key}.present"`,
      `m.${s.key}_checkin AS "${s.key}.in"`,
      `m.${s.key}_checkout AS "${s.key}.out"`,
    ]).join(', ')
    const r = await query(
      `SELECT m.id, CONCAT(u.first_name, ' ', u.last_name) AS name,
              substring(m.role from '^OC Member \\((.*)\\)$') AS council,
              COALESCE(NULLIF(m.committee, ''), 'No committee') AS committee,
              ${cols}
       FROM members m JOIN users u ON u.id = m.user_id
       WHERE m.role LIKE 'OC Member (%' AND NOT m.inactive
       ORDER BY m.id`,
    )
    const today = cairoToday()
    const sessions = SESSIONS.map((s) => ({
      key: s.key,
      label: s.label,
      date: s.date,
      status: s.date < today ? 'past' : s.date === today ? 'today' : 'upcoming',
    }))
    const members = r.rows.map((row: any) => ({
      id: row.id,
      name: String(row.name ?? '').trim(),
      council: row.council ?? 'Unknown',
      committee: row.committee,
      days: Object.fromEntries(SESSIONS.map((s) => [s.key, {
        present: !!row[`${s.key}.present`],
        in: row[`${s.key}.in`] ?? null,
        out: row[`${s.key}.out`] ?? null,
      }])),
    }))
    res.set('Cache-Control', 'no-store')
    res.json({ today, generatedAt: new Date().toISOString(), sessions, members })
  } catch (error) {
    console.error('Committee attendance error:', error)
    res.status(500).json({ error: 'Failed to load committee attendance' })
  }
})

export default router
