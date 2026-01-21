import { query } from '../../config'

type DelegateUsageRow = {
  delegate_id: string
  delegate_name: string
  usage_count: number
}

type VendorUsageRow = {
  vendor_name: string | null
  usage_count: number
}

export async function getVoucherUsageByDelegate() {
  const { rows } = await query<DelegateUsageRow>(
    `
      SELECT
        d.id AS delegate_id,
        CONCAT(u.first_name, ' ', u.last_name) AS delegate_name,
        COUNT(vc.id) AS usage_count
      FROM voucher_claims vc
      JOIN delegates d ON vc.delegate_id = d.id
      JOIN users u ON d.user_id = u.id
      WHERE vc.status = 'redeemed'
      GROUP BY d.id, u.first_name, u.last_name
      ORDER BY usage_count DESC, u.first_name ASC
    `,
  )
  return rows
}

export async function getVoucherUsageByVendor() {
  const { rows } = await query<VendorUsageRow>(
    `
      SELECT
        v.vendor_name AS vendor_name,
        COUNT(vc.id) AS usage_count
      FROM voucher_claims vc
      JOIN vouchers v ON vc.voucher_id = v.id
      WHERE vc.status = 'redeemed'
      GROUP BY v.vendor_name
      ORDER BY usage_count DESC, v.vendor_name ASC
    `,
  )
  return rows
}

