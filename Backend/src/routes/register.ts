import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import QRCode from 'qrcode'

const router = express.Router()

// Register new participant
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, position, gender, busRoute, busStop, email, council, manualId, category, committee } = req.body

    const resolvedCategory = category || (council ? 'delegate' : 'member')

    // Validate required fields
    if (!name || !gender) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (resolvedCategory !== 'invitation' && !phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required for delegates and members' })
    }

    if (gender !== 'Male' && gender !== 'Female') {
      return res.status(400).json({ error: 'Gender must be Male or Female' })
    }

    if (resolvedCategory !== 'invitation' && !position && !council) {
      return res.status(400).json({ error: 'Position or council is required for delegates and members' })
    }

    // Determine participant ID
    let participantId: string
    if (manualId && manualId.trim()) {
      const trimmedId = manualId.trim()
      // Check if duplicate
      const duplicateCheck = await query(`
        SELECT id FROM delegates WHERE id = $1
        UNION ALL
        SELECT id FROM members WHERE id = $1
        UNION ALL
        SELECT id FROM invitations WHERE id = $1
        LIMIT 1
      `, [trimmedId])
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Participant ID already exists' })
      }
      participantId = trimmedId
    } else {
      // Generate participant ID based on category/position/council
      if (resolvedCategory === 'invitation') {
        participantId = await generateInvitationId(committee || position || 'General Invitation')
      } else {
        participantId = await generateParticipantId(position || '', council)
      }
    }

    // Create user first (single source of truth for name, email, phone)
    let userType = 'member'
    if (resolvedCategory === 'delegate') {
      userType = 'delegate'
    } else if (resolvedCategory === 'invitation') {
      userType = 'invitation'
    }

    const firstName = name.split(' ')[0] || name
    const lastName = name.split(' ').slice(1).join(' ') || ''
    
    const resolvedPhone = phoneNumber && phoneNumber.trim() ? phoneNumber.trim() : null
    const resolvedEmail = email && email.trim() ? email.trim() : (resolvedPhone ? `${resolvedPhone}@temp.nimun` : `${participantId}@temp.nimun`)

    const userResult = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number, user_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      resolvedEmail,
      'temp_password_hash', // Should be properly hashed in production
      firstName,
      lastName,
      resolvedPhone,
      userType
    ])

    const userId = userResult.rows[0].id

    // Generate QR code data URL for response
    const qrData = await QRCode.toDataURL(participantId, {
      errorCorrectionLevel: 'M',
      margin: 1
    })

    // Create delegate, member, or invitation
    if (resolvedCategory === 'delegate') {
      // Create delegate - store participant ID in qr_code (schema has VARCHAR(100) limit)
      // Note: name is stored in users table, not delegates table
      await query(`
        INSERT INTO delegates (id, user_id, council, qr_code, status)
        VALUES ($1, $2, $3, $4, 'active')
      `, [participantId, userId, council || position, participantId])
    } else if (resolvedCategory === 'invitation') {
      // Create invitation
      const resolvedRole = position || 'Invitation'
      const resolvedCommittee = committee || 'General Invitation'
      await query(`
        INSERT INTO invitations (id, user_id, role, committee, status)
        VALUES ($1, $2, $3, $4, 'active')
      `, [participantId, userId, resolvedRole, resolvedCommittee])
    } else {
      // Validate committee for members (schema has CHECK constraint)
      const validCommittees = [
        'Executive',
        'Registration Affairs',
        'Socials & Events',
        'Public Relations',
        'Media & Design',
        'Operations & Logistics',
        'High Board'
      ]

      const committeeName = validCommittees.find(c =>
        position.toLowerCase().includes(c.toLowerCase().split(' ')[0])
      ) || position

      // Create member (members don't have qr_code field in schema)
      // Note: name and phone_number are stored in users table, not members table
      await query(`
        INSERT INTO members (id, user_id, role, committee)
        VALUES ($1, $2, $3, $4)
      `, [participantId, userId, position, committeeName])
    }

    res.json({
      success: true,
      participant: {
        id: participantId,
        name,
        phoneNumber,
        position: council || committee || position,
        gender,
        qrUrl: qrData,
        busRoute: busRoute || null,
        busStop: busStop || null
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register participant' })
  }
})

async function generateInvitationId(committeeName: string): Promise<string> {
  const prefixMap: Record<string, string> = {
    'Executive Invitation': 'EX-INV',
    'Executives\' Invitation': 'EX-INV',
    'General Invitation': 'INV',
    'Alumni Invitation': 'AL-INV',
    'Alumni': 'AL-INV'
  }

  const prefix = prefixMap[committeeName] || 'INV'

  // Get next sequential number for this prefix
  const result = await query(`
    SELECT id FROM invitations WHERE id LIKE $1
    ORDER BY id DESC
    LIMIT 1
  `, [`${prefix}-%`])

  let nextNum = 1
  if (result.rows.length > 0) {
    const lastId = result.rows[0].id
    const lastNum = parseInt(lastId.split('-').slice(-1)[0] || '0', 10)
    nextNum = isNaN(lastNum) ? 1 : lastNum + 1
  }

  return `${prefix}-${String(nextNum).padStart(2, '0')}`
}

async function generateParticipantId(position: string, council?: string): Promise<string> {
  // Get the prefix based on position/council (matching schema)
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

  const prefix = prefixMap[position] || prefixMap[council || ''] || 'XX'

  // Get the next number for this prefix
  const result = await query(`
    SELECT id FROM delegates WHERE id LIKE $1
    UNION
    SELECT id FROM members WHERE id LIKE $1
    ORDER BY id DESC
    LIMIT 1
  `, [`${prefix}-%`])

  let nextNum = 1
  if (result.rows.length > 0) {
    const lastId = result.rows[0].id
    const lastNum = parseInt(lastId.split('-')[1] || '0', 10)
    nextNum = lastNum + 1
  }

  return `${prefix}-${String(nextNum).padStart(2, '0')}`
}

export default router
