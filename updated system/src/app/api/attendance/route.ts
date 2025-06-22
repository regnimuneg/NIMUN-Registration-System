import { NextRequest, NextResponse } from 'next/server'
import { updateParticipantAttendance } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, dayKey, field, value } = body
    
    // Validate required fields
    if (!participantId || !dayKey || !field || typeof value !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, dayKey, field, value' },
        { status: 400 }
      )
    }

    // Create timestamp for the action
    const timestamp = new Date().toISOString()

    // Update attendance in Google Sheets with timestamp
    await updateParticipantAttendance(participantId, dayKey, field, value, timestamp)

    return NextResponse.json({
      success: true,
      message: `Attendance updated for ${participantId}: ${dayKey}.${field} = ${value}`,
      timestamp
    })
    
  } catch (error) {
    console.error('Attendance update error:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    )
  }
} 