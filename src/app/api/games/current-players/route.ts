import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipantsInCourts } from '@/lib/googleSheets'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const day = searchParams.get('day') || 'current'
    
    const courtsData = await getAllParticipantsInCourts(day)
    
    return NextResponse.json({
      success: true,
      courts: courtsData
    })
    
  } catch (error) {
    console.error('Error getting current players:', error)
    return NextResponse.json(
      { error: 'Failed to get current players' },
      { status: 500 }
    )
  }
} 