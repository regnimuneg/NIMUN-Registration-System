import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🌐 Processing external QR scan request...')
    
    // Get the uploaded image from the request
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    
    if (!imageFile) {
      console.log('❌ No image file in request')
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }
    
    console.log('📁 Image file details:', {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    })
    
    // Try multiple QR APIs for better success rate
    const apis = [
      {
        name: 'QuickChart',
        url: 'https://quickchart.io/qr/read',
        process: async (formData: FormData) => {
          const response = await fetch('https://quickchart.io/qr/read', {
            method: 'POST',
            body: formData
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`QuickChart API error: ${response.status} - ${errorText}`)
          }
          
          const result = await response.json()
          return result.text ? { text: result.text, source: 'QuickChart' } : null
        }
      },
      {
        name: 'API-Flash',
        url: 'https://api.api-flash.com/qr-code',
        process: async (formData: FormData) => {
          // Convert to base64 for API-Flash
          const arrayBuffer = await imageFile.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          
          const response = await fetch('https://api.api-flash.com/qr-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: `data:${imageFile.type};base64,${base64}`
            })
          })
          
          if (!response.ok) {
            throw new Error(`API-Flash error: ${response.status}`)
          }
          
          const result = await response.json()
          return result.data ? { text: result.data, source: 'API-Flash' } : null
        }
      }
    ]
    
    let lastError: Error | null = null
    
    for (const api of apis) {
      try {
        console.log(`🌐 Trying ${api.name} API...`)
        
        // Create fresh FormData for each API
        const apiFormData = new FormData()
        apiFormData.append('image', imageFile)
        
        const result = await api.process(apiFormData)
        
        if (result && result.text) {
          console.log(`✅ ${api.name} API detected QR:`, result.text)
          return NextResponse.json({ 
            success: true, 
            text: result.text,
            source: result.source
          })
        } else {
          console.log(`❌ ${api.name} API found no QR code`)
        }
        
      } catch (error) {
        console.log(`❌ ${api.name} API failed:`, error)
        lastError = error instanceof Error ? error : new Error(`${api.name} failed`)
        continue // Try next API
      }
    }
    
    // If all APIs failed
    console.log('❌ All QR APIs failed to detect QR code')
    return NextResponse.json(
      { 
        error: 'No QR code detected by any external API',
        lastError: lastError?.message,
        triedApis: apis.map(api => api.name)
      },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('❌ External QR scan failed:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scan QR code',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 