import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Game player limits
const GAME_LIMITS: Record<string, number> = {
  'Padel Court 1': 4,
  'Padel Court 2': 4,
  'Football Court': 10,
  'Basketball Court 1': 10,
  'Basketball Court 2': 10
}

// Update game activity
router.post('/', async (req: Request, res: Response) => {
  try {
    const { participantId, activity, action, day } = req.body

    if (!participantId || !activity || !action) {
      return res.status(400).json({
        error: 'Missing required fields: participantId, activity, action'
      })
    }

    if (action !== 'join' && action !== 'leave') {
      return res.status(400).json({
        error: 'Action must be either "join" or "leave"'
      })
    }

    const currentDay = day || 'current'
    const timestamp = new Date()

    // For join action, check validations
    if (action === 'join') {
      // Check if participant is already in a game
      const currentGame = await getParticipantCurrentGame(participantId, currentDay)
      if (currentGame) {
        return res.status(400).json({
          error: `You are already in ${currentGame}. Please leave current game first.`
        })
      }

      // Check player limits
      const maxPlayers = GAME_LIMITS[activity]
      if (maxPlayers) {
        const currentPlayers = await getGameCurrentPlayers(activity, currentDay)
        if (currentPlayers >= maxPlayers) {
          return res.status(400).json({
            error: `${activity} is full (${currentPlayers}/${maxPlayers} players). Cannot join.`
          })
        }
      }
    }

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
      'game',
      `${action} ${activity}`,
      `Game activity: ${action} ${activity}`,
      JSON.stringify({ activity, action, day: currentDay, timestamp: timestamp.toISOString() })
    ])

    res.json({
      success: true,
      message: `Game activity updated for ${participantId}: ${action} ${activity} at ${timestamp.toISOString()}`,
      timestamp: timestamp.toISOString()
    })
  } catch (error) {
    console.error('Game activity update error:', error)
    res.status(500).json({ error: 'Failed to update game activity' })
  }
})

// Get current players in a game
router.get('/current-players', async (req: Request, res: Response) => {
  try {
    const day = (req.query.day as string) || 'current'
    const courtsData = await getAllParticipantsInCourts(day)
    res.json({ success: true, courts: courtsData })
  } catch (error) {
    console.error('Error getting current players:', error)
    res.status(500).json({ error: 'Failed to get current players' })
  }
})

async function getParticipantCurrentGame(participantId: string, day: string): Promise<string | null> {
  // Get user_id first
  const userResult = await query(`
    SELECT user_id FROM delegates WHERE id = $1
    UNION ALL
    SELECT user_id FROM members WHERE id = $1
    LIMIT 1
  `, [participantId])

  if (userResult.rows.length === 0) return null

  const userId = userResult.rows[0].user_id

  // Get most recent join without a leave
  const result = await query(`
    WITH game_activities AS (
      SELECT 
        metadata->>'activity' as activity,
        metadata->>'action' as action,
        metadata->>'day' as game_day,
        created_at
      FROM activity_timeline
      WHERE user_id = $1
        AND activity_type = 'game'
        AND (metadata->>'day' = $2 OR metadata->>'day' = 'current')
    )
    SELECT activity
    FROM game_activities
    WHERE action = 'join'
      AND NOT EXISTS (
        SELECT 1 FROM game_activities g2
        WHERE g2.activity = game_activities.activity
          AND g2.action = 'leave'
          AND g2.created_at > game_activities.created_at
      )
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId, day])

  return result.rows[0]?.activity || null
}

async function getGameCurrentPlayers(activity: string, day: string): Promise<number> {
  const result = await query(`
    WITH game_joins AS (
      SELECT user_id, created_at
      FROM activity_timeline
      WHERE activity_type = 'game'
        AND metadata->>'activity' = $1
        AND (metadata->>'day' = $2 OR metadata->>'day' = 'current')
        AND metadata->>'action' = 'join'
    ),
    game_leaves AS (
      SELECT user_id, created_at
      FROM activity_timeline
      WHERE activity_type = 'game'
        AND metadata->>'activity' = $1
        AND (metadata->>'day' = $2 OR metadata->>'day' = 'current')
        AND metadata->>'action' = 'leave'
    )
    SELECT COUNT(DISTINCT gj.user_id) as count
    FROM game_joins gj
    WHERE NOT EXISTS (
      SELECT 1 FROM game_leaves gl
      WHERE gl.user_id = gj.user_id
        AND gl.created_at > gj.created_at
    )
  `, [activity, day])

  return parseInt(result.rows[0]?.count || '0', 10)
}

async function getAllParticipantsInCourts(day: string) {
  // Get all delegates and members currently in games
  const delegatesResult = await query(`
    WITH game_joins AS (
      SELECT user_id, metadata->>'activity' as activity, created_at as join_time
      FROM activity_timeline
      WHERE activity_type = 'game'
        AND (metadata->>'day' = $1 OR metadata->>'day' = 'current')
        AND metadata->>'action' = 'join'
    ),
    game_leaves AS (
      SELECT user_id, metadata->>'activity' as activity, created_at
      FROM activity_timeline
      WHERE activity_type = 'game'
        AND (metadata->>'day' = $1 OR metadata->>'day' = 'current')
        AND metadata->>'action' = 'leave'
    )
    SELECT 
      gj.activity,
      d.id as participant_id,
      CONCAT(u.first_name, ' ', u.last_name) as participant_name,
      d.council as committee,
      gj.join_time
    FROM game_joins gj
    JOIN delegates d ON gj.user_id = d.user_id
    JOIN users u ON d.user_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM game_leaves gl
      WHERE gl.user_id = gj.user_id
        AND gl.activity = gj.activity
        AND gl.created_at > gj.join_time
    )
  `, [day])

  const membersResult = await query(`
    WITH game_joins AS (
      SELECT user_id, metadata->>'activity' as activity, created_at as join_time
      FROM activity_timeline
      WHERE activity_type = 'game'
        AND (metadata->>'day' = $1 OR metadata->>'day' = 'current')
        AND metadata->>'action' = 'join'
    ),
    game_leaves AS (
      SELECT user_id, metadata->>'activity' as activity, created_at
      FROM activity_timeline
      WHERE activity_type = 'game'
        AND (metadata->>'day' = $1 OR metadata->>'day' = 'current')
        AND metadata->>'action' = 'leave'
    )
    SELECT 
      gj.activity,
      m.id as participant_id,
      CONCAT(u.first_name, ' ', u.last_name) as participant_name,
      m.committee as committee,
      gj.join_time
    FROM game_joins gj
    JOIN members m ON gj.user_id = m.user_id
    JOIN users u ON m.user_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM game_leaves gl
      WHERE gl.user_id = gj.user_id
        AND gl.activity = gj.activity
        AND gl.created_at > gj.join_time
    )
  `, [day])

  const allRows = [...delegatesResult.rows, ...membersResult.rows]

  const courts: Record<string, any[]> = {}
  allRows.forEach((row: any) => {
    if (!row.activity) return

    if (!courts[row.activity]) {
      courts[row.activity] = []
    }
    const joinTime = new Date(row.join_time)
    const now = new Date()
    const durationMs = now.getTime() - joinTime.getTime()
    const durationMinutes = Math.floor(durationMs / (1000 * 60))
    const durationHours = Math.floor(durationMinutes / 60)
    const remainingMinutes = durationMinutes % 60
    const duration = durationHours > 0
      ? `${durationHours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`

    courts[row.activity].push({
      participantId: row.participant_id,
      participantName: row.participant_name,
      committee: row.committee || '',
      joinTime: row.join_time,
      duration
    })
  })

  return courts
}

export default router
