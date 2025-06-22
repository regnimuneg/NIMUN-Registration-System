'use client'

import QRCode from 'react-qr-code'
import { parseQRData } from '@/lib/qrHelper'
import { useRef, useCallback } from 'react'
import { Participant } from '@/types/participant'

interface QRCodeGeneratorProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
  participantId?: string
  className?: string
}

export default function QRCodeGenerator({
  value,
  size = 300,
  bgColor = 'transparent',
  fgColor = '#000000',
  participantId,
  className = ''
}: QRCodeGeneratorProps) {
  
  const qrRef = useRef<HTMLDivElement>(null)
  
  const downloadQR = useCallback(async () => {
    if (!participantId || !qrRef.current) return
    
    try {
      // Get the SVG element
      const svg = qrRef.current.querySelector('svg') as SVGElement
      if (!svg) return
      
      // Create canvas with proper size
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // Set canvas size with padding
      const padding = 20
      canvas.width = size + (padding * 2)
      canvas.height = size + (padding * 2)
      
      // For transparent background, don't fill the canvas
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const URL = window.URL || window.webkitURL || window
      const svgUrl = URL.createObjectURL(svgBlob)
      
      // Create image and draw on canvas
      const img = new Image()
      img.onload = () => {
        // Draw QR code in center with padding
        ctx.drawImage(img, padding, padding, size, size)
        
        // Download as PNG
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a')
            link.download = `qr_${participantId}.png`
            link.href = URL.createObjectURL(blob)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            // Clean up
            URL.revokeObjectURL(svgUrl)
            URL.revokeObjectURL(link.href)
          }
        }, 'image/png')
      }
      
      img.src = svgUrl
      
    } catch (error) {
      console.error('Error downloading QR code:', error)
    }
  }, [participantId, size, bgColor])
  
  return (
    <div className={`inline-block ${className}`}>
      <div 
        ref={qrRef}
        style={{ 
          background: bgColor,
          padding: '16px',
          borderRadius: '8px'
        }}
      >
        <QRCode
          value={value}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level="H"
        />
      </div>
      
      {participantId && (
        <div className="mt-2 text-center">
          <button
            onClick={downloadQR}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Download PNG
          </button>
        </div>
      )}
    </div>
  )
}

interface QRCodeDisplayProps {
  qrData: string
  participantId: string
  size?: number
}

export function QRCodeDisplay({ qrData, participantId, size = 250 }: QRCodeDisplayProps) {
  const parsedData = parseQRData(qrData)
  
  return (
    <div className="text-center">
      <QRCodeGenerator
        value={qrData}
        size={size}
        participantId={participantId}
        className="mx-auto"
      />
      
      <div className="mt-2 text-sm text-gray-600">
        <p className="font-mono font-bold">{participantId}</p>
        {parsedData && (
          <p className="text-xs">
            Generated: {new Date(parsedData.timestamp).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}

// Helper function to generate QR code as canvas for bulk download
export const generateQRCanvas = async (
  value: string, 
  size: number = 300, 
  bgColor: string = 'transparent',
  fgColor: string = '#000000'
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary container
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      document.body.appendChild(container)
      
      // Create QR code SVG
      const qrContainer = document.createElement('div')
      container.appendChild(qrContainer)
      
      // We need to create the QR code SVG manually since we can't use React here
      // Using a simple QR code generation approach
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      // Set canvas size with padding
      const padding = 20
      canvas.width = size + (padding * 2)
      canvas.height = size + (padding * 2)
      
      // For white background version, fill with white
      if (bgColor === 'white') {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      
      // Create SVG string for QR code (we'll use a library approach)
      import('qrcode').then((QRCodeLib) => {
        QRCodeLib.default.toCanvas(canvas, value, {
          width: size + (padding * 2),
          margin: 1,
          color: {
            dark: fgColor,
            light: bgColor === 'white' ? '#FFFFFF' : '#00000000' // transparent or white
          },
          errorCorrectionLevel: 'H'
        }, (error: Error | null | undefined) => {
          document.body.removeChild(container)
          if (error) {
            reject(error)
          } else {
            resolve(canvas)
          }
        })
      }).catch(reject)
      
    } catch (error) {
      reject(error)
    }
  })
}

// Bulk QR download function
export const downloadAllQRCodes = async (
  participants: Participant[], 
  onProgress?: (current: number, total: number) => void
) => {
  if (participants.length === 0) return
  
  try {
    // Dynamic import of JSZip to avoid SSR issues
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    
    // Create folders for different background versions
    const transparentFolder = zip.folder('QR_Codes_Transparent')
    const whiteFolder = zip.folder('QR_Codes_White_Background')
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i]
      onProgress?.(i + 1, participants.length)
      
      // Generate QR data
      const qrData = JSON.stringify({
        id: participant.id,
        name: participant.name,
        timestamp: Date.now()
      })
      
      // Clean filename (remove special characters)
      const cleanName = participant.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const filename = `${participant.id}_${cleanName}`
      
      try {
        // Generate transparent version
        const transparentCanvas = await generateQRCanvas(qrData, 300, 'transparent')
        const transparentBlob = await new Promise<Blob>((resolve) => {
          transparentCanvas.toBlob((blob) => resolve(blob!), 'image/png')
        })
        transparentFolder?.file(`${filename}_transparent.png`, transparentBlob)
        
        // Generate white background version
        const whiteCanvas = await generateQRCanvas(qrData, 300, 'white')
        const whiteBlob = await new Promise<Blob>((resolve) => {
          whiteCanvas.toBlob((blob) => resolve(blob!), 'image/png')
        })
        whiteFolder?.file(`${filename}_white.png`, whiteBlob)
        
      } catch (error) {
        console.error(`Error generating QR for ${participant.id}:`, error)
      }
    }
    
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipBlob)
    link.download = `JNIMUN_QR_Codes_${new Date().toISOString().split('T')[0]}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    
  } catch (error) {
    console.error('Error creating QR codes ZIP:', error)
    throw error
  }
} 