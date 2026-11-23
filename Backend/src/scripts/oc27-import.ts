/**
 * OC Conference '27: import OC members from CSV, give each a short ID
 * (for example PRS-01), and make one QR code per ID.
 *
 * The QR code holds only the ID. The existing scanner (Frontend ScanPage)
 * reads it and looks the ID up through GET /api/participants/:id, which
 * shows the person's name, phone number and ID.
 *
 * Usage (from Backend/):
 *   npm run oc27:import -- private/oc27/*.csv            import + QR codes
 *   npm run oc27:import -- --dry-run private/oc27/*.csv  QR codes + roster only, no database
 *
 * CSV columns (header row, case and spaces ignored):
 *   First Name, Last Name, Phone Number, Council, Committee, [ID], [Email]
 * If ID is empty, one is assigned: council prefix + running number.
 * A person already in the database with the same council and phone number
 * keeps their ID, so re-running with an updated sheet does not duplicate.
 * Email is optional; a later run with an Email column fills it in (used to
 * send each person their QR code).
 *
 * Output goes to Backend/private/oc27-output/ (git-ignored):
 *   roster.csv          ID, name, phone, email, council, committee
 *   qrcodes/<ID>.png    one QR code per person
 *
 * Participant files contain personal data. Keep them in Backend/private/,
 * which is git-ignored, and never commit them.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcrypt'
import { makeQrPng } from '../lib/qr-image.js'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = path.join(__dirname, '../..')
dotenv.config({ path: path.join(BACKEND_DIR, '.env') })

// Council -> ID prefix. PRS matches the NIMUN'26 Press prefix.
// Unknown councils fall back to their first three letters.
export const COUNCIL_PREFIXES: Record<string, string> = {
  PRESS: 'PRS',
  UNICEF: 'UNI',
  IAEA: 'IAE',
  CCPCJ: 'CCJ',
}

const VALID_COMMITTEES = [
  'Executive',
  'Registration Affairs',
  'Socials & Events',
  'Public Relations',
  'Media & Design',
  'Operations & Logistics',
  'High Board',
]

const USER_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

interface Person {
  id: string
  firstName: string
  lastName: string
  phone: string
  council: string
  committee: string
  email: string
}

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

export function prefixFor(council: string): string {
  const key = council.toUpperCase().replace(/[^A-Z]/g, '')
  return COUNCIL_PREFIXES[key] ?? (key.slice(0, 3) || 'OC')
}

export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, '')
  // Excel often drops the leading 0 of Egyptian mobile numbers (01xxxxxxxxx)
  if (/^1\d{9}$/.test(p)) p = '0' + p
  return p
}

function readRows(file: string) {
  const records: Record<string, string>[] = parse(fs.readFileSync(file, 'utf8'), {
    columns: (header: string[]) => header.map((h) => h.toLowerCase().replace(/[^a-z]/g, '')),
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  })
  return records
    .map((r) => ({
      id: clean(r.id).toUpperCase(),
      firstName: clean(r.firstname),
      lastName: clean(r.lastname),
      phone: normalizePhone(clean(r.phonenumber)),
      council: clean(r.council),
      committee: clean(r.committee),
      email: clean(r.email).toLowerCase(),
    }))
    .filter((r) => r.firstName || r.lastName || r.phone)
}

/** UUID v5, matching uuid_generate_v5() in Postgres. */
function uuidV5(name: string): string {
  const ns = Buffer.from(USER_NAMESPACE.replace(/-/g, ''), 'hex')
  const hash = crypto.createHash('sha1').update(Buffer.concat([ns, Buffer.from(name)])).digest()
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const h = hash.subarray(0, 16).toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export function assignIds(
  rows: Person[],
  existing: { id: string; phone: string; council: string }[],
): Person[] {
  const byKey = new Map(existing.map((e) => [`${e.council.toUpperCase()}|${e.phone}`, e.id]))
  const maxByPrefix = new Map<string, number>()
  const taken = new Set<string>()
  const note = (id: string) => {
    taken.add(id)
    const m = id.match(/^([A-Z]+)-(\d+)$/)
    if (m) maxByPrefix.set(m[1], Math.max(maxByPrefix.get(m[1]) ?? 0, Number(m[2])))
  }
  existing.forEach((e) => note(e.id))
  rows.forEach((r) => r.id && note(r.id))

  return rows.map((r) => {
    let id: string = r.id || byKey.get(`${r.council.toUpperCase()}|${r.phone}`) || ''
    if (!id) {
      const prefix = prefixFor(r.council)
      const n = (maxByPrefix.get(prefix) ?? 0) + 1
      maxByPrefix.set(prefix, n)
      id = `${prefix}-${String(n).padStart(2, '0')}`
    }
    if (taken.has(id) && !existing.some((e) => e.id === id) && !r.id) {
      throw new Error(`ID clash for ${id}`)
    }
    taken.add(id)
    return { ...r, id }
  })
}

const makeQr = makeQrPng

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const files = args.filter((a) => !a.startsWith('--'))
  if (files.length === 0) {
    console.error('Usage: npm run oc27:import -- [--dry-run] private/oc27/*.csv')
    process.exit(1)
  }

  const rows = files.flatMap(readRows)
  const problems: string[] = []
  rows.forEach((r, i) => {
    const who = `${r.firstName} ${r.lastName}`.trim() || `row ${i + 1}`
    if (!r.firstName) problems.push(`${who}: missing first name`)
    if (!r.council) problems.push(`${who}: missing council`)
    if (!VALID_COMMITTEES.includes(r.committee)) problems.push(`${who}: unknown committee "${r.committee}"`)
    if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) problems.push(`${who}: email looks wrong "${r.email}"`)
    if (!/^0\d{10}$/.test(r.phone)) console.warn(`  note: ${who} has an unusual phone number "${r.phone}"`)
  })
  if (problems.length) {
    console.error('Fix these rows first:\n  ' + problems.join('\n  '))
    process.exit(1)
  }

  const client = dryRun ? null : new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  })
  let existing: { id: string; phone: string; council: string }[] = []
  if (client) {
    await client.connect()
    const res = await client.query(
      `SELECT m.id, COALESCE(u.phone_number, '') AS phone,
              COALESCE(substring(m.role from '\\((.*)\\)'), '') AS council
       FROM members m JOIN users u ON u.id = m.user_id`,
    )
    existing = res.rows
  }

  const people = assignIds(rows, existing)

  if (client) {
    try {
      await client.query('BEGIN')
      for (const p of people) {
        const userId = uuidV5('oc27-member:' + p.id)
        // Random, unknown password: these are scan-only records, not logins.
        const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
        await client.query(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type)
           VALUES ($1, $6, $2, $3, $4, $5, 'member')
           ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email), first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
             phone_number = EXCLUDED.phone_number, updated_at = CURRENT_TIMESTAMP`,
          [userId, hash, p.firstName, p.lastName || '-', p.phone || null, p.email || null],
        )
        await client.query(
          `INSERT INTO members (id, user_id, role, committee, claim_token, permissions)
           VALUES ($1, $2, $3, $4, NULL, '{}'::JSONB)
           ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, committee = EXCLUDED.committee,
             updated_at = CURRENT_TIMESTAMP`,
          [p.id, userId, `OC Member (${p.council})`, p.committee],
        )
      }
      await client.query('COMMIT')
      console.log(`Imported ${people.length} OC members.`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      await client.end()
    }
  }

  const outDir = path.join(BACKEND_DIR, 'private/oc27-output')
  fs.mkdirSync(path.join(outDir, 'qrcodes'), { recursive: true })
  const roster = ['ID,First Name,Last Name,Phone Number,Email,Council,Committee']
  for (const p of [...people].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))) {
    fs.writeFileSync(path.join(outDir, 'qrcodes', `${p.id}.png`), await makeQr(p.id))
    roster.push([p.id, p.firstName, p.lastName, p.phone, p.email, p.council, p.committee].map(csvCell).join(','))
  }
  fs.writeFileSync(path.join(outDir, 'roster.csv'), roster.join('\n') + '\n')

  const counts = people.reduce<Record<string, number>>((acc, p) => {
    const k = p.id.split('-')[0]
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  console.log(`Wrote ${people.length} QR codes and roster.csv to ${outDir}`)
  console.log('Per prefix:', counts)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
