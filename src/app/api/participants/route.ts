import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipants, deleteAllParticipants } from '@/lib/googleSheets'
import { resetCounters } from '@/lib/idGenerator'
import { addCorsHeaders } from '@/lib/cors'

export async function GET() {
  try {
    const participants = await getAllParticipants()
    const response = NextResponse.json(participants)
    return addCorsHeaders(response)
  } catch (error) {
    console.error('Error fetching all participants:', error)
    const response = NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Delete all participants from the sheet
    await deleteAllParticipants()
    
    // Reset ID counters since we're starting fresh
    resetCounters()

    const response = NextResponse.json({
      success: true,
      message: 'All participants deleted successfully'
    })
    return addCorsHeaders(response)
    
  } catch (error) {
    console.error('Error deleting all participants:', error)
    const response = NextResponse.json(
      { error: 'Failed to delete all participants' },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
} 