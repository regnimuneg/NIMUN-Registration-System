import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import { scanTime } from '../lib/scan-time.js'
import { INACTIVE_ERROR } from '../middleware/auth.js'
import { lookupPerson, blockedFor } from '../lib/person.js'

const router = express.Router()

// Update attendance
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, dayKey, field, value, checkIn, checkOut } = req.body
    // Live scanner check-ins send rejectIfPresent so one request both checks and saves
    const rejectIfPresent = req.body.rejectIfPresent === true

    if (!participantId || !dayKey || !field || typeof value !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields: participantId, dayKey, field, value'
      })
    }

    // Access control from the server-side session (requesterId from the browser is ignored)
    // One lookup for access, inactive, type and user (was five separate queries)
    const person = await lookupPerson(participantId)
    const blocked = blockedFor(req, person, 'attendance')
    if (blocked) return res.status(403).json({ error: blocked })
    if (person?.inactive) return res.status(403).json({ error: INACTIVE_ERROR, inactive: true })
    if (!person) return res.status(404).json({ error: 'Participant not found' })

    // Map dayKey to session_type
    const sessionType = mapDayKeyToSessionType(dayKey)
    if (!sessionType) {
      return res.status(400).json({ error: 'Invalid dayKey' })
    }

    // Offline scans are synced later and carry the time they were really scanned
    const timestamp = scanTime(req.body.scannedAt)

    // Check if participant is delegate, member, or invitation
    const isDelegate = person.source === 'delegate'
    const isInvitation = person.source === 'invitation'

    if (checkIn) {
      if (value && rejectIfPresent) {
        const state = await getDayState(participantId, sessionType, isDelegate, isInvitation)
        if (state?.attended) {
          return res.status(409).json({
            error: 'Already marked present', alreadyPresent: true, name: person.name,
            checkedInAt: state.checkin ? new Date(state.checkin).toISOString() : null,
          })
        }
      }
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
      if (value) {
        // '27: only someone who checked in can check out, and only once per day.
        // Checked here too so phones replaying offline scans get the same answer.
        const state = await getDayState(participantId, sessionType, isDelegate, isInvitation)
        if (state && !state.attended && !state.checkin) {
          return res.status(409).json({ error: 'Not checked in today', notCheckedIn: true, name: person.name })
        }
        if (state?.checkout) {
          return res.status(409).json({ error: 'Already checked out', duplicate: true, name: person.name, checkedOutAt: new Date(state.checkout).toISOString() })
        }
      }
      if (isDelegate) {
        await query(`
          UPDATE attendance_records
          SET check_out_time = $1
          WHERE delegate_id = $2 AND session_type = $3
        `, [timestamp, participantId, sessionType])
      }

      // Update delegates/members/invitations table check-out time
      // Note: We do NOT change attendance status - they were present, they just checked out
      // value false = undo the check-out
      await updateParticipantCheckOut(participantId, sessionType, value ? timestamp : null, isDelegate, isInvitation)
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
      // '27 undo: forget the check-in time too
      await updateParticipantCheckIn(participantId, sessionType, null, isDelegate, isInvitation)
      await updateParticipantCheckOut(participantId, sessionType, null, isDelegate, isInvitation)
    }

    // Get user_id for activity timeline
    if (person.userId) {
      const userId = person.userId
      const title = `${dayKey} Attendance`

      // Determine description based on action type
      let description: string
      if (checkIn) {
        description = 'Checked in'
      } else if (checkOut) {
        description = value ? 'Checked out' : 'Check-out undone' // Checkout != absent, they were present and left
      } else {
        description = value ? `Marked as present` : `Marked as absent`
      }

      // '27: always add a new entry so the scan log keeps every scan and undo
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
        JSON.stringify({ dayKey, field, value, checkIn, checkOut, scannedBy: req.auth?.memberId ?? null }),
        timestamp
      ])
    }

    res.json({
      success: true,
      message: `Attendance updated for ${participantId}: ${dayKey}.${field} = ${value}`,
      timestamp: timestamp.toISOString(),
      name: person.name
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
  timestamp: Date | null,
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

// Current attendance / check-in / check-out of one person for one day
async function getDayState(
  participantId: string,
  sessionType: string,
  isDelegate: boolean,
  isInvitation: boolean
): Promise<{ attended: boolean; checkin: Date | null; checkout: Date | null } | null> {
  const attendedMap: Record<string, string> = {
    'day1': 'day1_session_attended',
    'day2': 'day2_session_attended',
    'day3': 'day3_session_attended',
    'day4': 'day4_session_attended',
    'opening_ceremony': 'opening_ceremony_attended',
    'conf_day1': 'conf_day1_attended',
    'conf_day2': 'conf_day2_attended',
    'conf_day3': 'conf_day3_attended'
  }
  const attendedCol = attendedMap[sessionType]
  if (!attendedCol) return null
  // Column names come from the fixed map above only
  const table = isDelegate ? 'delegates' : isInvitation ? 'invitations' : 'members'
  try {
    const r = await query(
      `SELECT COALESCE(${attendedCol}, FALSE) AS attended, ${sessionType}_checkin AS checkin, ${sessionType}_checkout AS checkout FROM ${table} WHERE id = $1`,
      [participantId]
    )
    return (r.rows[0] as any) ?? null
  } catch {
    return null // e.g. a table without these columns: skip the check
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
