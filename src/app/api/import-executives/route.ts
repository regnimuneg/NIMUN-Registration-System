import { NextResponse } from 'next/server'
import { bulkAddParticipants, createParticipantsSheet } from '@/lib/googleSheets'
import { generateQRCodeUrl } from '@/lib/qrHelper'
import { LOCKED_PARTICIPANTS } from '@/lib/lockedParticipants'
import { Participant } from '@/types/participant'

// Executive participants with locked IDs
const EXECUTIVE_PARTICIPANTS = [
  { id: 'EX-01', name: 'Zein Raafat', gender: 'Male' as const },
  { id: 'EX-02', name: 'Abdallah Emam', gender: 'Male' as const },
  { id: 'EX-03', name: 'Adham Abdelaal', gender: 'Male' as const },
  { id: 'EX-04', name: 'Hana Abdelmordy', gender: 'Female' as const },
  { id: 'EX-05', name: 'Mariam Kabbany', gender: 'Female' as const },
  { id: 'EX-06', name: 'Moaz El Shahed', gender: 'Male' as const },
  { id: 'EX-07', name: 'Seif Elnahas', gender: 'Male' as const },
  { id: 'EX-08', name: 'Hassan Elsharazly', gender: 'Male' as const },
  { id: 'EX-09', name: 'Omar Akl', gender: 'Male' as const },
  { id: 'EX-10', name: 'Rawya Nabil', gender: 'Female' as const },
  { id: 'EX-11', name: 'Nizar Amer', gender: 'Male' as const },
  { id: 'EX-12', name: 'Zeina Youssef', gender: 'Female' as const },
  { id: 'EX-13', name: 'Malak Ehab', gender: 'Female' as const },
  { id: 'EX-14', name: 'Ali Sameh', gender: 'Male' as const },
  { id: 'EX-15', name: 'Mostafa Salama', gender: 'Male' as const },
  { id: 'EX-16', name: 'Farah Ghaly', gender: 'Female' as const },
  { id: 'EX-17', name: 'Khadija Shash', gender: 'Female' as const },
  { id: 'EX-18', name: 'Farah Darwish', gender: 'Female' as const },
  { id: 'EX-19', name: 'Omar Nabil', gender: 'Male' as const },
  { id: 'EX-20', name: 'Maya Nader', gender: 'Female' as const },
  { id: 'EX-21', name: 'Ameena GamalEldin', gender: 'Female' as const },
  { id: 'EX-22', name: 'Nour Elhabbak', gender: 'Female' as const },
  { id: 'EX-23', name: 'Sawsan Ali', gender: 'Female' as const },
];

export async function POST() {
  try {
    console.log('Adding Executive participants with locked IDs...')

    // Ensure the Participants and Attendance sheets exist
    await createParticipantsSheet()

    // Create participant objects with locked IDs
    const participants: Participant[] = EXECUTIVE_PARTICIPANTS.map(exec => ({
      id: exec.id,
      name: exec.name,
      phoneNumber: '+20XXXXXXXXX', // Placeholder - update with real phone numbers
      position: 'Executive',
      gender: exec.gender,
      qrUrl: generateQRCodeUrl(exec.id),
    }))

    // Validate that all participants match locked configuration
    const validationErrors: string[] = []
    participants.forEach(participant => {
      const lockedName = LOCKED_PARTICIPANTS[participant.id]
      if (!lockedName) {
        validationErrors.push(`ID ${participant.id} is not in locked participants list`)
      } else if (lockedName !== participant.name) {
        validationErrors.push(`ID ${participant.id} should be '${lockedName}' but got '${participant.name}'`)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 })
    }

    // Save to Google Sheets
    console.log('Saving', participants.length, 'Executive participants to Google Sheets...')
    await bulkAddParticipants(participants)

    console.log('✅ Successfully added Executive participants with locked IDs!')

    return NextResponse.json({
      success: true,
      message: 'Executive participants added successfully with locked IDs',
      count: participants.length,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position
      }))
    })

  } catch (error) {
    console.error('Error adding Executive participants:', error)
    return NextResponse.json({
      error: 'Failed to add Executive participants',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 