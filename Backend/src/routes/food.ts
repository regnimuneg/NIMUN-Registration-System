import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Update food tracking
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, dayKey, meal, value, requesterId } = req.body

    if (!participantId || !dayKey || !meal || typeof value !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields: participantId, dayKey, meal, value'
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
            error: 'Members cannot track food for other members. Only admins can track members.'
          })
        }
        // If target is delegate, allow tracking
      }
      // If requester is admin (not a member), allow all tracking
    }

    const timestamp = new Date()

    // Get user_id for this participant (delegate or member)
    const participantCheck = await query(`
      SELECT user_id FROM delegates WHERE id = $1
      UNION ALL
      SELECT user_id FROM members WHERE id = $1
      LIMIT 1
    `, [participantId])

    if (participantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    const userId = participantCheck.rows[0].user_id

    // Check if participant is delegate (food_history table only supports delegates)
    const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [participantId])
    const isDelegate = delegateCheck.rows.length > 0

    if (value) {
      // Insert food history record (only for delegates - schema limitation)
      if (isDelegate) {
        // Map 'catering' to 'snack' for food_history table (schema limitation)
        const mealTypeForDB = meal === 'catering' ? 'snack' : meal
        await query(`
          INSERT INTO food_history (
            delegate_id,
            meal_type,
            meal_day,
            claimed_at
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [participantId, mealTypeForDB, dayKey, timestamp])
      }

      // Update delegates/members table food fields (both have same structure)
      await updateParticipantFoodField(participantId, dayKey, meal, true, isDelegate)
    } else {
      // Remove food record (only for delegates)
      if (isDelegate) {
        await query(`
          DELETE FROM food_history
          WHERE delegate_id = $1 AND meal_type = $2 AND meal_day = $3
        `, [participantId, meal, dayKey])
      }

      await updateParticipantFoodField(participantId, dayKey, meal, false, isDelegate)
    }

    // Add to activity timeline (for both delegates and members)
    await query(`
      INSERT INTO activity_timeline (
        user_id,
        activity_type,
        title,
        description,
        metadata
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      userId,
      'food',
      `${dayKey} ${meal}`,
      `Food tracking: ${meal} for ${dayKey}`,
      JSON.stringify({ dayKey, meal, value })
    ])

    res.json({
      success: true,
      message: `Food tracking updated for ${participantId}: ${dayKey}.${meal} = ${value}`,
      timestamp: timestamp.toISOString()
    })
  } catch (error) {
    console.error('Food tracking update error:', error)
    res.status(500).json({ error: 'Failed to update food tracking' })
  }
})

async function updateParticipantFoodField(
  participantId: string,
  dayKey: string,
  meal: string,
  value: boolean,
  isDelegate: boolean
) {
  // Map dayKey.meal to actual database fields (whitelist to prevent SQL injection)
  const fieldMap: Record<string, string> = {
    'sessions.day1.lunch': 'day1_food',
    'sessions.day2.lunch': 'day2_food',
    'sessions.day3.lunch': 'day3_food',
    'sessions.day4.lunch': 'day4_food',
    'openingCeremony.catering': 'opening_ceremony_food',
    'conference.day1.breakfast': 'conf_day1_breakfast',
    'conference.day1.lunch': 'conf_day1_lunch',
    'conference.day2.breakfast': 'conf_day2_breakfast',
    'conference.day2.lunch': 'conf_day2_lunch',
    'conference.day3.breakfast': 'conf_day3_breakfast',
    'conference.day3.lunch': 'conf_day3_lunch'
  }

  const field = fieldMap[`${dayKey}.${meal}`]
  if (!field) {
    // Field not in whitelist - just track in activity_timeline
    return
  }

  // Update delegates or members table (both have same food tracking fields)
  // Using explicit field name from whitelist to prevent SQL injection
  if (isDelegate) {
    await query(`
      UPDATE delegates SET ${field} = $1 WHERE id = $2
    `, [value, participantId])
  } else {
    await query(`
      UPDATE members SET ${field} = $1 WHERE id = $2
    `, [value, participantId])
  }
}

export default router
