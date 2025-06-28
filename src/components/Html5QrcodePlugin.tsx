'use client'

import { useEffect } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

const qrcodeRegionId = 'html5qr-code-full-region'

interface Html5QrcodePluginProps {
  fps?: number
  qrbox?: number | { width: number; height: number }
  disableFlip?: boolean
  verbose?: boolean
  qrCodeSuccessCallback: (decodedText: string, decodedResult?: any) => void
  qrCodeErrorCallback?: (error: any) => void
}

export default function Html5QrcodePlugin({
  fps = 10,
  qrbox = 250,
  disableFlip = false,
  verbose = false,
  qrCodeSuccessCallback,
  qrCodeErrorCallback
}: Html5QrcodePluginProps) {
  useEffect(() => {
    // when component mounts
    const config = {
      fps,
      qrbox,
      disableFlip,
      // Important to handle both mobile and desktop cases
      aspectRatio: window.innerWidth < 640 ? 1.0 : undefined,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
      qrcodeRegionId,
      config,
      verbose
    )

    // Render the scanner and handle callbacks
    html5QrcodeScanner.render(
      qrCodeSuccessCallback,
      qrCodeErrorCallback || ((error) => console.warn(error))
    )

    // cleanup
    return () => {
      html5QrcodeScanner.clear().catch(error => {
        console.error('Failed to clear html5QrcodeScanner.', error)
      })
    }
  }, [fps, qrbox, disableFlip, verbose, qrCodeSuccessCallback, qrCodeErrorCallback])

  return (
    <div 
      id={qrcodeRegionId} 
      className="w-full max-w-md mx-auto"
      style={{ 
        minHeight: typeof qrbox === 'number' ? qrbox + 100 : qrbox.height + 100,
        position: 'relative'
      }} 
    />
  )
} 