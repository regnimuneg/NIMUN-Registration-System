import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipants } from '@/lib/googleSheets'

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

    // Get all participants and find the one we need
    const participants = await getAllParticipants()
    const participant = participants.find(p => p.id === participantId)

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(participant)
    
  } catch (error) {
    console.error('Error fetching participant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant' },
      { status: 500 }
    )
  }
} 