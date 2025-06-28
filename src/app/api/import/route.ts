import { NextRequest, NextResponse } from 'next/server'
import { parseCSVData, processBulkImport } from '@/lib/csvImport'
import { getAllParticipants, bulkAddParticipants, createParticipantsSheet } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Read file content
    const text = await file.text()
    console.log('CSV file read, length:', text.length)
    
    // Parse CSV data
    const csvData = parseCSVData(text)
    console.log('CSV data parsed, rows:', csvData.length)
    
    if (csvData.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in CSV file' },
        { status: 400 }
      )
    }

    // Ensure the Participants and Attendance sheets exist
    console.log('Creating participants and attendance sheets...')
    await createParticipantsSheet()
    console.log('Participants and Attendance sheets created/verified')
    
    // Get existing participants to avoid duplicates
    console.log('Getting existing participants...')
    const existingParticipants = await getAllParticipants()
    console.log('Existing participants count:', existingParticipants.length)
    
    // Process the import
    console.log('Processing bulk import...')
    const result = await processBulkImport(csvData, existingParticipants)
    console.log('Import processed:', result.summary)
    
    // If we have participants to save, save them to Google Sheets
    if (result.participants.length > 0) {
      console.log('Saving', result.participants.length, 'participants to Google Sheets...')
      console.log('Sample participant:', result.participants[0])
      
      try {
        await bulkAddParticipants(result.participants)
        console.log('Successfully saved to Google Sheets!')
      } catch (saveError) {
        console.error('Error saving to Google Sheets:', saveError)
        throw saveError
      }
    } else {
      console.log('No participants to save')
    }
    
    return NextResponse.json({
      success: result.success,
      summary: result.summary,
      errors: result.errors,
      participants: result.participants
    })
    
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to process import: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 