import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { query } from '../config/index.js'

/**
 * Access levels:
 *   full       Highboard, Registration Affairs, admins: every endpoint
 *   scan       scanner staff: look people up and record check-ins
 *   analytics  Press Head, Secretariats: scan analytics for their own council
 */
export type AccessLevel = 'full' | 'scan' | 'analytics'

export interface AuthContext {
  userId: string
  memberId: string | null
  name: string
  access: AccessLevel
  /** For analytics accounts: the only council they may see. */
  council: string | null
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

export const SESSION_DAYS = 7

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

export function newToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  return { token, tokenHash: hashToken(token), expiresAt }
}

/** Work out an account's access level from members.permissions and role. */
export function accessFor(permissions: any, role: string | null): { access: AccessLevel; council: string | null } {
  const p = permissions && typeof permissions === 'object' ? permissions : {}
  if (p.access === 'full' || p.access === 'scan' || p.access === 'analytics') {
    return { access: p.access, council: p.access === 'analytics' ? (p.council ?? null) : null }
  }
  // NIMUN'26 accounts: {"admin": true, ...} or a role containing "admin"
  if (p.admin === true || p.super_admin === true || /admin/i.test(role ?? '')) return { access: 'full', council: null }
  if (p.check_in === true) return { access: 'scan', council: null }
  return { access: 'scan', council: null }
}

const mockAuthEnabled = () => process.env.NODE_ENV !== 'production' && process.env.MOCK_AUTH_ENABLED === 'true'

/** Rejects any request without a valid, unexpired, unrevoked session token. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) return res.status(401).json({ error: 'Sign in required' })

    if (token.startsWith('mock-')) {
      if (!mockAuthEnabled()) return res.status(401).json({ error: 'Session expired. Please sign in again.' })
      req.auth = { userId: 'mock-admin', memberId: 'MOCK-ADMIN', name: 'Local Admin', access: 'full', council: null }
      return next()
    }

    const result = await query(
      `SELECT s.user_id, s.member_id, m.role, m.permissions,
              CONCAT(u.first_name, ' ', u.last_name) AS name
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN members m ON m.id = s.member_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
      [hashToken(token)],
    )
    const row: any = result.rows[0]
    if (!row || !row.member_id) return res.status(401).json({ error: 'Session expired. Please sign in again.' })

    const { access, council } = accessFor(row.permissions, row.role)
    if (access === 'analytics' && !council) return res.status(403).json({ error: 'Account has no council assigned' })
    req.auth = { userId: row.user_id, memberId: row.member_id, name: row.name, access, council }
    next()
  } catch (error) {
    console.error('[AUTH] Session check failed:', error)
    res.status(500).json({ error: 'Failed to check session' })
  }
}

/** Allow only the listed access levels. Use after requireAuth. */
export const requireAccess = (...levels: AccessLevel[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.auth && levels.includes(req.auth.access)) return next()
    res.status(403).json({ error: 'Your account does not have access to this' })
  }

/** GET needs one set of levels, any other method another. */
export const byMethod = (read: AccessLevel[], write: AccessLevel[]) =>
  (req: Request, res: Response, next: NextFunction) =>
    requireAccess(...(req.method === 'GET' ? read : write))(req, res, next)

/**
 * Scanner (non-full) accounts may track delegates and OC members
 * (role "OC Member (...)"), but not staff accounts. Decided from the
 * server-side session, never from a requesterId sent by the browser.
 * Returns an error message, or null when allowed.
 */
export async function trackingBlockedReason(req: Request, participantId: string, what: string): Promise<string | null> {
  if (req.auth?.access === 'full') return null
  const target = await query(`SELECT role FROM members WHERE id = $1`, [participantId])
  const role: string | undefined = (target.rows[0] as any)?.role
  if (role !== undefined && !role.startsWith('OC Member')) {
    return `Scanner accounts cannot track ${what} for staff accounts. Only full-access accounts can.`
  }
  return null
}
