import { NextRequest, NextResponse } from 'next/server'
import { getParticipantTrackingData } from '@/lib/googleSheets'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participantId = params.id
    
    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Get tracking data for the participant
    const trackingData = await getParticipantTrackingData(participantId)

    return NextResponse.json(trackingData)
    
  } catch (error) {
    console.error('Error fetching participant tracking data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracking data' },
      { status: 500 }
    )
  }
} 