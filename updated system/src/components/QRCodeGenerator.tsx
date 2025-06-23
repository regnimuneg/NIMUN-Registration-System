'use client'

import QRCode from 'react-qr-code'
import { parseQRData, generateQRCodeWithQRServer, generateTransparentQR, generateWhiteBackgroundQR, downloadQRCodeFromBlob } from '@/lib/qrHelper'
import { useRef, useCallback, useState } from 'react'
import React from 'react'
import { Participant } from '@/types/participant'
import * as QRCodeLib from 'qrcode'

interface QRCodeGeneratorProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
  participantId?: string
  className?: string
  useExternalAPI?: boolean
}

export default function QRCodeGenerator({
  value,
  size = 300,
  bgColor = 'white',
  fgColor = '#000000',
  participantId,
  className = '',
  useExternalAPI = false
}: QRCodeGeneratorProps) {
  
  const qrRef = useRef<HTMLDivElement>(null)
  const [externalQRUrl, setExternalQRUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Load external QR code when component mounts or when useExternalAPI changes
  React.useEffect(() => {
    if (useExternalAPI && participantId) {
      loadExternalQR()
    }
  }, [useExternalAPI, participantId])

  const loadExternalQR = useCallback(async () => {
    if (!participantId) return
    
    setIsLoading(true)
    try {
      // Use QR Server API for high-quality QR codes with white background
      const qrBlob = await generateWhiteBackgroundQR(participantId, size, 'png')
      if (qrBlob) {
        const qrUrl = URL.createObjectURL(qrBlob)
        setExternalQRUrl(qrUrl)
      }
    } catch (error) {
      console.error('Failed to load external QR code:', error)
    } finally {
      setIsLoading(false)
    }
  }, [participantId, size])
  
  const downloadQR = useCallback(async (backgroundType: 'transparent' | 'white') => {
    if (!participantId) return
    
    // Declare URL at the top to avoid scoping issues
    const URLConstructor = window.URL || window.webkitURL || window
    
    setIsLoading(true)
    try {
      if (useExternalAPI) {
        // Always use API when external API is enabled
        console.log(`Downloading ${backgroundType} QR code using API for ${participantId}`)
        
        if (backgroundType === 'transparent') {
          // Use client-side qrcode library for true transparency
          console.log('Generating transparent QR using qrcode library...')
          
          try {
            // Generate QR data
            const qrData = JSON.stringify({
              id: participantId,
              type: 'JNIMUN',
              t: Math.floor(Date.now() / 1000)
            })
            
            // Create canvas for transparent QR
            const canvas = document.createElement('canvas')
            
            // Generate QR code with transparent background
            await QRCodeLib.toCanvas(canvas, qrData, {
              width: size,
              margin: 2,
              errorCorrectionLevel: 'H',
              color: {
                dark: '#000000',    // Black QR code
                light: '#00000000'  // Transparent background (RGBA with alpha=0)
              }
            })
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
              if (blob) {
                const filename = `qr_${participantId}_transparent_client.png`
                const url = URLConstructor.createObjectURL(blob)
                const link = document.createElement('a')
                link.download = filename
                link.href = url
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URLConstructor.revokeObjectURL(url)
              }
            }, 'image/png')
            
            return
          } catch (error) {
            console.error('Error generating transparent QR with qrcode library:', error)
            // Continue to fallback
          }
        } else {
          // White background - use regular API
          const blob = await generateWhiteBackgroundQR(participantId, size, 'png')
          
          if (blob) {
            const filename = `qr_${participantId}_white_api.png`
            const url = URLConstructor.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = filename
            link.href = url
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URLConstructor.revokeObjectURL(url)
            return
          }
        }
        
        console.error('Failed to generate QR code blob')
      }
      
      // Fallback to existing SVG method only if API is not enabled or failed
      console.log(`Falling back to SVG method for ${backgroundType} QR code`)
      const svg = qrRef.current?.querySelector('svg') as SVGElement
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
      const svgUrl = URLConstructor.createObjectURL(svgBlob)
      
      // Create image and draw on canvas
      const img = new Image()
      img.onload = () => {
        // Draw QR code in center with padding
        ctx.drawImage(img, padding, padding, size, size)
        
        // Download as PNG
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a')
            link.download = `qr_${participantId}_${backgroundType}_fallback.png`
            link.href = URLConstructor.createObjectURL(blob)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            // Clean up
            URLConstructor.revokeObjectURL(svgUrl)
            URLConstructor.revokeObjectURL(link.href)
          }
        }, 'image/png')
      }
      
      img.src = svgUrl
      
    } catch (error) {
      console.error('Error downloading QR code:', error)
    } finally {
      setIsLoading(false)
    }
  }, [participantId, size, useExternalAPI])
  
  return (
    <div className={`inline-block ${className}`}>
      {/* Centered QR code container */}
      <div className="flex justify-center items-center">
      <div 
        ref={qrRef}
        style={{ 
          background: bgColor,
          padding: '16px',
          borderRadius: '8px'
        }}
          className="flex justify-center items-center"
        >
          {useExternalAPI && externalQRUrl ? (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded">
                  <div className="text-sm text-gray-600">Loading...</div>
                </div>
              )}
              <img 
                src={externalQRUrl} 
                alt={`QR Code for ${participantId}`}
                width={size}
                height={size}
                className="block"
              />
            </div>
          ) : (
        <QRCode
          value={value}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level="H"
        />
          )}
        </div>
      </div>
      
      {participantId && (
        <div className="mt-3 space-y-2">
          {/* Standard download options */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => downloadQR('white')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              disabled={isLoading}
          >
            <span>⚪</span>
            <span>White Background</span>
          </button>
          <button
            onClick={() => downloadQR('transparent')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
              disabled={isLoading}
          >
            <span>🔍</span>
            <span>Transparent</span>
          </button>
          </div>
          
          {useExternalAPI && (
            <div className="text-center">
              <p className="text-xs text-green-600 font-medium">
                ✅ Using High-Quality QR Server API
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface QRCodeDisplayProps {
  qrData: string
  participantId: string
  size?: number
  useExternalAPI?: boolean
}

export function QRCodeDisplay({ qrData, participantId, size = 300, useExternalAPI = true }: QRCodeDisplayProps) {
  const parsedData = parseQRData(qrData)
  
  return (
    <div className="text-center">
      <QRCodeGenerator
        value={qrData}
        size={size}
        participantId={participantId}
        className="mx-auto"
        bgColor="white"
        useExternalAPI={useExternalAPI}
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
        {useExternalAPI && (
          <div className="mt-2 pt-2 border-t border-blue-300">
            <p className="text-green-700 font-medium">Using QR Server API for high quality</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Simplified bulk QR download function using the free QR Server API
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
    console.error('Error downloading all QR codes:', error)
  }
} 