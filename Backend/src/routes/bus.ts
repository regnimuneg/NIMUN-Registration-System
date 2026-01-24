import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Update bus tracking
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, type, stop, route, day } = req.body

    if (!participantId || !type || !stop) {
      return res.status(400).json({
        error: 'Missing required fields: participantId, type, stop'
      })
    }

    if (type !== 'arriving' && type !== 'departing') {
      return res.status(400).json({
        error: 'Type must be either "arriving" or "departing"'
      })
    }

    const timestamp = new Date()
    const currentDay = day || 'current'

    // Get user_id for activity timeline
    const userResult = await query(`
      SELECT user_id FROM delegates WHERE id = $1
      UNION ALL
      SELECT user_id FROM members WHERE id = $1
      LIMIT 1
    `, [participantId])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    const userId = userResult.rows[0].user_id

    // Add to activity timeline
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
      'other',
      `${type} at ${stop}`,
      `Bus tracking: ${type} at ${stop}${route ? ` on ${route}` : ''}`,
      JSON.stringify({ type, stop, route: route || null, day: currentDay, timestamp: timestamp.toISOString() })
    ])

    res.json({
      success: true,
      message: `Bus tracking updated for ${participantId}: ${type} at ${stop} at ${timestamp.toISOString()}`,
      timestamp: timestamp.toISOString()
    })
  } catch (error) {
    console.error('Bus tracking update error:', error)
    res.status(500).json({ error: 'Failed to update bus tracking' })
  }
})

export default router
