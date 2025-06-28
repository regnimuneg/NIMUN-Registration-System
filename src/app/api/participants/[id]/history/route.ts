import { NextRequest, NextResponse } from 'next/server'
import { getParticipantHistory } from '@/lib/googleSheets'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params
    
    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Get comprehensive history for the participant
    const historyData = await getParticipantHistory(participantId)

    return NextResponse.json(historyData)
    
  } catch (error) {
    console.error('Error fetching participant history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant history' },
      { status: 500 }
    )
  }
} 