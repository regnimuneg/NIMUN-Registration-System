import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

const router = express.Router()

// Generate a simple token (7 days expiration)
function generateToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now
  return { token, expiresAt }
}

// Login - Only database users can login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
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
        CONCAT(u.first_name, ' ', u.last_name) as member_name,
        m.role as member_role,
        m.committee,
        d.id as delegate_id,
        CONCAT(u.first_name, ' ', u.last_name) as delegate_name,
        d.council
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN delegates d ON d.user_id = u.id
      WHERE u.email = $1 OR m.id = $1
    `, [username])

    if (userCheck.rows.length === 0) {
      console.log(`[AUTH] User not found: ${username}`)
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      })
    }

    const user = userCheck.rows[0]
    console.log(`[AUTH] User found: ${user.email}, Member ID: ${user.member_id}, Hash type: ${user.password_hash?.substring(0, 7)}`)

    // Verify password using bcrypt
    // The password_hash in the database should be a bcrypt hash
    // If it's not a valid bcrypt hash (starts with $2a$, $2b$, or $2y$), 
    // fall back to plain text comparison for backward compatibility with seeded data
    let passwordMatches = false

    if (user.password_hash && (
      user.password_hash.startsWith('$2a$') ||
      user.password_hash.startsWith('$2b$') ||
      user.password_hash.startsWith('$2y$')
    )) {
      // Valid bcrypt hash - use bcrypt.compare
      try {
        passwordMatches = await bcrypt.compare(password, user.password_hash)
        console.log(`[AUTH] Bcrypt comparison result: ${passwordMatches}`)
      } catch (error) {
        console.error('[AUTH] Bcrypt comparison error:', error)
        passwordMatches = false
      }
    } else {
      // Not a bcrypt hash - fallback for seeded data or plain text passwords
      // This allows backward compatibility during migration
      passwordMatches = password === user.password_hash ||
        password === user.member_id || // Fallback: member ID as password
        password === 'temp_password' // Temporary fallback for seeded users
      console.log(`[AUTH] Plain text comparison result: ${passwordMatches} (hash: ${user.password_hash?.substring(0, 20)}...)`)
    }

    if (!passwordMatches) {
      console.log(`[AUTH] Password mismatch for user: ${user.email}`)
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      })
    }

    // Block delegates and invitations from logging in
    // Only members (member, executive, high board) can access the admin portal
    if (user.user_type === 'delegate' || user.user_type === 'invitation') {
      console.log(`[AUTH] Access denied for ${user.user_type}: ${user.email}`)
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only staff members can sign in to this portal.'
      })
    }

    // Determine user role
    // Admin: Member with role containing "Admin" (case-insensitive)
    // Member: Regular member
    // Delegate: Delegate user (if needed in future)
    let userRole = 'member'
    let userId = user.member_id || user.delegate_id || user.user_id
    let userName = user.member_name || user.delegate_name || `${user.first_name} ${user.last_name}`

    if (user.member_role) {
      // Check if member role contains "Admin" (case-insensitive)
      const roleLower = user.member_role.toLowerCase()
      if (roleLower.includes('admin') || roleLower.includes('administrator')) {
        userRole = 'admin'
      }
    }

    // Update last_login timestamp
    await query(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.user_id])

    const { token, expiresAt } = generateToken()

    return res.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      role: userRole,
      user: {
        id: userId,
        userId: user.user_id,
        username: user.email,
        name: userName,
        role: userRole,
        email: user.email,
        committee: user.committee || null,
        council: user.council || null
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

// Sign out
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Token is stored client-side, so we just acknowledge the logout
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

// Verify token (optional - for protected routes)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ valid: false, error: 'No token provided' })
    }

    // In a real app, you'd verify the token against a database
    // For now, we'll just check if it exists and hasn't expired
    // The frontend will handle expiration checking

    res.json({ valid: true })
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(500).json({ error: 'Failed to verify token' })
  }
})

export default router
