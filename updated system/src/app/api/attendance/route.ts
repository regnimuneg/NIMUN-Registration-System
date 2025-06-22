import { NextRequest, NextResponse } from 'next/server'
import { updateParticipantAttendance } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, field, value } = body
    
    // Validate required fields
    if (!participantId || !field || typeof value !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, field, value' },
        { status: 400 }
      )
    }

    // Update attendance in Google Sheets
    await updateParticipantAttendance(participantId, field, value)

    return NextResponse.json({
      success: true,
      message: `Attendance updated for ${participantId}: ${field} = ${value}`
    })
    
  } catch (error) {
    console.error('Attendance update error:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    )
  }
} 