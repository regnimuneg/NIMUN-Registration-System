import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import bcrypt from 'bcrypt'
import { accessFor, hashToken, newToken, requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Generate a simple token (7 days expiration)
function generateToken(): { token: string; expiresAt: Date } {
  const { token, expiresAt } = newToken()
  return { token, expiresAt }
}

// Simple brute-force guard: 10 failed attempts per account+IP per 15 minutes.
const FAIL_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 10
const failedLogins = new Map<string, { count: number; first: number }>()
function tooManyFailures(key: string) {
  const f = failedLogins.get(key)
  if (!f) return false
  if (Date.now() - f.first > FAIL_WINDOW_MS) { failedLogins.delete(key); return false }
  return f.count >= MAX_FAILS
}
function recordFailure(key: string) {
  const f = failedLogins.get(key)
  if (!f || Date.now() - f.first > FAIL_WINDOW_MS) failedLogins.set(key, { count: 1, first: Date.now() })
  else f.count++
}

const ROLE_FOR_ACCESS = { full: 'admin', scan: 'member', analytics: 'analyst' } as const

// Login - Only database users can login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    const throttleKey = `${String(username ?? '').toLowerCase()}|${req.ip}`
    if (tooManyFailures(throttleKey)) {
      return res.status(429).json({ success: false, error: 'Too many failed attempts. Try again in 15 minutes.' })
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      })
    }

    // Local development account for exploring the UI without a database.
    // It is opt-in and cannot be enabled when running in production.
    const mockAuthEnabled = process.env.NODE_ENV !== 'production' && process.env.MOCK_AUTH_ENABLED === 'true'
    const mockAdminEmail = process.env.MOCK_ADMIN_EMAIL || 'admin@local.test'
    const mockAdminPassword = process.env.MOCK_ADMIN_PASSWORD || 'admin123'

    if (mockAuthEnabled && username === mockAdminEmail && password === mockAdminPassword) {
      const { token, expiresAt } = generateToken()

      return res.json({
        success: true,
        token: `mock-${token}`,
        expiresAt: expiresAt.toISOString(),
        role: 'admin',
        user: {
          id: 'MOCK-ADMIN',
          userId: 'mock-admin',
          username: mockAdminEmail,
          name: 'Local Admin',
          role: 'admin',
          email: mockAdminEmail,
          committee: 'Development',
          council: null
        }
      })
    }

    // Check if user exists in database by email
    // Also check if they're a member (by member ID or email)
    const userCheck = await query(`
      SELECT
        u.id as user_id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.user_type,
        m.id as member_id,
        m.role as member_role,
        m.committee,
        m.permissions
      FROM users u
      JOIN members m ON m.user_id = u.id
      WHERE (LOWER(u.email) = LOWER($1) OR UPPER(m.id) = UPPER($1))
        AND u.user_type NOT IN ('delegate', 'invitation')
      LIMIT 1
    `, [String(username).trim()])

    const user: any = userCheck.rows[0]
    const hash: string = user?.password_hash ?? ''
    // Only bcrypt hashes are accepted. Plain-text or placeholder passwords never log in.
    let passwordMatches = false
    if (/^\$2[aby]\$/.test(hash)) {
      try {
        passwordMatches = await bcrypt.compare(String(password), hash)
      } catch {
        passwordMatches = false
      }
    }

    if (!user || !passwordMatches) {
      recordFailure(throttleKey)
      return res.status(401).json({ success: false, error: 'Invalid email/ID or password' })
    }
    failedLogins.delete(throttleKey)

    const { access, council } = accessFor(user.permissions, user.member_role)
    const userRole = ROLE_FOR_ACCESS[access]
    const userName = `${user.first_name} ${user.last_name}`.trim()

    const { token, tokenHash, expiresAt } = newToken()
    await query(
      `INSERT INTO auth_sessions (token_hash, user_id, member_id, expires_at) VALUES ($1, $2, $3, $4)`,
      [tokenHash, user.user_id, user.member_id, expiresAt],
    )
    await query(`DELETE FROM auth_sessions WHERE expires_at < NOW() - INTERVAL '7 days'`)
    await query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.user_id])
    console.log(`[AUTH] Login ok: ${user.member_id} (${access}${council ? ', ' + council : ''})`)

    return res.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      role: userRole,
      user: {
        id: user.member_id,
        userId: user.user_id,
        username: user.email || user.member_id,
        name: userName,
        role: userRole,
        access,
        email: user.email,
        committee: user.committee || null,
        council
      }
    })
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate'
    })
  }
})

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (token) {
      await query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashToken(token)])
    }
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

router.get('/verify', requireAuth, (req: Request, res: Response) => {
  const a = req.auth!
  res.json({ valid: true, role: ROLE_FOR_ACCESS[a.access], access: a.access, council: a.council, id: a.memberId, name: a.name })
})

export default router
