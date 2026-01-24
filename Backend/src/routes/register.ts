import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import QRCode from 'qrcode'

const router = express.Router()

// Register new participant
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, position, gender, busRoute, busStop, email, council } = req.body

    // Validate required fields
    if (!name || !phoneNumber || !position || !gender) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (gender !== 'Male' && gender !== 'Female') {
      return res.status(400).json({ error: 'Gender must be Male or Female' })
    }

    // Generate participant ID based on position/council
    const participantId = await generateParticipantId(position, council)

    // Create user first (single source of truth for name, email, phone)
    const userType = council ? 'delegate' : 'member'
    const firstName = name.split(' ')[0] || name
    const lastName = name.split(' ').slice(1).join(' ') || ''
    const userResult = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number, user_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      email || `${phoneNumber}@temp.nimun`, // Use phone as email if no email provided
      'temp_password_hash', // Should be properly hashed in production
      firstName,
      lastName,
      phoneNumber,
      userType
    ])

    const userId = userResult.rows[0].id

    // Generate QR code data URL for response
    const qrData = await QRCode.toDataURL(participantId, {
      errorCorrectionLevel: 'M',
      margin: 1
    })

    // Create delegate or member
    if (council) {
      // Create delegate - store participant ID in qr_code (schema has VARCHAR(100) limit)
      // Note: name is stored in users table, not delegates table
      await query(`
        INSERT INTO delegates (id, user_id, council, qr_code, status)
        VALUES ($1, $2, $3, $4, 'active')
      `, [participantId, userId, council, participantId])
    } else {
      // Validate committee for members (schema has CHECK constraint)
      const validCommittees = [
        'Executive',
        'Registration Affairs',
        'Socials & Events',
        'Public Relations',
        'Media & Design',
        'Operations & Logistics'
      ]

      const committee = validCommittees.find(c =>
        position.toLowerCase().includes(c.toLowerCase().split(' ')[0])
      ) || position

      // Create member (members don't have qr_code field in schema)
      // Note: name and phone_number are stored in users table, not members table
      await query(`
        INSERT INTO members (id, user_id, role, committee)
        VALUES ($1, $2, $3, $4)
      `, [participantId, userId, position, committee])
    }

    res.json({
      success: true,
      participant: {
        id: participantId,
        name,
        phoneNumber,
        position: council || position,
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
