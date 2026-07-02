import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Update attendance
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, dayKey, field, value, requesterId, checkIn, checkOut } = req.body

    if (!participantId || !dayKey || !field || typeof value !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields: participantId, dayKey, field, value'
      })
    }

    // Access control: Members can only track delegates, not other members
    // Only admins can track members
    if (requesterId) {
      const requesterCheck = await query('SELECT id FROM members WHERE id = $1', [requesterId])
      const isRequesterMember = requesterCheck.rows.length > 0

      if (isRequesterMember) {
        // Requester is a member - check if target is also a member
        const targetCheck = await query('SELECT id FROM members WHERE id = $1', [participantId])
        const isTargetMember = targetCheck.rows.length > 0

        if (isTargetMember) {
          return res.status(403).json({
            error: 'Members cannot track attendance for other members. Only admins can track members.'
          })
        }
        // If target is delegate, allow tracking
      }
      // If requester is admin (not a member), allow all tracking
    }

    // Map dayKey to session_type
    const sessionType = mapDayKeyToSessionType(dayKey)
    if (!sessionType) {
      return res.status(400).json({ error: 'Invalid dayKey' })
    }

    const timestamp = new Date()

    // Check if participant is delegate, member, or invitation
    const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [participantId])
    const isDelegate = delegateCheck.rows.length > 0
    const invitationCheck = await query('SELECT id FROM invitations WHERE id = $1', [participantId])
    const isInvitation = invitationCheck.rows.length > 0

    if (checkIn) {
      // Handle check-in
      if (isDelegate) {
        await query(`
          INSERT INTO attendance_records (
            delegate_id,
            session_name,
            session_date,
            session_type,
            check_in_time
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [
          participantId,
          `${dayKey} - ${field}`,
          timestamp,
          sessionType,
          timestamp
        ])
      }

      // Update delegates/members/invitations table check-in time
      await updateParticipantCheckIn(participantId, sessionType, timestamp, isDelegate, isInvitation)
      await updateParticipantAttendanceField(participantId, sessionType, true, isDelegate, isInvitation)
    } else if (checkOut) {
      // Handle check-out - checkout does NOT mean absent, they were present and left
      if (isDelegate) {
        await query(`
          UPDATE attendance_records
          SET check_out_time = $1
          WHERE delegate_id = $2 AND session_type = $3
        `, [timestamp, participantId, sessionType])
      }

      // Update delegates/members/invitations table check-out time
      // Note: We do NOT change attendance status - they were present, they just checked out
      await updateParticipantCheckOut(participantId, sessionType, timestamp, isDelegate, isInvitation)
    } else if (value) {
      // Toggle attendance on
      if (isDelegate) {
        await query(`
          INSERT INTO attendance_records (
            delegate_id,
            session_name,
            session_date,
            session_type,
            check_in_time
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [
          participantId,
          `${dayKey} - ${field}`,
          timestamp,
          sessionType,
          timestamp
        ])
      }

      await updateParticipantAttendanceField(participantId, sessionType, true, isDelegate, isInvitation)
    } else {
      // Toggle attendance off
      if (isDelegate) {
        await query(`
          UPDATE attendance_records
          SET check_out_time = $1
          WHERE delegate_id = $2 AND session_type = $3
        `, [timestamp, participantId, sessionType])
      }

      await updateParticipantAttendanceField(participantId, sessionType, false, isDelegate, isInvitation)
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
      const title = `${dayKey} Attendance`

      // Determine description based on action type
      let description: string
      if (checkIn) {
        description = 'Checked in'
      } else if (checkOut) {
        description = 'Checked out' // Checkout != absent, they were present and left
      } else {
        description = value ? `Marked as present` : `Marked as absent`
      }

      // Check if there's a recent entry for this dayKey (within last 2 minutes)
      // If so, update it instead of creating a duplicate
      const recentEntry = await query(`
        SELECT id
        FROM activity_timeline
        WHERE user_id = $1
          AND activity_type = 'attendance'
          AND title = $2
          AND created_at >= NOW() - INTERVAL '2 minutes'
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId, title])

      if (recentEntry.rows.length > 0) {
        // Update existing entry instead of creating duplicate
        await query(`
          UPDATE activity_timeline
          SET 
            description = $1,
            metadata = $2,
            created_at = $3
          WHERE id = $4
        `, [
          description,
          JSON.stringify({ dayKey, field, value, checkIn, checkOut }),
          timestamp,
          recentEntry.rows[0].id
        ])
      } else {
        // No recent entry, create a new one
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
          'attendance',
          title,
          description,
          JSON.stringify({ dayKey, field, value, checkIn, checkOut }),
          timestamp
        ])
      }
    }

    res.json({
      success: true,
      message: `Attendance updated for ${participantId}: ${dayKey}.${field} = ${value}`,
      timestamp: timestamp.toISOString()
    })
  } catch (error) {
    console.error('Attendance update error:', error)
    res.status(500).json({ error: 'Failed to update attendance' })
  }
})

function mapDayKeyToSessionType(dayKey: string): string | null {
  const mapping: Record<string, string> = {
    'sessions.day1': 'day1',
    'sessions.day2': 'day2',
    'sessions.day3': 'day3',
    'sessions.day4': 'day4',
    'performanceDay': 'performance',
    'openingCeremony': 'opening_ceremony',
    'conference.day1': 'conf_day1',
    'conference.day2': 'conf_day2',
    'conference.day3': 'conf_day3'
  }
  return mapping[dayKey] || null
}

async function updateParticipantAttendanceField(
  participantId: string,
  sessionType: string,
  value: boolean,
  isDelegate: boolean,
  isInvitation: boolean
) {
  const fieldMap: Record<string, string> = {
    'day1': 'day1_session_attended',
    'day2': 'day2_session_attended',
    'day3': 'day3_session_attended',
    'day4': 'day4_session_attended',
    'opening_ceremony': 'opening_ceremony_attended',
    'conf_day1': 'conf_day1_attended',
    'conf_day2': 'conf_day2_attended',
    'conf_day3': 'conf_day3_attended'
  }

  const field = fieldMap[sessionType]
  if (!field) return

  // Use parameterized queries with explicit field names to prevent SQL injection
  if (isDelegate) {
    await query(`
      UPDATE delegates 
      SET ${field} = $1 
      WHERE id = $2
    `, [value, participantId])
  } else if (isInvitation) {
    await query(`
      UPDATE invitations 
      SET ${field} = $1 
      WHERE id = $2
    `, [value, participantId])
  } else {
    await query(`
      UPDATE members 
      SET ${field} = $1 
      WHERE id = $2
    `, [value, participantId])
  }
}

async function updateParticipantCheckIn(
  participantId: string,
  sessionType: string,
  timestamp: Date,
  isDelegate: boolean,
  isInvitation: boolean
) {
  const fieldMap: Record<string, string> = {
    'day1': 'day1_checkin',
    'day2': 'day2_checkin',
    'day3': 'day3_checkin',
    'day4': 'day4_checkin',
    'opening_ceremony': 'opening_ceremony_checkin',
    'conf_day1': 'conf_day1_checkin',
    'conf_day2': 'conf_day2_checkin',
    'conf_day3': 'conf_day3_checkin'
  }

  const field = fieldMap[sessionType]
  if (!field) return

  if (isDelegate) {
    await query(`UPDATE delegates SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  } else if (isInvitation) {
    await query(`UPDATE invitations SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  } else {
    await query(`UPDATE members SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  }
}

async function updateParticipantCheckOut(
  participantId: string,
  sessionType: string,
  timestamp: Date | null,
  isDelegate: boolean,
  isInvitation: boolean
) {
  const fieldMap: Record<string, string> = {
    'day1': 'day1_checkout',
    'day2': 'day2_checkout',
    'day3': 'day3_checkout',
    'day4': 'day4_checkout',
    'opening_ceremony': 'opening_ceremony_checkout',
    'conf_day1': 'conf_day1_checkout',
    'conf_day2': 'conf_day2_checkout',
    'conf_day3': 'conf_day3_checkout'
  }

  const field = fieldMap[sessionType]
  if (!field) return

  if (isDelegate) {
    await query(`UPDATE delegates SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  } else if (isInvitation) {
    await query(`UPDATE invitations SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  } else {
    await query(`UPDATE members SET ${field} = $1 WHERE id = $2`, [timestamp, participantId])
  }
}

export default router
