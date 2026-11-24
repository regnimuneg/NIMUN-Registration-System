import type { Request } from 'express'
import { query } from '../config/index.js'

export interface ScanPerson {
  source: 'delegate' | 'member' | 'invitation'
  userId: string | null
  name: string
  role: string | null
  inactive: boolean
}

/**
 * Everything a scan needs to know about one ID, in a single database round
 * trip (it used to take five separate lookups per scan).
 */
export async function lookupPerson(participantId: string): Promise<ScanPerson | null> {
  const r = await query(
    `SELECT p.source, p.user_id, p.role, p.inactive,
            TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS name, p.sort
     FROM (
       SELECT 'delegate' AS source, d.user_id, NULL::text AS role, FALSE AS inactive, 1 AS sort FROM delegates d WHERE d.id = $1
       UNION ALL
       SELECT 'member', m.user_id, m.role, COALESCE(m.inactive, FALSE), 2 FROM members m WHERE m.id = $1
       UNION ALL
       SELECT 'invitation', i.user_id, NULL::text, FALSE, 3 FROM invitations i WHERE i.id = $1
     ) p
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.sort
     LIMIT 1`,
    [participantId],
  )
  const row: any = r.rows[0]
  if (!row) return null
  return { source: row.source, userId: row.user_id ?? null, name: row.name || participantId, role: row.role ?? null, inactive: !!row.inactive }
}

/** Same rule as trackingBlockedReason, using an already loaded person. */
export function blockedFor(req: Request, person: ScanPerson | null, what: string): string | null {
  if (req.auth?.access === 'full') return null
  if (person?.source === 'member' && !(person.role ?? '').startsWith('OC Member')) {
    return `Scanner accounts cannot track ${what} for staff accounts. Only full-access accounts can.`
  }
  return null
}
