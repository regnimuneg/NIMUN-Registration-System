import { NextRequest, NextResponse } from 'next/server'
import { updateBusTracking } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, type, stop } = body
    
    // Validate required fields
    if (!participantId || !type || !stop) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, type, stop' },
        { status: 400 }
      )
    }

    if (type !== 'arriving' && type !== 'departing') {
      return NextResponse.json(
        { error: 'Type must be either "arriving" or "departing"' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // Update bus tracking in Google Sheets
    await updateBusTracking(participantId, type, stop, timestamp)

    return NextResponse.json({
      success: true,
      message: `Bus tracking updated for ${participantId}: ${type} at ${stop} at ${timestamp}`,
      timestamp
    })
    
  } catch (error) {
    console.error('Bus tracking update error:', error)
    return NextResponse.json(
      { error: 'Failed to update bus tracking' },
      { status: 500 }
    )
  }
} 