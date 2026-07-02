import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Update bus tracking
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, dayKey, checkIn, checkOut, requesterId, value = true } = req.body

    if (!participantId || !dayKey) {
      return res.status(400).json({
        error: 'Missing required fields: participantId, dayKey'
      })
    }

    const isCheckInAction = checkIn === true
    const isCheckOutAction = checkOut === true

    if (isCheckInAction === isCheckOutAction) {
      return res.status(400).json({
        error: 'Must specify exactly one of checkIn or checkOut'
      })
    }

    if (typeof value !== 'boolean') {
      return res.status(400).json({
        error: 'Field value must be a boolean'
      })
    }

    // Access control: Same as attendance (Members can only track delegates, admins can track members)
    if (requesterId) {
      const requesterCheck = await query('SELECT id FROM members WHERE id = $1', [requesterId])
      const isRequesterMember = requesterCheck.rows.length > 0

      if (isRequesterMember) {
        const targetCheck = await query('SELECT id FROM members WHERE id = $1', [participantId])
        const isTargetMember = targetCheck.rows.length > 0

        if (isTargetMember) {
          return res.status(403).json({
            error: 'Members cannot track bus for other members. Only admins can track members.'
          })
        }
      }
    }

    // Map dayKey to session_type
    const sessionType = mapDayKeyToSessionType(dayKey)
    if (!sessionType) {
      return res.status(400).json({ error: 'Invalid dayKey' })
    }

    const timestamp = value ? new Date() : null

    // Check if participant is delegate, member, or invitation
    const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [participantId])
    const isDelegate = delegateCheck.rows.length > 0
    let isMember = false
    let isInvitation = false
    if (!isDelegate) {
      const memberCheck = await query('SELECT id FROM members WHERE id = $1', [participantId])
      isMember = memberCheck.rows.length > 0
      if (!isMember) {
        const invitationCheck = await query('SELECT id FROM invitations WHERE id = $1', [participantId])
        isInvitation = invitationCheck.rows.length > 0
        if (!isInvitation) {
          return res.status(404).json({ error: 'Participant not found' })
        }
      }
    }

    if (isCheckInAction) {
      if (!isInvitation) {
        await updateParticipantBusCheckIn(participantId, sessionType, timestamp, isDelegate)
      }
      if (!value) {
        if (!isInvitation) {
          await updateParticipantBusCheckOut(participantId, sessionType, null, isDelegate)
        }
      }
    } else if (isCheckOutAction) {
      if (!isInvitation) {
        await updateParticipantBusCheckOut(participantId, sessionType, timestamp, isDelegate)
      }
    }

    // Get user_id for activity timeline
    const userResult = await query(`
      SELECT user_id FROM delegates WHERE id = $1
      UNION ALL
      SELECT user_id FROM members WHERE id = $1
      UNION ALL
      SELECT user_id FROM invitations WHERE id = $1
      LIMIT 1
    `, [participantId])

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].user_id
      const title = `${dayKey} Bus Tracking`

      const action = isCheckInAction ? 'check-in' : 'check-out'
      const description = value
        ? (isCheckInAction ? 'Checked in to bus' : 'Checked out of bus')
        : (isCheckInAction ? 'Cleared bus check-in' : 'Cleared bus check-out')
      const activityTimestamp = timestamp ?? new Date()
      const metadata = JSON.stringify({ type: 'bus', dayKey, action, value })

      const recentEntry = await query(`
        SELECT id
        FROM activity_timeline
        WHERE user_id = $1
          AND activity_type = 'bus'
          AND title = $2
          AND created_at >= NOW() - INTERVAL '2 minutes'
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId, title])

      if (recentEntry.rows.length > 0) {
        await query(`
          UPDATE activity_timeline
          SET 
            description = $1,
            metadata = $2,
            created_at = $3
          WHERE id = $4
        `, [
          description,
          metadata,
          activityTimestamp,
          recentEntry.rows[0].id
        ])
      } else {
        await query(`
          INSERT INTO activity_timeline (
            user_id,
            activity_type,
            title,
            description,
            metadata,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          'bus',
          title,
          description,
          metadata,
          activityTimestamp
        ])
      }
    }

    res.json({
      success: true,
      message: `Bus tracking updated for ${participantId}: ${dayKey} (${isCheckInAction ? 'Check In' : 'Check Out'} ${value ? 'set' : 'cleared'})`,
      timestamp: timestamp?.toISOString() ?? null
    })
  } catch (error) {
    console.error('Bus update error:', error)
    res.status(500).json({ error: 'Failed to update bus tracking' })
  }
})

function mapDayKeyToSessionType(dayKey: string): string | null {
  const mapping: Record<string, string> = {
    'sessions.day1': 'day1',
    'sessions.day2': 'day2',
    'sessions.day3': 'day3',
    'sessions.day4': 'day4',
    'performanceDay': 'performance_day',
    'openingCeremony': 'opening_ceremony',
    'conference.day1': 'conf_day1',
    'conference.day2': 'conf_day2',
    'conference.day3': 'conf_day3'
  }
  return mapping[dayKey] || null
}

async function updateParticipantBusCheckIn(
  participantId: string,
  sessionType: string,
  timestamp: Date | null,
  isDelegate: boolean
) {
  const fieldMap: Record<string, string> = {
    'day1': 'day1_bus_checkin',
    'day2': 'day2_bus_checkin',
    'day3': 'day3_bus_checkin',
    'day4': 'day4_bus_checkin',
    'performance_day': 'performance_day_bus_checkin',
    'opening_ceremony': 'opening_ceremony_bus_checkin',
    'conf_day1': 'conf_day1_bus_checkin',
    'conf_day2': 'conf_day2_bus_checkin',
    'conf_day3': 'conf_day3_bus_checkin'
  }

  const field = fieldMap[sessionType]
  if (!field) return

  if (isDelegate) {
    await query(`UPDATE delegates SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  } else {
    await query(`UPDATE members SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  }
}

async function updateParticipantBusCheckOut(
  participantId: string,
  sessionType: string,
  timestamp: Date | null,
  isDelegate: boolean
) {
  const fieldMap: Record<string, string> = {
    'day1': 'day1_bus_checkout',
    'day2': 'day2_bus_checkout',
    'day3': 'day3_bus_checkout',
    'day4': 'day4_bus_checkout',
    'performance_day': 'performance_day_bus_checkout',
    'opening_ceremony': 'opening_ceremony_bus_checkout',
    'conf_day1': 'conf_day1_bus_checkout',
    'conf_day2': 'conf_day2_bus_checkout',
    'conf_day3': 'conf_day3_bus_checkout'
  }

  const field = fieldMap[sessionType]
  if (!field) return

  if (isDelegate) {
    await query(`UPDATE delegates SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  } else {
    await query(`UPDATE members SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  }
}

export default router
