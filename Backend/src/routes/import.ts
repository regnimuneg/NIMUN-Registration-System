import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import { parse } from 'csv-parse/sync'

const router = express.Router()

// Bulk CSV import / Seed
router.post('/', async (req: Request, res: Response) => {
  try {
    const { csvData } = req.body
    const clear = req.query.clear === 'true'

    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' })
    }

    if (clear) {
      await query('TRUNCATE TABLE delegates, members, users, voucher_claims, attendance_records, food_history, activity_timeline, reward_activations, password_reset_tokens CASCADE')
    }

    // Parse CSV
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid data found in CSV file' })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // 1. Analyze IDs and Prefixes
    const prefixMap: Record<string, string> = {
      // Member committees
      'Executive': 'EX',
      'Registration Affairs': 'RG',
      'Socials & Events': 'SO',
      'Public Relations': 'PR',
      'Media & Design': 'MD',
      'Operations & Logistics': 'OP',
      // Delegate councils
      'HRC': 'HRC',
      'ICJ': 'ICJ',
      'DISEC': 'DSC',
      'PRESS': 'PRS'
    }

    // Helper to get prefix from committee/council
    const getPrefix = (committee: string) => {
      const c = committee.trim()
      // Direct match
      if (prefixMap[c]) return prefixMap[c]
      // Partial match for members
      const found = Object.keys(prefixMap).find(k => c.toLowerCase().includes(k.toLowerCase().split(' ')[0]))
      return found ? prefixMap[found] : 'XX'
    }

    // Track used numbers per prefix
    const usedNumbers: Record<string, Set<number>> = {}

    // Initialize used sets
    records.forEach((record: any) => {
      const committee = record['Committee'] || ''
      const prefix = getPrefix(committee)
      if (!usedNumbers[prefix]) usedNumbers[prefix] = new Set()

      const id = record['ID']
      if (id && id.trim()) {
        const parts = id.trim().split('-')
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10)
          if (!isNaN(num)) {
            usedNumbers[prefix].add(num)
          }
        }
      }
    })

    // Generator function state
    const nextNumberState: Record<string, number> = {}

    const getNextId = (prefix: string) => {
      if (!nextNumberState[prefix]) nextNumberState[prefix] = 1
      while (usedNumbers[prefix]?.has(nextNumberState[prefix])) {
        nextNumberState[prefix]++
      }
      const num = nextNumberState[prefix]
      usedNumbers[prefix]?.add(num) // Mark as used
      return `${prefix}-${String(num).padStart(2, '0')}`
    }

    // Process Records
    for (const record of records) {
      try {
        const name = record['Full Name']
        const nuEmail = record['NU Email']
        const phoneNumber = record['Phone Number']
        const committee = record['Committee']
        const role = record['Role']
        const providedId = record['ID']
        const claimCode = record['Claim Code']

        if (!name || !phoneNumber || !committee) {
          results.failed++
          results.errors.push(`Missing required fields (Name, Phone, Committee) for row: ${JSON.stringify(record)}`)
          continue
        }

        // Determine ID
        let participantId = providedId && providedId.trim() ? providedId.trim() : null
        if (!participantId) {
          const prefix = getPrefix(committee)
          participantId = getNextId(prefix)
        }

        // Determine user type
        const delegateCouncils = ['HRC', 'ICJ', 'DISEC', 'PRESS']
        const isDelegate = delegateCouncils.includes(committee)
        const userType = isDelegate ? 'delegate' : 'member'

        // Check for duplicates if not clearing
        if (!clear) {
          const check = await query('SELECT id FROM users WHERE email = $1', [nuEmail || `${phoneNumber}@temp.nimun`])
          if (check.rows.length > 0) {
            // Skip silently or warn? For seed, maybe skip.
            results.errors.push(`User with email ${nuEmail} already exists. Skipping ${participantId}`)
            results.failed++
            continue
          }
        }

        // Create User
        const firstName = name.split(' ')[0] || name
        const lastName = name.split(' ').slice(1).join(' ') || ''
        const email = nuEmail && nuEmail.trim() ? nuEmail.trim() : `${phoneNumber}@temp.nimun` // Fallback

        const userResult = await query(`
          INSERT INTO users (email, password_hash, first_name, last_name, phone_number, user_type)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          email,
          'temp_password_hash', // Default password
          firstName,
          lastName,
          phoneNumber,
          userType
        ])

        const userId = userResult.rows[0].id

        if (isDelegate) {
          await query(`
            INSERT INTO delegates (id, user_id, council, claim_token, qr_code, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
          `, [
            participantId,
            userId,
            committee,
            claimCode || null,
            participantId // QR code defaults to ID for now
          ])
        } else {
          // Normalize committee name for DB check
          const validCommittees = [
            'Executive',
            'Registration Affairs',
            'Socials & Events',
            'Public Relations',
            'Media & Design',
            'Operations & Logistics'
          ]
          const validCommittee = validCommittees.find(c =>
            committee.toLowerCase().includes(c.toLowerCase().split(' ')[0])
          ) || 'Executive'

          await query(`
            INSERT INTO members (id, user_id, role, committee, claim_token)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            participantId,
            userId,
            role || 'Member',
            validCommittee,
            claimCode || null
          ])
        }

        results.success++

      } catch (error) {
        results.failed++
        results.errors.push(`Error processing row: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    res.json({
      success: true,
      summary: {
        total: records.length,
        success: results.success,
        failed: results.failed
      },
      errors: results.errors
    })

  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: 'Failed to import participants' })
  }
})

export default router
