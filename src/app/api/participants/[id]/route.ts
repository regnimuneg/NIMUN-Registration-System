import { NextRequest, NextResponse } from 'next/server'
import { getParticipantById, deleteParticipant, getParticipantTrackingData } from '@/lib/googleSheets'
import { markIdAsDeleted } from '@/lib/idGenerator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const includeTracking = searchParams.get('include') === 'tracking'
    
    // CRITICAL FIX: Await params first!
    const { id: participantId } = await params
    
    const participant = await getParticipantById(participantId)
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // If tracking data is requested, fetch it and combine with participant data
    if (includeTracking) {
      try {
        const trackingData = await getParticipantTrackingData(participantId)
        return NextResponse.json({
          participant,
          tracking: trackingData
        })
      } catch (trackingError) {
        console.warn('Error fetching tracking data:', trackingError)
        // Return participant data with empty tracking if tracking fails
        return NextResponse.json({
          participant,
          tracking: {
            dayTracking: {
              sessions: {
                day1: { attended: false, lunch: false },
                day2: { attended: false, lunch: false },
                day3: { attended: false, lunch: false },
                day4: { attended: false, lunch: false }
              },
              performanceDay: { attended: false, breakfast: false, lunch: false },
              openingCeremony: { attended: false, catering: false },
              conference: {
                day1: { attended: false, breakfast: false, lunch: false },
                day2: { attended: false, breakfast: false, lunch: false },
                day3: { attended: false, breakfast: false, lunch: false }
              }
            },
            games: [],
            bus: [],
            food: { breakfast: false, lunch: false, dinner: false, snack1: false, snack2: false }
          }
        })
      }
    }

    // Return just participant data
    return NextResponse.json(participant)
  } catch (error) {
    console.error('Error in participant API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Mark the ID as deleted to prevent reuse
    markIdAsDeleted(participantId)
    
    // Delete the participant
    await deleteParticipant(participantId)

    return NextResponse.json({
      success: true,
      message: `Participant ${participantId} deleted successfully (ID will not be reused)`
    })
    
  } catch (error) {
    console.error('Error deleting participant:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete participant' },
      { status: 500 }
    )
  }
} 