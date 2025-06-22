'use client'

import QRCode from 'react-qr-code'
import { parseQRData } from '@/lib/qrHelper'
import { useRef, useCallback } from 'react'

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