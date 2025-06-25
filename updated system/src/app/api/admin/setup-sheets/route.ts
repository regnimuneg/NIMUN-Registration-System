import { NextRequest, NextResponse } from 'next/server'
import { createParticipantsSheet } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    console.log('Setting up all required sheets...')
    
    // This will create both Participants and Attendance sheets
    await createParticipantsSheet()
    
    console.log('All sheets created successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'All required sheets have been created',
      sheets: [
        'Participants (basic info)',
        'Attendance (dedicated attendance tracking)',
        'Food (food distribution)',
        'Games (activities)',
        'Bus (transportation)',
        'ActivityTracking (comprehensive log)'
      ]
    })
    
  } catch (error) {
    console.error('Setup sheets error:', error)
    return NextResponse.json(
      { error: 'Failed to setup sheets: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 