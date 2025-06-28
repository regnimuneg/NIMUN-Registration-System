import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipants, deleteAllParticipants } from '@/lib/googleSheets'
import { resetCounters } from '@/lib/idGenerator'

export async function GET() {
  try {
    const participants = await getAllParticipants()
    return NextResponse.json(participants)
  } catch (error) {
    console.error('Error fetching all participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Delete all participants from the sheet
    await deleteAllParticipants()
    
    // Reset ID counters since we're starting fresh
    resetCounters()

    return NextResponse.json({
      success: true,
      message: 'All participants deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting all participants:', error)
    return NextResponse.json(
      { error: 'Failed to delete all participants' },
      { status: 500 }
    )
  }
} 