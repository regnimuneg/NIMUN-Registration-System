import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      participants,
      backgroundType = 'transparent',
      size = 300,
      format = 'png'
    } = body

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Participants array is required' }, { status: 400 })
    }

    // For now, return the data needed for client-side generation
    // This endpoint can be enhanced later to do server-side generation if needed
    const qrData = participants.map((participant: any) => ({
      id: participant.id,
      name: participant.name,
      qrData: JSON.stringify({
        id: participant.id,
        type: 'JNIMUN',
        t: Math.floor(Date.now() / 1000)
      })
    }))

    return NextResponse.json({
      success: true,
      participants: qrData,
      settings: {
        backgroundType,
        size,
        format
      }
    })

  } catch (error) {
    console.error('Bulk QR generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 