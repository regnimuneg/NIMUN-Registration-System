import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      data, 
      size = 300, 
      format = 'png', 
      backgroundColor = '#FFFFFF',
      transparent = false,
      errorCorrectionLevel = 'H'
    } = body

    if (!data) {
      return NextResponse.json({ error: 'QR data is required' }, { status: 400 })
    }

    // For transparent QR codes, we'll use SVG format and convert it
    if (transparent) {
      console.log('Generating transparent QR code using SVG approach')
      
      // Generate SVG QR code (no bgcolor parameter for transparency)
      const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=svg&ecc=${errorCorrectionLevel}`
      
      console.log('SVG QR URL:', svgUrl)
      
      const response = await fetch(svgUrl)
      
      if (!response.ok) {
        console.error('QR Server SVG API Error:', response.status)
        return NextResponse.json({ 
          error: `QR Server SVG API Error: ${response.status}` 
        }, { status: 500 })
      }

      let svgContent = await response.text()
      
      // Remove any background rect from SVG to ensure transparency
      svgContent = svgContent.replace(/<rect[^>]*fill="#ffffff"[^>]*>/gi, '')
      svgContent = svgContent.replace(/<rect[^>]*fill="white"[^>]*>/gi, '')
      
      // Ensure SVG has no background by removing any fill="white" attributes
      svgContent = svgContent.replace(/fill="white"/gi, 'fill="transparent"')
      
      // If we want PNG output, we need to convert SVG to PNG with transparency
      if (format === 'png') {
        // For now, return the SVG and let the client handle PNG conversion
        // This is because server-side SVG to PNG conversion with transparency 
        // requires additional dependencies like puppeteer or sharp
        const filename = `qr-code-transparent.svg`
        
        return new NextResponse(svgContent, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      } else {
        // Return transparent SVG
        const filename = `qr-code-transparent.svg`
        
        return new NextResponse(svgContent, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      }
    } else {
      // Regular white background QR code
      console.log('Generating white background QR code')
      
      let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=${format}&ecc=${errorCorrectionLevel}`
      
      if (backgroundColor) {
        const cleanColor = backgroundColor.replace('#', '')
        qrUrl += `&bgcolor=${cleanColor}`
      }
      
      console.log('QR Server API URL:', qrUrl)
      
      const response = await fetch(qrUrl)
      
      if (!response.ok) {
        console.error('QR Server API Error:', response.status)
        return NextResponse.json({ 
          error: `QR Server API Error: ${response.status}` 
        }, { status: 500 })
      }

      const qrBlob = await response.blob()
      const arrayBuffer = await qrBlob.arrayBuffer()
      
      const filename = `qr-code-white.${format}`
      
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': response.headers.get('content-type') || `image/${format}`,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }
  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 