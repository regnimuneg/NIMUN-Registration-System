import { NextRequest, NextResponse } from 'next/server'
import { updateFoodTracking } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, meal, value } = body
    
    // Validate required fields
    if (!participantId || !meal || typeof value !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, meal, value' },
        { status: 400 }
      )
    }

    // Update food tracking in Google Sheets
    await updateFoodTracking(participantId, meal, value)

    return NextResponse.json({
      success: true,
      message: `Food tracking updated for ${participantId}: ${meal} = ${value}`
    })
    
  } catch (error) {
    console.error('Food tracking update error:', error)
    return NextResponse.json(
      { error: 'Failed to update food tracking' },
      { status: 500 }
    )
  }
} 