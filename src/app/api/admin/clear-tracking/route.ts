import { NextRequest, NextResponse } from 'next/server'
import { clearAllTrackingData } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminRole, dataType } = body
    
    // Check admin permissions
    if (adminRole !== 'super-admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Super admin access required.' },
        { status: 403 }
      )
    }

    // Validate data type
    const validDataTypes = ['all', 'attendance', 'food', 'games', 'bus', 'activity-tracking']
    if (!validDataTypes.includes(dataType)) {
      return NextResponse.json(
        { error: 'Invalid data type. Must be one of: ' + validDataTypes.join(', ') },
        { status: 400 }
      )
    }

    // Clear the specified tracking data
    await clearAllTrackingData(dataType)

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${dataType === 'all' ? 'all tracking data' : dataType + ' data'}`,
      clearedDataType: dataType,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Clear tracking data error:', error)
    return NextResponse.json(
      { error: 'Failed to clear tracking data' },
      { status: 500 }
    )
  }
} 