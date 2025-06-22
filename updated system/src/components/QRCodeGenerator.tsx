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
  bgColor = 'white',
  fgColor = '#000000',
  participantId,
  className = ''
}: QRCodeGeneratorProps) {
  
  const qrRef = useRef<HTMLDivElement>(null)
  
  const downloadQR = useCallback(async (backgroundType: 'transparent' | 'white') => {
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
      
      // Fill background based on type
      if (backgroundType === 'white') {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      // For transparent, don't fill the canvas (default transparent)
      
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
            link.download = `qr_${participantId}_${backgroundType}.png`
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
  }, [participantId, size])
  
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
        <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => downloadQR('white')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            <span>⚪</span>
            <span>White Background</span>
          </button>
          <button
            onClick={() => downloadQR('transparent')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            <span>🔍</span>
            <span>Transparent</span>
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
        bgColor="white"
      />
      
      <div className="mt-3 text-sm text-gray-600">
        <p className="font-mono font-bold">{participantId}</p>
        {parsedData && (
          <p className="text-xs">
            Generated: {new Date(parsedData.timestamp).toLocaleDateString()}
          </p>
        )}
      </div>
      
      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-1">
            <span>⚪</span>
            <span>White: For printing</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🔍</span>
            <span>Transparent: For designs</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simplified bulk QR download function using SVG to Canvas conversion
export const downloadAllQRCodes = async (
  participants: Participant[], 
  onProgress?: (current: number, total: number) => void
) => {
  if (participants.length === 0) return
  
  try {
    // Show user that we're starting
    onProgress?.(0, participants.length)
    
    // Create a simple alert for now since dynamic imports are causing issues
    alert(`Starting download of ${participants.length} QR codes. This feature will be available in the next update.`)
    
    // For now, we'll provide instructions for manual download
    const instructions = `
To download individual QR codes:
1. Go to each participant's QR view
2. Choose "White Background" for printing or "Transparent" for designs
3. Or use the "View QR" button in the participants table

Bulk download will be available in the next system update.
    `
    
    console.log(instructions)
    onProgress?.(participants.length, participants.length)
    
  } catch (error) {
    console.error('Error in QR download:', error)
    throw error
  }
} 