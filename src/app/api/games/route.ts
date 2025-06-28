import { NextRequest, NextResponse } from 'next/server'
import { updateGameActivity } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, activity, action } = body
    
    // Validate required fields
    if (!participantId || !activity || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, activity, action' },
        { status: 400 }
      )
    }

    if (action !== 'join' && action !== 'leave') {
      return NextResponse.json(
        { error: 'Action must be either "join" or "leave"' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // Update game activity in Google Sheets
    await updateGameActivity(participantId, activity, action, timestamp)

    return NextResponse.json({
      success: true,
      message: `Game activity updated for ${participantId}: ${action} ${activity} at ${timestamp}`,
      timestamp
    })
    
  } catch (error) {
    console.error('Game activity update error:', error)
    return NextResponse.json(
      { error: 'Failed to update game activity' },
      { status: 500 }
    )
  }
} 