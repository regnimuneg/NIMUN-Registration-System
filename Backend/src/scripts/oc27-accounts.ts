/**
 * OC Conference '27: create the staff accounts (6 staff + 3 scanning desks).
 *
 *   npm run oc27:accounts                 create any that are missing
 *   npm run oc27:accounts -- --reset ID   new password for one account (or --reset all)
 *
 * Passwords are generated here, stored only as bcrypt hashes, printed once,
 * and written to Backend/private/oc27-accounts.csv (git-ignored). Nothing
 * secret lives in this file or in git. Sign in with the account ID
 * (for example OC-REG) and its password.
 *
 * Resetting a password also signs that account out everywhere.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcrypt'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = path.join(__dirname, '../..')
dotenv.config({ path: path.join(BACKEND_DIR, '.env') })

interface Account {
  id: string
  firstName: string
  lastName: string
  userType: 'member' | 'high board' | 'executive'
  role: string
  committee: string
  permissions: Record<string, unknown>
}

// full = everything; analytics = scan analytics for one council only, or for
// one OC team ("team" = members.committee, e.g. Media & Design) for team heads;
// scan = scanning desk: scanner page only (no lists, analytics or phone numbers)
export const ACCOUNTS: Account[] = [
  { id: 'OC-REG', firstName: 'Registration', lastName: 'Affairs', userType: 'member', role: 'Registration Affairs', committee: 'Registration Affairs', permissions: { access: 'full' } },
  { id: 'OC-HB', firstName: 'High', lastName: 'Board', userType: 'high board', role: 'Highboard', committee: 'High Board', permissions: { access: 'full' } },
  { id: 'OC-PRESS', firstName: 'Press', lastName: 'Head', userType: 'executive', role: 'Press Head', committee: 'Executive', permissions: { access: 'analytics', council: 'Press' } },
  { id: 'OC-UNICEF', firstName: 'UNICEF', lastName: 'Secretariat', userType: 'executive', role: 'UNICEF Secretariat', committee: 'Executive', permissions: { access: 'analytics', council: 'UNICEF' } },
  { id: 'OC-CCPCJ', firstName: 'CCPCJ', lastName: 'Secretariat', userType: 'executive', role: 'CCPCJ Secretariat', committee: 'Executive', permissions: { access: 'analytics', council: 'CCPCJ' } },
  { id: 'OC-IAEA', firstName: 'IAEA', lastName: 'Secretariat', userType: 'executive', role: 'IAEA Secretariat', committee: 'Executive', permissions: { access: 'analytics', council: 'IAEA' } },
  { id: 'OC-DESK1', firstName: 'Scanning', lastName: 'Desk 1', userType: 'member', role: 'Scanning Desk', committee: 'Registration Affairs', permissions: { access: 'scan' } },
  { id: 'OC-DESK2', firstName: 'Scanning', lastName: 'Desk 2', userType: 'member', role: 'Scanning Desk', committee: 'Registration Affairs', permissions: { access: 'scan' } },
  { id: 'OC-DESK3', firstName: 'Scanning', lastName: 'Desk 3', userType: 'member', role: 'Scanning Desk', committee: 'Registration Affairs', permissions: { access: 'scan' } },
  // OC team heads: Live Board for their own team's members only (view only, no manual check-in)
  { id: 'OC-OPS', firstName: 'Operations & Logistics', lastName: 'Head', userType: 'executive', role: 'Operations & Logistics Head', committee: 'Operations & Logistics', permissions: { access: 'analytics', team: 'Operations & Logistics' } },
  { id: 'OC-PR', firstName: 'Public Relations', lastName: 'Head', userType: 'executive', role: 'Public Relations Head', committee: 'Public Relations', permissions: { access: 'analytics', team: 'Public Relations' } },
  { id: 'OC-MEDIA', firstName: 'Media & Design', lastName: 'Head', userType: 'executive', role: 'Media & Design Head', committee: 'Media & Design', permissions: { access: 'analytics', team: 'Media & Design' } },
  { id: 'OC-SOCIALS', firstName: 'Socials & Events', lastName: 'Head', userType: 'executive', role: 'Socials & Events Head', committee: 'Socials & Events', permissions: { access: 'analytics', team: 'Socials & Events' } },
]

const USER_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

function uuidV5(name: string): string {
  const ns = Buffer.from(USER_NAMESPACE.replace(/-/g, ''), 'hex')
  const hash = crypto.createHash('sha1').update(Buffer.concat([ns, Buffer.from(name)])).digest()
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const h = hash.subarray(0, 16).toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** 16 characters, no look-alikes (0/O, 1/l/I), about 90 bits. */
export function generatePassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  while (out.length < length) {
    const b = crypto.randomBytes(1)[0]
    if (b < alphabet.length * Math.floor(256 / alphabet.length)) out += alphabet[b % alphabet.length]
  }
  return out
}

async function main() {
  const args = process.argv.slice(2)
  const resetIdx = args.indexOf('--reset')
  const resetTarget = resetIdx >= 0 ? (args[resetIdx + 1] ?? '').toUpperCase() : null
  if (resetIdx >= 0 && !resetTarget) {
    console.error('Usage: npm run oc27:accounts -- --reset <ACCOUNT-ID|all>')
    process.exit(1)
  }
  if (resetTarget && resetTarget !== 'ALL' && !ACCOUNTS.some((a) => a.id === resetTarget)) {
    console.error(`Unknown account ${resetTarget}. Known: ${ACCOUNTS.map((a) => a.id).join(', ')}`)
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()
  const issued: { id: string; role: string; access: string; password: string }[] = []

  try {
    await client.query('BEGIN')
    for (const a of ACCOUNTS) {
      const userId = uuidV5('oc27-staff:' + a.id)
      const exists = (await client.query('SELECT 1 FROM members WHERE id = $1', [a.id])).rowCount! > 0
      const reset = resetTarget === 'ALL' || resetTarget === a.id
      const password = !exists || reset ? generatePassword() : null

      if (!exists) {
        await client.query(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type)
           VALUES ($1, NULL, $2, $3, $4, NULL, $5)`,
          [userId, await bcrypt.hash(password!, 12), a.firstName, a.lastName, a.userType],
        )
        await client.query(
          `INSERT INTO members (id, user_id, role, committee, claim_token, permissions)
           VALUES ($1, $2, $3, $4, NULL, $5::JSONB)`,
          [a.id, userId, a.role, a.committee, JSON.stringify(a.permissions)],
        )
      } else {
        // Keep role and access in line with this file on every run.
        await client.query(
          `UPDATE members SET role = $2, committee = $3, permissions = $4::JSONB, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [a.id, a.role, a.committee, JSON.stringify(a.permissions)],
        )
        if (password) {
          await client.query(
            `UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = (SELECT user_id FROM members WHERE id = $1)`,
            [a.id, await bcrypt.hash(password, 12)],
          )
          await client.query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE member_id = $1 AND revoked_at IS NULL`, [a.id])
        }
      }
      if (password) issued.push({ id: a.id, role: a.role, access: String(a.permissions.access), password })
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    await client.end()
  }

  if (issued.length === 0) {
    console.log(`All ${ACCOUNTS.length} accounts already exist. Nothing changed. Use --reset <ID|all> for new passwords.`)
    return
  }
  const outFile = path.join(BACKEND_DIR, 'private/oc27-accounts.csv')
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  const header = !fs.existsSync(outFile)
  fs.appendFileSync(
    outFile,
    (header ? 'Issued At,Account ID,Role,Access,Password\n' : '') +
      issued.map((i) => [new Date().toISOString(), i.id, i.role, i.access, i.password].join(',')).join('\n') + '\n',
    { mode: 0o600 },
  )
  console.log('New passwords (shown once, also saved to private/oc27-accounts.csv):')
  console.table(issued)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
