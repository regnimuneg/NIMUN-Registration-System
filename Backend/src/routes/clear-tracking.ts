import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'

const router = express.Router()

// Clear tracking data
router.post('/', async (req: Request, res: Response) => {
  try {
    const { dataType } = req.body

    if (!dataType) {
      return res.status(400).json({ error: 'dataType is required' })
    }

    switch (dataType) {
      case 'all':
        // Clear all tracking data
        await query('DELETE FROM attendance_records')
        await query('DELETE FROM food_history')
        await query('DELETE FROM activity_timeline WHERE activity_type IN (\'game\', \'other\', \'bus\')')

        // Reset attendance fields in delegates and members
        await query(`
          UPDATE delegates SET
            day1_session_attended = FALSE, day1_food = FALSE, day1_bus_checkin = NULL, day1_bus_checkout = NULL,
            day2_session_attended = FALSE, day2_food = FALSE, day2_bus_checkin = NULL, day2_bus_checkout = NULL,
            day3_session_attended = FALSE, day3_food = FALSE, day3_bus_checkin = NULL, day3_bus_checkout = NULL,
            day4_session_attended = FALSE, day4_food = FALSE, day4_bus_checkin = NULL, day4_bus_checkout = NULL,
            performance_day_bus_checkin = NULL, performance_day_bus_checkout = NULL,
            opening_ceremony_attended = FALSE, opening_ceremony_food = FALSE, opening_ceremony_bus_checkin = NULL, opening_ceremony_bus_checkout = NULL,
            conf_day1_attended = FALSE, conf_day1_breakfast = FALSE, conf_day1_lunch = FALSE, conf_day1_bus_checkin = NULL, conf_day1_bus_checkout = NULL,
            conf_day2_attended = FALSE, conf_day2_breakfast = FALSE, conf_day2_lunch = FALSE, conf_day2_bus_checkin = NULL, conf_day2_bus_checkout = NULL,
            conf_day3_attended = FALSE, conf_day3_breakfast = FALSE, conf_day3_lunch = FALSE, conf_day3_bus_checkin = NULL, conf_day3_bus_checkout = NULL
        `)
        await query(`
          UPDATE members SET
            day1_session_attended = FALSE, day1_food = FALSE, day1_bus_checkin = NULL, day1_bus_checkout = NULL,
            day2_session_attended = FALSE, day2_food = FALSE, day2_bus_checkin = NULL, day2_bus_checkout = NULL,
            day3_session_attended = FALSE, day3_food = FALSE, day3_bus_checkin = NULL, day3_bus_checkout = NULL,
            day4_session_attended = FALSE, day4_food = FALSE, day4_bus_checkin = NULL, day4_bus_checkout = NULL,
            performance_day_bus_checkin = NULL, performance_day_bus_checkout = NULL,
            opening_ceremony_attended = FALSE, opening_ceremony_food = FALSE, opening_ceremony_bus_checkin = NULL, opening_ceremony_bus_checkout = NULL,
            conf_day1_attended = FALSE, conf_day1_breakfast = FALSE, conf_day1_lunch = FALSE, conf_day1_bus_checkin = NULL, conf_day1_bus_checkout = NULL,
            conf_day2_attended = FALSE, conf_day2_breakfast = FALSE, conf_day2_lunch = FALSE, conf_day2_bus_checkin = NULL, conf_day2_bus_checkout = NULL,
            conf_day3_attended = FALSE, conf_day3_breakfast = FALSE, conf_day3_lunch = FALSE, conf_day3_bus_checkin = NULL, conf_day3_bus_checkout = NULL
        `)
        break

      case 'attendance':
        await query('DELETE FROM attendance_records')
        await query(`
          UPDATE delegates SET
            day1_session_attended = FALSE, day2_session_attended = FALSE,
            day3_session_attended = FALSE, day4_session_attended = FALSE,
            opening_ceremony_attended = FALSE,
            conf_day1_attended = FALSE, conf_day2_attended = FALSE, conf_day3_attended = FALSE
        `)
        await query(`
          UPDATE members SET
            day1_session_attended = FALSE, day2_session_attended = FALSE,
            day3_session_attended = FALSE, day4_session_attended = FALSE,
            opening_ceremony_attended = FALSE,
            conf_day1_attended = FALSE, conf_day2_attended = FALSE, conf_day3_attended = FALSE
        `)
        break

      case 'food':
        await query('DELETE FROM food_history')
        await query(`
          UPDATE delegates SET
            day1_food = FALSE, day2_food = FALSE, day3_food = FALSE, day4_food = FALSE,
            opening_ceremony_food = FALSE,
            conf_day1_breakfast = FALSE, conf_day1_lunch = FALSE,
            conf_day2_breakfast = FALSE, conf_day2_lunch = FALSE,
            conf_day3_breakfast = FALSE, conf_day3_lunch = FALSE
        `)
        await query(`
          UPDATE members SET
            day1_food = FALSE, day2_food = FALSE, day3_food = FALSE, day4_food = FALSE,
            opening_ceremony_food = FALSE,
            conf_day1_breakfast = FALSE, conf_day1_lunch = FALSE,
            conf_day2_breakfast = FALSE, conf_day2_lunch = FALSE,
            conf_day3_breakfast = FALSE, conf_day3_lunch = FALSE
        `)
        break

      case 'games':
        await query('DELETE FROM activity_timeline WHERE activity_type = \'game\'')
        break

      case 'bus':
        await query('DELETE FROM activity_timeline WHERE activity_type = \'bus\'')
        await query(`
          UPDATE delegates SET
            day1_bus_checkin = NULL, day1_bus_checkout = NULL,
            day2_bus_checkin = NULL, day2_bus_checkout = NULL,
            day3_bus_checkin = NULL, day3_bus_checkout = NULL,
            day4_bus_checkin = NULL, day4_bus_checkout = NULL,
            performance_day_bus_checkin = NULL, performance_day_bus_checkout = NULL,
            opening_ceremony_bus_checkin = NULL, opening_ceremony_bus_checkout = NULL,
            conf_day1_bus_checkin = NULL, conf_day1_bus_checkout = NULL,
            conf_day2_bus_checkin = NULL, conf_day2_bus_checkout = NULL,
            conf_day3_bus_checkin = NULL, conf_day3_bus_checkout = NULL
        `)
        await query(`
          UPDATE members SET
            day1_bus_checkin = NULL, day1_bus_checkout = NULL,
            day2_bus_checkin = NULL, day2_bus_checkout = NULL,
            day3_bus_checkin = NULL, day3_bus_checkout = NULL,
            day4_bus_checkin = NULL, day4_bus_checkout = NULL,
            performance_day_bus_checkin = NULL, performance_day_bus_checkout = NULL,
            opening_ceremony_bus_checkin = NULL, opening_ceremony_bus_checkout = NULL,
            conf_day1_bus_checkin = NULL, conf_day1_bus_checkout = NULL,
            conf_day2_bus_checkin = NULL, conf_day2_bus_checkout = NULL,
            conf_day3_bus_checkin = NULL, conf_day3_bus_checkout = NULL
        `)
        break

      case 'activity-tracking':
        await query('DELETE FROM activity_timeline')
        break

      default:
        return res.status(400).json({ error: `Invalid data type: ${dataType}` })
    }

    res.json({
      success: true,
      message: `Cleared ${dataType} tracking data successfully`
    })
  } catch (error) {
    console.error('Error clearing tracking data:', error)
    res.status(500).json({ error: 'Failed to clear tracking data' })
  }
})

export default router
