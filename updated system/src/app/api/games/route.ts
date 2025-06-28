import { NextRequest, NextResponse } from 'next/server'
import { updateGameActivity, getGameCurrentPlayers, getParticipantCurrentGame } from '@/lib/googleSheets'

// Game player limits
const GAME_LIMITS = {
  'Padel Court 1': 4,
  'Padel Court 2': 4,
  'Football Court': 10,
  'Basketball Court 1': 10,
  'Basketball Court 2': 10
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, activity, action, day } = body
    
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

    const currentDay = day || 'current'

    // For join action, check multiple validations
    if (action === 'join') {
      // Check if participant is already in any game
      const currentGame = await getParticipantCurrentGame(participantId, currentDay)
      if (currentGame) {
        return NextResponse.json(
          { error: `You are already in ${currentGame}. Please leave current game first.` },
          { status: 400 }
        )
      }

      // Check player limits
      const maxPlayers = GAME_LIMITS[activity as keyof typeof GAME_LIMITS]
      if (maxPlayers) {
        const currentPlayers = await getGameCurrentPlayers(activity, currentDay)
        if (currentPlayers >= maxPlayers) {
          return NextResponse.json(
            { error: `${activity} is full (${currentPlayers}/${maxPlayers} players). Cannot join.` },
            { status: 400 }
          )
        }
      }
    }

    const timestamp = new Date().toISOString()

    // Update game activity in Google Sheets
    await updateGameActivity(participantId, activity, action, timestamp, currentDay)

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