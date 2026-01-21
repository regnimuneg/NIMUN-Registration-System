import express, { type Request, type Response } from 'express'
import { query } from '../config'

const router = express.Router()

// Update comments for a participant and day
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, dayKey, comments } = req.body

    if (!participantId || !dayKey) {
      return res.status(400).json({
        error: 'Missing required fields: participantId, dayKey'
      })
    }

    // Map dayKey to comment field name
    const commentFieldMap: Record<string, string> = {
      'sessions.day1': 'day1_comments',
      'sessions.day2': 'day2_comments',
      'sessions.day3': 'day3_comments',
      'sessions.day4': 'day4_comments',
      'openingCeremony': 'opening_ceremony_comments',
      'conference.day1': 'conf_day1_comments',
      'conference.day2': 'conf_day2_comments',
      'conference.day3': 'conf_day3_comments'
    }

    const commentField = commentFieldMap[dayKey]
    if (!commentField) {
      return res.status(400).json({ error: 'Invalid dayKey' })
    }

    // Check if participant is delegate or member
    const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [participantId])
    const isDelegate = delegateCheck.rows.length > 0

    // Update comments field
    if (isDelegate) {
      await query(`
        UPDATE delegates SET ${commentField} = $1 WHERE id = $2
      `, [comments || null, participantId])
    } else {
      await query(`
        UPDATE members SET ${commentField} = $1 WHERE id = $2
      `, [comments || null, participantId])
    }

    res.json({
      success: true,
      message: `Comments updated for ${participantId} on ${dayKey}`
    })
  } catch (error) {
    console.error('Comments update error:', error)
    res.status(500).json({ error: 'Failed to update comments' })
  }
})

export default router
