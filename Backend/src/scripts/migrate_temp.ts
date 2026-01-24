import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../.env') })

async function migrate() {
  const { query } = await import('../config/index.js')
  console.log('Applying schema updates...')
  try {
    await query(`
        ALTER TABLE members DROP CONSTRAINT IF EXISTS members_committee_check;
        ALTER TABLE members ADD CONSTRAINT members_committee_check CHECK (committee IN (
            'Executive',
            'Registration Affairs',
            'Socials & Events',
            'Public Relations',
            'Media & Design',
            'Operations & Logistics',
            'High Board'
        ));
    `)
    console.log('Schema updated: members.committee check constraint updated.')
  } catch (e) {
    console.error('Migration failed:', e)
  }
}

migrate()
