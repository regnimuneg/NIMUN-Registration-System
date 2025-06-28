import { NextRequest, NextResponse } from 'next/server'
import { getSheetNames, createParticipantsSheet, getAllParticipants } from '@/lib/googleSheets'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      spreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      clientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      privateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      spreadsheetIdValue: process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.substring(0, 10) + '...',
      clientEmailValue: process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.substring(0, 20) + '...'
    }

    console.log('Environment check:', envCheck)

    // Test Google Sheets connection
    const sheetNames = await getSheetNames()
    console.log('Sheet names:', sheetNames)

    // Try to create participants sheet
    await createParticipantsSheet()

    // Check what participants are actually in the sheet
    const participants = await getAllParticipants()
    console.log('Participants found:', participants.length)

    return NextResponse.json({
      success: true,
      environment: envCheck,
      sheetNames,
      participantsCount: participants.length,
      sampleParticipants: participants.slice(0, 3), // Show first 3 participants
      message: 'Google Sheets connection successful'
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        spreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        clientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        privateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY
      }
    }, { status: 500 })
  }
} 