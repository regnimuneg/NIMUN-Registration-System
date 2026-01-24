import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Get all participants (delegates and members)
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Get all delegates (using users table as single source of truth)
    const delegates = await query(`
      SELECT 
        d.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        d.council,
        NULL::text as committee,
        'Delegate' as role,
        d.qr_code as "qrUrl",
        u.email,
        u.phone_number as "phoneNumber",
        'Male' as gender,
        NULL::text as "busRoute",
        NULL::text as "busStop",
        'delegate' as "type"
      FROM delegates d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.id
    `)

    // Get all members (using users table as single source of truth)
    const members = await query(`
      SELECT 
        m.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        NULL::text as council,
        m.committee,
        m.role,
        NULL::text as "qrUrl",
        u.email,
        u.phone_number as "phoneNumber",
        'Male' as gender,
        NULL::text as "busRoute",
        NULL::text as "busStop",
        CASE 
          WHEN m.id IN ('ADMIN-01', 'ADMIN-02', 'REG-SC', 'SOC-SC', 'PR-SC', 'MED-SC', 'OPS-SC') THEN 'staff'
          ELSE 'member'
        END as "type"
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.id
    `)

    // Get all invitations
    const invitations = await query(`
      SELECT 
        i.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        NULL::text as council,
        i.committee,
        i.role,
        NULL::text as "qrUrl",
        u.email,
        u.phone_number as "phoneNumber",
        'Male' as gender,
        NULL::text as "busRoute",
        NULL::text as "busStop",
        'invitation' as "type"
      FROM invitations i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.id
    `)

    console.log('Participants count - Delegates:', delegates.rows.length, 'Members:', members.rows.length, 'Invitations:', invitations.rows.length)

    const allParticipants = [...delegates.rows, ...members.rows, ...invitations.rows]

    res.json(allParticipants)
  } catch (error) {
    console.error('Error fetching participants:', error)
    res.status(500).json({ error: 'Failed to fetch participants' })
  }
})

// Get single participant by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const includeTracking = req.query.include === 'tracking'

    // Try delegates first
    let participant = await query(`
      SELECT 
        d.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        d.council as position,
        d.council,
        NULL::text as committee,
        'Delegate' as role,
        d.qr_code as "qrUrl",
        u.email,
        u.phone_number as "phoneNumber",
        'Male' as gender,
        NULL::text as "busRoute",
        NULL::text as "busStop"
      FROM delegates d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = $1
    `, [id])

    // If not found, try members
    if (participant.rows.length === 0) {
      participant = await query(`
        SELECT 
          m.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          COALESCE(m.role || ' - ' || m.committee, m.committee) as position,
          NULL::text as council,
          m.committee,
          m.role,
          NULL::text as "qrUrl",
          u.email,
          u.phone_number as "phoneNumber",
          'Male' as gender,
          NULL::text as "busRoute",
          NULL::text as "busStop"
        FROM members m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.id = $1
      `, [id])

      // Debug logging
      if (participant.rows.length > 0) {
        console.log(`[DEBUG] Member ${id} data:`, {
          phoneNumber: participant.rows[0].phoneNumber,
          committee: participant.rows[0].committee,
          role: participant.rows[0].role,
          email: participant.rows[0].email
        })
      }
    }

    // If not found, try invitations
    if (participant.rows.length === 0) {
      participant = await query(`
        SELECT 
          i.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          COALESCE(i.role || ' - ' || i.committee, i.committee) as position,
          NULL::text as council,
          i.committee,
          i.role,
          NULL::text as qrUrl,
          u.email,
          u.phone_number as "phoneNumber",
          'Male' as gender,
          NULL::text as busRoute,
          NULL::text as busStop
        FROM invitations i
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.id = $1
      `, [id])
    }

    if (participant.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    // Ensure all fields are properly mapped (PostgreSQL returns lowercase without quotes)
    const participantData = participant.rows[0]

    // Normalize field names - PostgreSQL returns lowercase, so map them correctly
    const normalizedData: any = {
      ...participantData,
      // Map phone number (could be phoneNumber, phonenumber, or phone_number)
      phoneNumber: participantData.phoneNumber || participantData.phonenumber || participantData.phone_number || null,
      // Map committee (check both cases)
      committee: participantData.committee || null,
      // Map council (check both cases)
      council: participantData.council || null,
      // Map role (check both cases)
      role: participantData.role || null,
      // Ensure position is available
      position: participantData.position || null
    }

    // Determine if this is a delegate:
    // - Delegates have council in position field (like "PRESS", "DISEC", etc.)
    // - Delegates don't have committee
    // - If position matches a known council name and no committee, it's a delegate
    const knownCouncils = ['PRESS', 'DISEC', 'HRC', 'ICJ']
    const hasCouncilInPosition = normalizedData.position && knownCouncils.includes(normalizedData.position.toUpperCase())
    const isDelegate = (normalizedData.council || hasCouncilInPosition) && !normalizedData.committee

    // For delegates: council is in position/council field, role should always be "Delegate"
    if (isDelegate) {
      normalizedData.council = normalizedData.council || normalizedData.position || null
      normalizedData.role = 'Delegate' // Always "Delegate" for delegates
      normalizedData.committee = null // Delegates don't have committees
    } else {
      // For members/invitations: extract role and committee from position if needed
      if (!normalizedData.committee && normalizedData.position) {
        // Position format might be "Role - Committee" or just "Committee"
        const positionParts = normalizedData.position.split(' - ')
        if (positionParts.length === 2) {
          normalizedData.role = normalizedData.role || positionParts[0].trim()
          normalizedData.committee = normalizedData.committee || positionParts[1].trim()
        } else if (positionParts.length === 1) {
          // Might be just committee name
          normalizedData.committee = normalizedData.committee || positionParts[0].trim()
        }
      }
      normalizedData.council = null // Members/invitations don't have councils
    }

    // Convert empty strings to null
    if (normalizedData.phoneNumber === '') normalizedData.phoneNumber = null
    if (normalizedData.committee === '') normalizedData.committee = null
    if (normalizedData.role === '') normalizedData.role = null
    if (normalizedData.council === '') normalizedData.council = null

    console.log(`[DEBUG] Normalized participant data for ${id}:`, {
      phoneNumber: normalizedData.phoneNumber,
      committee: normalizedData.committee,
      role: normalizedData.role,
      council: normalizedData.council,
      position: normalizedData.position
    })

    const result: any = {
      participant: normalizedData
    }

    if (includeTracking) {
      // Get tracking data
      const tracking = await getParticipantTrackingData(id)
      result.tracking = tracking
    }

    res.json(result)
  } catch (error) {
    console.error('Error fetching participant:', error)
    res.status(500).json({ error: 'Failed to fetch participant' })
  }
})

// Get participant tracking data
router.get('/:id/tracking', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const tracking = await getParticipantTrackingData(id)
    res.json(tracking)
  } catch (error) {
    console.error('Error fetching tracking data:', error)
    res.status(500).json({ error: 'Failed to fetch tracking data' })
  }
})

// Get participant history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Get user_id first
    const userResult = await query(`
      SELECT user_id FROM delegates WHERE id = $1
      UNION ALL
      SELECT user_id FROM members WHERE id = $1
      LIMIT 1
    `, [id])

    if (userResult.rows.length === 0) {
      return res.json({
        participantId: id,
        totalTransactions: 0,
        history: []
      })
    }

    const userId = userResult.rows[0].user_id

    // Get attendance records (for delegates)
    const attendance = await query(`
      SELECT 
        session_name,
        session_type,
        session_date,
        check_in_time,
        check_out_time
      FROM attendance_records
      WHERE delegate_id = $1
      ORDER BY session_date DESC, check_in_time DESC
    `, [id])

    // Get food history (for delegates)
    const food = await query(`
      SELECT 
        meal_type,
        meal_day,
        claimed_at
      FROM food_history
      WHERE delegate_id = $1
      ORDER BY claimed_at DESC
    `, [id])

    // Get voucher claims (for delegates)
    const vouchers = await query(`
      SELECT 
        vc.id,
        v.name AS voucher_name,
        v.vendor_name,
        vc.status,
        vc.claimed_at,
        vc.redeemed_at
      FROM voucher_claims vc
      JOIN vouchers v ON vc.voucher_id = v.id
      WHERE vc.delegate_id = $1
      ORDER BY vc.claimed_at DESC
    `, [id])

    // Get activity timeline - show all entries but group duplicates in frontend
    const activities = await query(`
      SELECT 
        activity_type as type,
        title as activity,
        description as details,
        created_at as timestamp,
        metadata
      FROM activity_timeline
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId])

    res.json({
      participantId: id,
      attendance: attendance.rows,
      food: food.rows,
      vouchers: vouchers.rows,
      timeline: activities.rows
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// Update participant
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, phoneNumber, council, committee, role, gender, email } = req.body

    // Check if participant is delegate or member
    const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [id])
    const isDelegate = delegateCheck.rows.length > 0

    // Get user_id first
    const userResult = await query(`
      SELECT user_id FROM delegates WHERE id = $1
      UNION ALL
      SELECT user_id FROM members WHERE id = $1
      LIMIT 1
    `, [id])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    const userId = userResult.rows[0].user_id

    // Update user table (single source of truth for name, email, phone)
    if (name) {
      const nameParts = name.split(' ')
      const firstName = nameParts[0] || name
      const lastName = nameParts.slice(1).join(' ') || ''
      await query('UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3', [firstName, lastName, userId])
    }
    if (email) {
      await query('UPDATE users SET email = $1 WHERE id = $2', [email, userId])
    }
    if (phoneNumber) {
      await query('UPDATE users SET phone_number = $1 WHERE id = $2', [phoneNumber, userId])
    }

    // Update password if provided
    const { password } = req.body
    if (password && password.trim()) {
      const bcrypt = await import('bcrypt')
      const hashedPassword = await bcrypt.hash(password, 10)
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId])
    }

    // Update delegate or member specific fields
    if (isDelegate) {
      if (council) {
        await query('UPDATE delegates SET council = $1 WHERE id = $2', [council, id])
      }
    } else {
      if (committee) {
        await query('UPDATE members SET committee = $1 WHERE id = $2', [committee, id])
      }
      if (role) {
        await query('UPDATE members SET role = $1 WHERE id = $2', [role, id])
      }
    }

    res.json({ success: true, message: `Participant ${id} updated successfully` })
  } catch (error) {
    console.error('Error updating participant:', error)
    res.status(500).json({ error: 'Failed to update participant' })
  }
})

// Delete participant
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Delete from delegates or members
    await query('DELETE FROM delegates WHERE id = $1', [id])
    await query('DELETE FROM members WHERE id = $1', [id])

    res.json({ success: true, message: `Participant ${id} deleted successfully` })
  } catch (error) {
    console.error('Error deleting participant:', error)
    res.status(500).json({ error: 'Failed to delete participant' })
  }
})

// Delete all participants
router.delete('/', async (_req: Request, res: Response) => {
  try {
    await query('DELETE FROM delegates')
    await query('DELETE FROM members')
    res.json({ success: true, message: 'All participants deleted successfully' })
  } catch (error) {
    console.error('Error deleting all participants:', error)
    res.status(500).json({ error: 'Failed to delete all participants' })
  }
})

// Helper function to get tracking data
async function getParticipantTrackingData(participantId: string) {
  // Check if participant is delegate or member and get user_id
  let userId: string | null = null
  let isDelegate = false

  const delegateCheck = await query(`
    SELECT user_id FROM delegates WHERE id = $1
  `, [participantId])

  if (delegateCheck.rows.length > 0) {
    userId = delegateCheck.rows[0].user_id
    isDelegate = true
  } else {
    const memberCheck = await query(`
      SELECT user_id FROM members WHERE id = $1
    `, [participantId])
    if (memberCheck.rows.length > 0) {
      userId = memberCheck.rows[0].user_id
    }
  }

  if (!userId) {
    return {
      dayTracking: {
        sessions: { day1: {}, day2: {}, day3: {}, day4: {} },
        performanceDay: {},
        openingCeremony: {},
        conference: { day1: {}, day2: {}, day3: {} }
      },
      food: {},
      games: [],
      bus: []
    }
  }

  // Get attendance from delegates/members table directly (more reliable)
  let attendanceData: any = {}
  if (isDelegate) {
    const delegateData = await query(`
      SELECT 
        day1_session_attended, day1_food, day1_comments, day1_checkin, day1_checkout,
        day2_session_attended, day2_food, day2_comments, day2_checkin, day2_checkout,
        day3_session_attended, day3_food, day3_comments, day3_checkin, day3_checkout,
        day4_session_attended, day4_food, day4_comments, day4_checkin, day4_checkout,
        opening_ceremony_attended, opening_ceremony_food, opening_ceremony_comments, opening_ceremony_checkin, opening_ceremony_checkout,
        conf_day1_attended, conf_day1_breakfast, conf_day1_lunch, conf_day1_comments, conf_day1_checkin, conf_day1_checkout,
        conf_day2_attended, conf_day2_breakfast, conf_day2_lunch, conf_day2_comments, conf_day2_checkin, conf_day2_checkout,
        conf_day3_attended, conf_day3_breakfast, conf_day3_lunch, conf_day3_comments, conf_day3_checkin, conf_day3_checkout
      FROM delegates WHERE id = $1
    `, [participantId])

    if (delegateData.rows.length > 0) {
      const d = delegateData.rows[0]
      attendanceData = {
        sessions: {
          day1: { attended: d.day1_session_attended || false, lunch: d.day1_food || false, comments: d.day1_comments || null, checkin: d.day1_checkin || null, checkout: d.day1_checkout || null },
          day2: { attended: d.day2_session_attended || false, lunch: d.day2_food || false, comments: d.day2_comments || null, checkin: d.day2_checkin || null, checkout: d.day2_checkout || null },
          day3: { attended: d.day3_session_attended || false, lunch: d.day3_food || false, comments: d.day3_comments || null, checkin: d.day3_checkin || null, checkout: d.day3_checkout || null },
          day4: { attended: d.day4_session_attended || false, lunch: d.day4_food || false, comments: d.day4_comments || null, checkin: d.day4_checkin || null, checkout: d.day4_checkout || null }
        },
        openingCeremony: { attended: d.opening_ceremony_attended || false, catering: d.opening_ceremony_food || false, comments: d.opening_ceremony_comments || null, checkin: d.opening_ceremony_checkin || null, checkout: d.opening_ceremony_checkout || null },
        conference: {
          day1: { attended: d.conf_day1_attended || false, breakfast: d.conf_day1_breakfast || false, lunch: d.conf_day1_lunch || false, comments: d.conf_day1_comments || null, checkin: d.conf_day1_checkin || null, checkout: d.conf_day1_checkout || null },
          day2: { attended: d.conf_day2_attended || false, breakfast: d.conf_day2_breakfast || false, lunch: d.conf_day2_lunch || false, comments: d.conf_day2_comments || null, checkin: d.conf_day2_checkin || null, checkout: d.conf_day2_checkout || null },
          day3: { attended: d.conf_day3_attended || false, breakfast: d.conf_day3_breakfast || false, lunch: d.conf_day3_lunch || false, comments: d.conf_day3_comments || null, checkin: d.conf_day3_checkin || null, checkout: d.conf_day3_checkout || null }
        },
        performanceDay: {}
      }
    }
  } else {
    // For members, use same structure
    const memberData = await query(`
      SELECT 
        day1_session_attended, day1_food, day1_comments, day1_checkin, day1_checkout,
        day2_session_attended, day2_food, day2_comments, day2_checkin, day2_checkout,
        day3_session_attended, day3_food, day3_comments, day3_checkin, day3_checkout,
        day4_session_attended, day4_food, day4_comments, day4_checkin, day4_checkout,
        opening_ceremony_attended, opening_ceremony_food, opening_ceremony_comments, opening_ceremony_checkin, opening_ceremony_checkout,
        conf_day1_attended, conf_day1_breakfast, conf_day1_lunch, conf_day1_comments, conf_day1_checkin, conf_day1_checkout,
        conf_day2_attended, conf_day2_breakfast, conf_day2_lunch, conf_day2_comments, conf_day2_checkin, conf_day2_checkout,
        conf_day3_attended, conf_day3_breakfast, conf_day3_lunch, conf_day3_comments, conf_day3_checkin, conf_day3_checkout
      FROM members WHERE id = $1
    `, [participantId])

    if (memberData.rows.length > 0) {
      const m = memberData.rows[0]
      attendanceData = {
        sessions: {
          day1: { attended: m.day1_session_attended || false, lunch: m.day1_food || false, comments: m.day1_comments || null, checkin: m.day1_checkin || null, checkout: m.day1_checkout || null },
          day2: { attended: m.day2_session_attended || false, lunch: m.day2_food || false, comments: m.day2_comments || null, checkin: m.day2_checkin || null, checkout: m.day2_checkout || null },
          day3: { attended: m.day3_session_attended || false, lunch: m.day3_food || false, comments: m.day3_comments || null, checkin: m.day3_checkin || null, checkout: m.day3_checkout || null },
          day4: { attended: m.day4_session_attended || false, lunch: m.day4_food || false, comments: m.day4_comments || null, checkin: m.day4_checkin || null, checkout: m.day4_checkout || null }
        },
        openingCeremony: { attended: m.opening_ceremony_attended || false, catering: m.opening_ceremony_food || false, comments: m.opening_ceremony_comments || null, checkin: m.opening_ceremony_checkin || null, checkout: m.opening_ceremony_checkout || null },
        conference: {
          day1: { attended: m.conf_day1_attended || false, breakfast: m.conf_day1_breakfast || false, lunch: m.conf_day1_lunch || false, comments: m.conf_day1_comments || null, checkin: m.conf_day1_checkin || null, checkout: m.conf_day1_checkout || null },
          day2: { attended: m.conf_day2_attended || false, breakfast: m.conf_day2_breakfast || false, lunch: m.conf_day2_lunch || false, comments: m.conf_day2_comments || null, checkin: m.conf_day2_checkin || null, checkout: m.conf_day2_checkout || null },
          day3: { attended: m.conf_day3_attended || false, breakfast: m.conf_day3_breakfast || false, lunch: m.conf_day3_lunch || false, comments: m.conf_day3_comments || null, checkin: m.conf_day3_checkin || null, checkout: m.conf_day3_checkout || null }
        },
        performanceDay: {}
      }
    }
  }

  // Get food history (only for delegates as per schema)
  const food = isDelegate ? await query(`
    SELECT meal_type, meal_day FROM food_history 
    WHERE delegate_id = $1
    ORDER BY claimed_at
  `, [participantId]) : { rows: [] }

  // Get activity timeline for games and bus
  const activities = await query(`
    SELECT activity_type, title, description, metadata, created_at
    FROM activity_timeline
    WHERE user_id = $1
    AND activity_type IN ('game', 'other')
    ORDER BY created_at
  `, [userId])

  return {
    dayTracking: attendanceData.sessions ? attendanceData : {
      sessions: { day1: {}, day2: {}, day3: {}, day4: {} },
      performanceDay: {},
      openingCeremony: {},
      conference: { day1: {}, day2: {}, day3: {} }
    },
    food: formatFoodData(food.rows),
    games: formatGamesData(activities.rows.filter((a: any) => a.activity_type === 'game')),
    bus: formatBusData(activities.rows.filter((a: any) => a.metadata && (a.metadata as any).type === 'bus'))
  }
}

function formatFoodData(food: any[]) {
  const result: any = {
    breakfast: false,
    lunch: false,
    dinner: false,
    snack1: false,
    snack2: false
  }
  food.forEach(record => {
    if (record.meal_type) {
      result[record.meal_type] = true
    }
  })
  return result
}

function formatGamesData(games: any[]) {
  return games.map((game: any) => {
    const metadata = game.metadata as any || {}
    return {
      activity: metadata.activity || game.title?.replace(/^(join|leave) /, '') || '',
      action: metadata.action || (game.title?.includes('join') ? 'join' : 'leave'),
      timestamp: game.created_at
    }
  })
}

function formatBusData(bus: any[]) {
  return bus.map((b: any) => {
    const metadata = b.metadata as any || {}
    return {
      type: metadata.type || 'arriving',
      stop: metadata.stop || '',
      timestamp: b.created_at
    }
  })
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    attendance: '✅',
    food: '🍽️',
    voucher: '🎫',
    game: '🎮',
    award: '🏆',
    other: '📝'
  }
  return icons[type] || '📝'
}

export default router
