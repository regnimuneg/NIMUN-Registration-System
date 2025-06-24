import { NextRequest, NextResponse } from 'next/server'
import { generateParticipantId } from '@/lib/idGenerator'
import { generateQRCodeUrl } from '@/lib/qrHelper'
import { addParticipant, createParticipantsSheet, getAllParticipants } from '@/lib/googleSheets'
import { initializeCountersFromExisting } from '@/lib/idGenerator'
import { Participant, CommitteeType } from '@/types/participant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phoneNumber, position, gender, busRoute, busStop } = body
    
    // Validate required fields
    if (!name || !phoneNumber || !position || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate gender
    if (gender !== 'Male' && gender !== 'Female') {
      return NextResponse.json(
        { error: 'Gender must be Male or Female' },
        { status: 400 }
      )
    }

    // Ensure the Participants sheet exists
    await createParticipantsSheet()
    
    // Get existing participants to initialize ID counters properly
    const existingParticipants = await getAllParticipants()
    const existingIds = existingParticipants.map(p => p.id)
    initializeCountersFromExisting(existingIds)
    
    // Generate ID and QR code (pass name for reserved ID check)
    const participantId = generateParticipantId(position as CommitteeType, name)
    const qrData = generateQRCodeUrl(participantId)
    
    const participant: Participant = {
      id: participantId,
      name,
      phoneNumber,
      position: position as CommitteeType,
      gender,
      qrUrl: qrData,
      busRoute: busRoute || undefined,
      busStop: busStop || undefined
    }
    
    // Save to Google Sheets
    await addParticipant(participant)
    
    return NextResponse.json({
      success: true,
      participant
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register participant' },
      { status: 500 }
    )
  }
} 