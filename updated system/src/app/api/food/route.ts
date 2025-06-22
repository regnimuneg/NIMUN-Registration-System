import { NextRequest, NextResponse } from 'next/server'
import { updateFoodTracking } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, dayKey, meal, value } = body
    
    // Validate required fields
    if (!participantId || !dayKey || !meal || typeof value !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, dayKey, meal, value' },
        { status: 400 }
      )
    }

    // Create timestamp for the action
    const timestamp = new Date().toISOString()

    // Update food tracking in Google Sheets with timestamp
    await updateFoodTracking(participantId, dayKey, meal, value, timestamp)

    return NextResponse.json({
      success: true,
      message: `Food tracking updated for ${participantId}: ${dayKey}.${meal} = ${value}`,
      timestamp
    })
    
  } catch (error) {
    console.error('Food tracking update error:', error)
    return NextResponse.json(
      { error: 'Failed to update food tracking' },
      { status: 500 }
    )
  }
} 