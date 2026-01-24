import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import { getVoucherUsageByDelegate, getVoucherUsageByVendor } from '../modules/analytics/index.js'

const router = express.Router()

// Get analytics data
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Get participant counts
    const delegatesCount = await query('SELECT COUNT(*) as count FROM delegates').catch(() => ({ rows: [{ count: '0' }] }))
    const membersCount = await query('SELECT COUNT(*) as count FROM members').catch(() => ({ rows: [{ count: '0' }] }))

    // Get attendance stats
    const attendanceStats = await query(`
      SELECT 
        session_type,
        COUNT(DISTINCT delegate_id) as count
      FROM attendance_records
      GROUP BY session_type
    `).catch(() => ({ rows: [] }))

    // Get food stats
    const foodStats = await query(`
      SELECT 
        meal_type,
        COUNT(*) as count
      FROM food_history
      GROUP BY meal_type
    `).catch(() => ({ rows: [] }))

    // Get voucher stats (if using vouchers)
    let voucherStats = {
      byDelegate: [] as any[],
      byVendor: [] as any[]
    }
    try {
      voucherStats = {
        byDelegate: await getVoucherUsageByDelegate(),
        byVendor: await getVoucherUsageByVendor()
      }
    } catch (err) {
      console.error('Voucher stats error (non-critical):', err)
    }

    res.json({
      participants: {
        delegates: parseInt(delegatesCount.rows[0]?.count || '0', 10),
        members: parseInt(membersCount.rows[0]?.count || '0', 10),
        total: parseInt(delegatesCount.rows[0]?.count || '0', 10) + parseInt(membersCount.rows[0]?.count || '0', 10)
      },
      attendance: attendanceStats.rows,
      food: foodStats.rows,
      vouchers: voucherStats
    })
  } catch (error) {
    console.error('Analytics error:', error)
    // Return partial data even if some queries fail
    res.status(200).json({
      participants: {
        delegates: 0,
        members: 0,
        total: 0
      },
      attendance: [],
      food: [],
      vouchers: {
        byDelegate: [],
        byVendor: []
      },
      error: 'Database connection failed. Please check your DATABASE_URL in .env file.'
    })
  }
})

// Get detailed voucher analytics
router.get('/vouchers', async (_req: Request, res: Response) => {
  try {
    // Get voucher usage by delegate with details
    const delegateUsage = await query(`
      SELECT
        d.id AS delegate_id,
        CONCAT(u.first_name, ' ', u.last_name) AS delegate_name,
        d.council,
        COUNT(vc.id) AS total_claims,
        COUNT(CASE WHEN vc.status = 'redeemed' THEN 1 END) AS redeemed_count,
        COUNT(CASE WHEN vc.status = 'active' THEN 1 END) AS active_count,
        COUNT(CASE WHEN vc.status = 'expired' THEN 1 END) AS expired_count,
        MIN(vc.claimed_at) AS first_claim,
        MAX(vc.claimed_at) AS last_claim
      FROM delegates d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN voucher_claims vc ON d.id = vc.delegate_id
      GROUP BY d.id, u.first_name, u.last_name, d.council
      HAVING COUNT(vc.id) > 0
      ORDER BY total_claims DESC, delegate_name ASC
    `)

    // Get voucher usage by vendor with details
    const vendorUsage = await query(`
      SELECT
        v.vendor_name,
        v.name AS voucher_name,
        COUNT(vc.id) AS total_claims,
        COUNT(CASE WHEN vc.status = 'redeemed' THEN 1 END) AS redeemed_count,
        COUNT(CASE WHEN vc.status = 'active' THEN 1 END) AS active_count,
        COUNT(CASE WHEN vc.status = 'expired' THEN 1 END) AS expired_count,
        COUNT(DISTINCT vc.delegate_id) AS unique_delegates,
        MIN(vc.claimed_at) AS first_claim,
        MAX(vc.claimed_at) AS last_claim
      FROM vouchers v
      LEFT JOIN voucher_claims vc ON v.id = vc.voucher_id
      WHERE v.vendor_name IS NOT NULL
      GROUP BY v.vendor_name, v.name
      HAVING COUNT(vc.id) > 0
      ORDER BY total_claims DESC, v.vendor_name ASC
    `)

    // Get voucher usage by voucher type
    const voucherTypeUsage = await query(`
      SELECT
        v.name AS voucher_name,
        v.vendor_name,
        v.id AS voucher_id,
        COUNT(vc.id) AS total_claims,
        COUNT(CASE WHEN vc.status = 'redeemed' THEN 1 END) AS redeemed_count,
        COUNT(CASE WHEN vc.status = 'active' THEN 1 END) AS active_count,
        COUNT(DISTINCT vc.delegate_id) AS unique_delegates
      FROM vouchers v
      LEFT JOIN voucher_claims vc ON v.id = vc.voucher_id
      GROUP BY v.id, v.name, v.vendor_name
      ORDER BY total_claims DESC, v.name ASC
    `)

    // Get recent voucher claims
    const recentClaims = await query(`
      SELECT
        vc.id,
        CONCAT(u.first_name, ' ', u.last_name) AS delegate_name,
        d.id AS delegate_id,
        v.name AS voucher_name,
        v.vendor_name,
        vc.status,
        vc.claimed_at,
        vc.redeemed_at
      FROM voucher_claims vc
      JOIN delegates d ON vc.delegate_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN vouchers v ON vc.voucher_id = v.id
      ORDER BY vc.claimed_at DESC
      LIMIT 50
    `)

    res.json({
      byDelegate: delegateUsage.rows,
      byVendor: vendorUsage.rows,
      byVoucherType: voucherTypeUsage.rows,
      recentClaims: recentClaims.rows,
      summary: {
        totalDelegatesWithVouchers: delegateUsage.rows.length,
        totalVendors: vendorUsage.rows.length,
        totalVoucherTypes: voucherTypeUsage.rows.length,
        totalClaims: delegateUsage.rows.reduce((sum: number, row: any) => sum + parseInt(row.total_claims || '0', 10), 0),
        totalRedeemed: delegateUsage.rows.reduce((sum: number, row: any) => sum + parseInt(row.redeemed_count || '0', 10), 0)
      }
    })
  } catch (error) {
    console.error('Voucher analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch voucher analytics' })
  }
})

// Export attendance data - shows ALL participants with 0/1 for each day
router.get('/attendance/export', async (req: Request, res: Response) => {
  try {
    const { council, committee, dayType, participantType } = req.query

    let data: any[] = []

    // Export delegates
    if (participantType === 'delegates' || !participantType) {
      let delegateQuery = `
        SELECT 
          d.id as participant_id,
          CONCAT(u.first_name, ' ', u.last_name) as participant_name,
          d.council,
          'delegate' as participant_type,
          CASE WHEN COALESCE(d.day1_session_attended, false) THEN 1 ELSE 0 END as day1,
          CASE WHEN COALESCE(d.day2_session_attended, false) THEN 1 ELSE 0 END as day2,
          CASE WHEN COALESCE(d.day3_session_attended, false) THEN 1 ELSE 0 END as day3,
          CASE WHEN COALESCE(d.day4_session_attended, false) THEN 1 ELSE 0 END as day4,
          CASE WHEN COALESCE(d.opening_ceremony_attended, false) THEN 1 ELSE 0 END as opening_ceremony,
          CASE WHEN COALESCE(d.conf_day1_attended, false) THEN 1 ELSE 0 END as conf_day1,
          CASE WHEN COALESCE(d.conf_day2_attended, false) THEN 1 ELSE 0 END as conf_day2,
          CASE WHEN COALESCE(d.conf_day3_attended, false) THEN 1 ELSE 0 END as conf_day3
        FROM delegates d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE 1=1
      `
      const delegateParams: any[] = []
      let delegateParamIndex = 1

      if (council) {
        delegateQuery += ` AND d.council = $${delegateParamIndex}`
        delegateParams.push(council)
        delegateParamIndex++
      }

      delegateQuery += ` ORDER BY d.council, d.id`

      const delegateResult = await query(delegateQuery, delegateParams)

      // Format based on dayType filter
      delegateResult.rows.forEach((row: any) => {
        const formattedRow: any = {
          id: row.participant_id,
          name: row.participant_name,
          council: row.council,
          type: 'Delegate'
        }

        if (!dayType || dayType === 'sessions') {
          formattedRow.day1 = row.day1
          formattedRow.day2 = row.day2
          formattedRow.day3 = row.day3
          formattedRow.day4 = row.day4
        }
        if (!dayType || dayType === 'opening') {
          formattedRow.opening_ceremony = row.opening_ceremony
        }
        if (!dayType || dayType === 'conf') {
          formattedRow.conf_day1 = row.conf_day1
          formattedRow.conf_day2 = row.conf_day2
          formattedRow.conf_day3 = row.conf_day3
        }

        data.push(formattedRow)
      })
    }

    // Export members
    if (participantType === 'members') {
      let memberQuery = `
        SELECT 
          m.id as participant_id,
          CONCAT(u.first_name, ' ', u.last_name) as participant_name,
          m.committee,
          m.role,
          'member' as participant_type,
          CASE WHEN COALESCE(m.day1_session_attended, false) THEN 1 ELSE 0 END as day1,
          CASE WHEN COALESCE(m.day2_session_attended, false) THEN 1 ELSE 0 END as day2,
          CASE WHEN COALESCE(m.day3_session_attended, false) THEN 1 ELSE 0 END as day3,
          CASE WHEN COALESCE(m.day4_session_attended, false) THEN 1 ELSE 0 END as day4,
          CASE WHEN COALESCE(m.opening_ceremony_attended, false) THEN 1 ELSE 0 END as opening_ceremony,
          CASE WHEN COALESCE(m.conf_day1_attended, false) THEN 1 ELSE 0 END as conf_day1,
          CASE WHEN COALESCE(m.conf_day2_attended, false) THEN 1 ELSE 0 END as conf_day2,
          CASE WHEN COALESCE(m.conf_day3_attended, false) THEN 1 ELSE 0 END as conf_day3
        FROM members m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE 1=1
      `
      const memberParams: any[] = []
      let memberParamIndex = 1

      if (committee) {
        // If exporting Executive, also include High Board members
        if (committee === 'Executive') {
          memberQuery += ` AND (m.committee = $${memberParamIndex} OR m.committee = $${memberParamIndex + 1})`
          memberParams.push('Executive', 'High Board')
          memberParamIndex += 2
        } else {
          memberQuery += ` AND m.committee = $${memberParamIndex}`
          memberParams.push(committee)
          memberParamIndex++
        }
      }

      memberQuery += ` ORDER BY m.committee, m.id`

      const memberResult = await query(memberQuery, memberParams)

      // Format based on dayType filter
      memberResult.rows.forEach((row: any) => {
        const formattedRow: any = {
          id: row.participant_id,
          name: row.participant_name,
          committee: row.committee,
          role: row.role,
          type: 'Member'
        }

        if (!dayType || dayType === 'sessions') {
          formattedRow.day1 = row.day1
          formattedRow.day2 = row.day2
          formattedRow.day3 = row.day3
          formattedRow.day4 = row.day4
        }
        if (!dayType || dayType === 'opening') {
          formattedRow.opening_ceremony = row.opening_ceremony
        }
        if (!dayType || dayType === 'conf') {
          formattedRow.conf_day1 = row.conf_day1
          formattedRow.conf_day2 = row.conf_day2
          formattedRow.conf_day3 = row.conf_day3
        }

        data.push(formattedRow)
      })
    }

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: {
        council: council || null,
        committee: committee || null,
        dayType: dayType || null,
        participantType: participantType || 'delegates'
      }
    })
  } catch (error) {
    console.error('Attendance export error:', error)
    res.status(500).json({ error: 'Failed to export attendance data' })
  }
})

export default router
