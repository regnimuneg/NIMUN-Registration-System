'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { parseQRData } from '@/lib/qrHelper'
import QrScanner from 'qr-scanner'

interface QRScannerProps {
  onScan: (participantId: string) => void
  onError?: (error: string) => void
  isActive: boolean
}

export default function QRScanner({ onScan, onError, isActive }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isStartingRef = useRef(false)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  
  const [scanning, setScanning] = useState(false)
  const [cameraSupported, setCameraSupported] = useState(true)
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [userInitiated, setUserInitiated] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'detected'>('idle')
  const [isDroidCam, setIsDroidCam] = useState(false)
  const [virtualCameraDetected, setVirtualCameraDetected] = useState(false)

  // Check camera support and permissions - memoized to prevent re-creation
  const checkCameraSupport = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false)
      return false
    }

    try {
      // Check if we have cameras available
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      if (videoDevices.length === 0) {
        setCameraSupported(false)
        return false
      }

      // Check for virtual cameras (DroidCam, OBS, etc.)
      const virtualCameraNames = ['droidcam', 'obs', 'virtual', 'webcam', 'manycam', 'splitcam']
      const hasVirtualCamera = videoDevices.some(device => 
        virtualCameraNames.some(name => 
          device.label.toLowerCase().includes(name)
        )
      )
      
      if (hasVirtualCamera) {
        setVirtualCameraDetected(true)
        console.log('🎥 Virtual camera detected:', videoDevices.map(d => d.label))
      }

      // Debug: Log all camera devices
      console.log('📹 All video devices:', videoDevices.map(d => ({
        label: d.label,
        deviceId: d.deviceId,
        isVirtual: virtualCameraNames.some(name => d.label.toLowerCase().includes(name))
      })))

      // Check camera permissions
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
          setCameraPermission(permission.state)
        } catch (permError) {
          console.warn('Could not check camera permissions:', permError)
        }
      }
      return true
    } catch (error) {
      console.warn('Could not check camera support:', error)
      return true
    }
  }, [])

  // Stop QR code scanning
  const stopQRScanning = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current = null
    }
    setScanStatus('idle')
  }, [])

  // Start QR code scanning
  const startQRScanning = useCallback(() => {
    if (!videoRef.current) {
      return
    }

    stopQRScanning() // Clear any existing scanning

    setScanStatus('scanning')
    
    // Initialize QR Scanner - optimized for low quality cameras
    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result) => {
        const now = Date.now()
        console.log(`🔍 QR scan result received: "${result.data}" (Virtual camera: ${virtualCameraDetected})`)
        
        // Prevent scanning the same code multiple times quickly
        // Use longer cooldown for virtual cameras to prevent stuck green state
        const cooldownTime = virtualCameraDetected ? 3000 : 1000
        console.log(`⏰ Cooldown check: Last scan ${now - lastScanTimeRef.current}ms ago, required: ${cooldownTime}ms`)
        
        if (now - lastScanTimeRef.current > cooldownTime) {
          lastScanTimeRef.current = now
          console.log(`✅ Processing QR scan (Virtual camera mode: ${virtualCameraDetected})`)
          setScanStatus('detected')
          setLastScannedCode(result.data)
          handleQRDetection(result.data)
          
          // Longer pause for virtual cameras
          const pauseTime = virtualCameraDetected ? 2000 : 500
          console.log(`⏳ Setting ${pauseTime}ms pause before resuming scan`)
          setTimeout(() => {
            console.log('🔄 Resuming scan after pause')
            setScanStatus('scanning')
          }, pauseTime)
        } else {
          console.log('⏭️ Skipping scan due to cooldown')
        }
      },
      {
        highlightScanRegion: true, // Show scan region to help users
        highlightCodeOutline: true, // Highlight detected codes
        maxScansPerSecond: virtualCameraDetected ? 2 : 5, // Slower for virtual cameras
        preferredCamera: 'environment', // Try back camera first on mobile
        calculateScanRegion: (video) => {
          // Use center 60% of video for better focus
          const smallerDimension = Math.min(video.videoWidth, video.videoHeight)
          const scanSize = Math.round(0.6 * smallerDimension)
          return {
            x: Math.round((video.videoWidth - scanSize) / 2),
            y: Math.round((video.videoHeight - scanSize) / 2),
            width: scanSize,
            height: scanSize,
          }
        }
      }
    )

    console.log(`🚀 QR Scanner initialized with settings:`, {
      virtualCameraDetected,
      maxScansPerSecond: virtualCameraDetected ? 2 : 5,
      highlightScanRegion: true,
      highlightCodeOutline: true
    })

    // Start scanning
    qrScannerRef.current.start().catch((err) => {
      console.warn('QR Scanner start error:', err)
      setScanStatus('idle')
    })
  }, [])

  // Stable stop camera function
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...')
    
    // Stop QR scanning
    stopQRScanning()
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Camera track stopped:', track.label)
      })
      streamRef.current = null
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setScanning(false)
    setScanCount(0)
    isStartingRef.current = false
    setScanStatus('idle')
  }, [stopQRScanning])

  const handleQRDetection = useCallback((result: string) => {
    setScanCount(prev => prev + 1)
    console.log('🔍 QR Code detected:', result)
    console.log('🔍 QR Code length:', result.length)
    console.log('🔍 QR Code first 100 chars:', result.substring(0, 100))
    
    try {
      // Try to parse as our QR data format first
      console.log('🔍 Attempting to parse as JSON QR data...')
      const parsed = parseQRData(result)
      console.log('🔍 Parsed result:', parsed)
      
      if (parsed && parsed.id) {
        console.log('✅ Successfully parsed participant ID:', parsed.id)
        onScan(parsed.id)
        setError(null)
        return
      }
      
      // If not our format, check if it's a direct participant ID
      console.log('🔍 Checking if direct participant ID format...')
      if (result.match(/^[A-Z]{2}-\d{2}$/)) {
        console.log('✅ Direct participant ID detected:', result)
        onScan(result)
        setError(null)
        return
      }
      
      // Try to extract ID from URL or other formats
      console.log('🔍 Attempting to extract ID from URL/text...')
      const idMatch = result.match(/(?:id[=:]|participant[=:]|user[=:])([A-Z]{2}-\d{2})/i)
      if (idMatch) {
        console.log('✅ Extracted participant ID from URL:', idMatch[1])
        onScan(idMatch[1].toUpperCase())
        setError(null)
        return
      }
      
      // If we can't parse it, show error but be more helpful
      console.log('❌ Could not parse QR code format')
      const errorMsg = `Unrecognized QR code format. Expected participant ID (EX-01) or JSON data. Got: ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`
      setError(errorMsg)
      onError?.(errorMsg)
      
    } catch (error) {
      console.error('❌ Error processing QR code:', error)
      const errorMsg = `Error processing QR code: ${error instanceof Error ? error.message : 'Unknown error'}`
      setError(errorMsg)
      onError?.(errorMsg)
    }
  }, [onScan, onError])

  // Stable start camera function
  const startCamera = useCallback(async () => {
    if (!userInitiated) {
      console.log('Camera start blocked - user not initiated')
      return
    }

    if (isStartingRef.current || scanning) {
      console.log('Camera already starting or active')
      return
    }

    isStartingRef.current = true
    setError(null)

    try {
      // First check if camera is supported
      const isSupported = await checkCameraSupport()
      if (!isSupported) {
        const errorMsg = 'Camera is not supported on this device. Please use the manual input or file upload options.'
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      console.log('Starting camera...')

      if (!videoRef.current) {
        throw new Error('Video element not found')
      }

      // Try different camera configurations - optimized for QR scanning
      const configs = [
        // High resolution for better QR detection
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: virtualCameraDetected ? 1280 : 1920, min: 640 },
            height: { ideal: virtualCameraDetected ? 720 : 1080, min: 480 },
            focusMode: virtualCameraDetected ? undefined : 'continuous',
            exposureMode: virtualCameraDetected ? undefined : 'continuous'
          }
        },
        // Front camera high res
        {
          video: {
            facingMode: 'user',
            width: { ideal: virtualCameraDetected ? 1280 : 1920, min: 640 },
            height: { ideal: virtualCameraDetected ? 720 : 1080, min: 480 },
            focusMode: virtualCameraDetected ? undefined : 'continuous',
            exposureMode: virtualCameraDetected ? undefined : 'continuous'
          }
        },
        // Any camera high res
        {
          video: {
            width: { ideal: virtualCameraDetected ? 1280 : 1920, min: 640 },
            height: { ideal: virtualCameraDetected ? 720 : 1080, min: 480 },
            focusMode: virtualCameraDetected ? undefined : 'continuous',
            exposureMode: virtualCameraDetected ? undefined : 'continuous'
          }
        },
        // Medium resolution fallback
        {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        // Last resort - any video device
        {
          video: true
        }
      ]

      let mediaStream: MediaStream | null = null
      
      for (const config of configs) {
        try {
          console.log('Trying camera config:', config)
          mediaStream = await navigator.mediaDevices.getUserMedia(config)
          if (mediaStream) {
            console.log('Camera access granted with config:', config)
            break
          }
        } catch (configError) {
          console.log('Config failed:', config, configError)
          continue
        }
      }

      if (!mediaStream) {
        throw new Error('Unable to access camera with any configuration')
      }

      // Set video stream
      videoRef.current.srcObject = mediaStream
      await videoRef.current.play()
      streamRef.current = mediaStream
      setCameraPermission('granted')
      setScanning(true)
      
      // Start QR code scanning after camera is ready
      setTimeout(() => {
        startQRScanning()
      }, 1000) // Give camera time to initialize
      
      console.log('Camera started successfully')

    } catch (error: any) {
      console.error('Camera access error:', error)
      
      let errorMessage = 'Failed to access camera. '
      
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        setCameraPermission('denied')
        errorMessage += 'Camera permission was denied. Please:\n• Click the camera icon in your browser\'s address bar\n• Allow camera access\n• Refresh the page and try again'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and try again.'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application. Please close other camera apps and try again.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Camera doesn\'t support the requested format.'
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Camera access blocked due to security restrictions. Please use HTTPS.'
      } else {
        errorMessage += `Error: ${error.message}`
      }
      
      setError(errorMessage)
      onError?.(errorMessage)
      setScanning(false)
    } finally {
      isStartingRef.current = false
    }
  }, [userInitiated, onError, checkCameraSupport, scanning, startQRScanning])

  // Handle user clicking start camera button
  const handleStartCamera = useCallback(() => {
    console.log('User initiated camera start')
    setUserInitiated(true)
    setError(null)
  }, [])

  // Handle user clicking stop camera button
  const handleStopCamera = useCallback(() => {
    console.log('User initiated camera stop')
    setUserInitiated(false)
    stopCamera()
  }, [stopCamera])

  // Handle file upload for QR scanning
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`File upload started: ${file.name} ${file.type}`)
    
    try {
      console.log('🔍 Attempting to scan QR from uploaded image...')
      const result = await QrScanner.scanImage(file)
      
      if (result) {
        console.log('✅ QR Code detected from file:', result)
        await handleQRDetection(result)
      } else {
        console.log('❌ No QR code found in uploaded image')
        setError('No QR code found in the uploaded image. Please try a different image or use the camera scanner.')
      }
    } catch (error) {
      console.error('❌ Error scanning QR from uploaded image:', error)
      setError('Failed to scan QR code from image. Please try again or use the camera scanner.')
    }
    
    // Reset the input
    event.target.value = ''
  }, [handleQRDetection])

  // Handle manual input
  const handleManualInput = useCallback(() => {
    const participantId = prompt('Enter Participant ID (e.g., EX-01):')
    if (participantId && participantId.trim()) {
      onScan(participantId.trim().toUpperCase())
    }
  }, [onScan])

  // Force refresh scanner (for virtual cameras)
  const forceRefreshScanner = useCallback(() => {
    console.log('🔄 Force refreshing scanner...')
    
    // Stop everything
    stopCamera()
    
    // Reset all states
    setScanStatus('idle')
    setLastScannedCode(null)
    setError(null)
    lastScanTimeRef.current = 0
    
    // Wait a moment then restart
    setTimeout(() => {
      if (isActive) {
        setUserInitiated(true)
      }
    }, 1000)
  }, [stopCamera, isActive])

  // Camera initialization effect - run once only
  useEffect(() => {
    checkCameraSupport()
  }, [checkCameraSupport])

  // Start camera when user initiates - stable effect
  useEffect(() => {
    if (userInitiated && !scanning && cameraSupported && !isStartingRef.current) {
      const timeoutId = setTimeout(() => {
        startCamera()
      }, 100) // Small delay to prevent rapid firing
      
      return () => clearTimeout(timeoutId)
    }
  }, [userInitiated, scanning, cameraSupported, startCamera])

  // Cleanup on unmount - stable effect
  useEffect(() => {
    return () => {
      console.log('QRScanner unmounting - cleaning up camera')
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current = null
      }
      isStartingRef.current = false
    }
  }, [])

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => {
        setError(null)
      }, 10000) // Clear error after 10 seconds
      
      return () => clearTimeout(timeoutId)
    }
  }, [error])

  return (
    <div className="qr-scanner">
      {/* Camera Status */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-blue-900">Camera Status:</span>
            <span className={`ml-2 text-sm ${
              scanning ? 'text-green-600' :
              cameraPermission === 'granted' ? 'text-blue-600' : 
              cameraPermission === 'denied' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {scanning ? '🟢 Active' :
               isStartingRef.current ? '⏳ Starting...' :
               cameraPermission === 'granted' ? '✅ Ready' :
               cameraPermission === 'denied' ? '❌ Denied' :
               cameraPermission === 'prompt' ? '⏳ Permission needed' : '❓ Unknown'}
            </span>
          </div>
          <div className="text-right">
            {!cameraSupported && (
              <span className="text-xs text-red-600 block">Camera not supported</span>
            )}
            <div className="flex flex-col items-end">
              {scanCount > 0 && (
                <span className="text-xs text-green-600">Scans: {scanCount}</span>
              )}
              {scanning && (
                <span className={`text-xs ${
                  scanStatus === 'scanning' ? 'text-blue-600' :
                  scanStatus === 'detected' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {scanStatus === 'scanning' ? '🔍 Scanning...' :
                   scanStatus === 'detected' ? '✅ Detected!' : '⏸️ Idle'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Last Scanned Code Display */}
      {lastScannedCode && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            <strong>Last scanned:</strong> {lastScannedCode.substring(0, 50)}
            {lastScannedCode.length > 50 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Camera View */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          playsInline
          muted
          autoPlay
          style={{ display: scanning ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Placeholder when camera is not active */}
        {!scanning && (
          <div className="w-full h-64 flex items-center justify-center bg-gray-800 text-white">
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm">
                {!cameraSupported ? 'Camera not supported' :
                 cameraPermission === 'denied' ? 'Camera access denied' :
                 !userInitiated ? 'Click "Start Camera" to begin' :
                 isStartingRef.current ? 'Starting camera...' : 'Camera ready'}
              </p>
              {!userInitiated && cameraSupported && (
                <p className="text-xs text-gray-400 mt-2">Camera view with automatic QR detection</p>
              )}
            </div>
          </div>
        )}
        
        {/* Visual guide overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-48 h-48 border-2 rounded-lg relative transition-colors ${
              scanStatus === 'detected' ? 'border-green-400 bg-green-400 bg-opacity-20' :
              scanStatus === 'scanning' ? 'border-blue-500' : 'border-green-500'
            }`}>
              <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 ${
                scanStatus === 'detected' ? 'border-green-400' : 'border-green-500'
              }`}></div>
              <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 ${
                scanStatus === 'detected' ? 'border-green-400' : 'border-green-500'
              }`}></div>
              <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 ${
                scanStatus === 'detected' ? 'border-green-400' : 'border-green-500'
              }`}></div>
              <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 ${
                scanStatus === 'detected' ? 'border-green-400' : 'border-green-500'
              }`}></div>
            </div>
          </div>
        )}
        
        {/* Status text overlay */}
        {scanning && (
          <div className="absolute bottom-2 left-2 right-2 text-center">
            <p className="text-white text-sm bg-black bg-opacity-50 rounded px-2 py-1">
              {scanStatus === 'detected' ? '✅ QR Code Detected!' :
               scanStatus === 'scanning' ? '🔍 Looking for QR codes...' :
               'Position QR code in frame for automatic detection'}
            </p>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="mt-4 space-y-3">
        {/* Virtual camera detection */}
        {virtualCameraDetected && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-medium text-purple-800 mb-2">📱 Virtual Camera Detected (DroidCam/OBS)</h4>
            <div className="text-xs text-purple-700 space-y-1">
              <p>• Using optimized settings for virtual cameras</p>
              <p>• Slower scan rate to prevent freezing</p>
              <p>• Longer cooldown between scans</p>
              {scanStatus === 'detected' && (
                <button
                  onClick={() => {
                    setScanStatus('scanning')
                    setLastScannedCode(null)
                    lastScanTimeRef.current = 0
                  }}
                  className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                >
                  🔄 Reset Scanner (if stuck)
                </button>
              )}
              <button
                onClick={forceRefreshScanner}
                className="mt-2 ml-2 px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
              >
                🔄 Force Refresh
              </button>
            </div>
          </div>
        )}

        {/* Manual virtual camera toggle for testing */}
        {!virtualCameraDetected && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800 mb-2">🔧 Debug Options</h4>
            <button
              onClick={() => {
                setVirtualCameraDetected(true)
                console.log('🎥 Manually enabled virtual camera mode for testing')
                if (scanning) {
                  forceRefreshScanner()
                }
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              🎥 Enable Virtual Camera Mode (for DroidCam)
            </button>
          </div>
        )}

        {/* Primary controls */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={scanning ? handleStopCamera : handleStartCamera}
            disabled={!cameraSupported || isStartingRef.current}
            className={`px-4 py-2 rounded-lg font-medium ${
              !cameraSupported ? 'bg-gray-400 text-gray-600 cursor-not-allowed' :
              isStartingRef.current ? 'bg-yellow-600 text-white cursor-not-allowed' :
              scanning 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {!cameraSupported ? 'Camera Not Supported' :
             isStartingRef.current ? 'Starting...' :
             scanning ? 'Stop Camera' : 'Start Camera'}
          </button>
        </div>

        {/* Input methods */}
        <div className="border-t pt-3">
          <p className="text-sm text-gray-600 mb-2 text-center">Alternative input methods:</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={handleManualInput}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              📝 Manual Input
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
            >
              📁 Upload QR Image
            </button>
          </div>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* Camera troubleshooting */}
        {cameraPermission === 'denied' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Camera Access Help:</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Look for a camera icon in your browser's address bar</li>
              <li>• Click it and select "Always allow" for camera access</li>
              <li>• Refresh the page and try again</li>
              <li>• On mobile: Check Settings → Safari/Chrome → Camera permissions</li>
              <li>• Make sure you're using HTTPS (not HTTP)</li>
            </ul>
          </div>
        )}
        
        {!cameraSupported && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-2">Camera Not Supported:</h4>
            <ul className="text-xs text-red-700 space-y-1">
              <li>• Try using Chrome, Firefox, Safari, or Edge</li>
              <li>• Make sure you're on a secure connection (HTTPS)</li>
              <li>• Use the "Manual Input" option for participant IDs</li>
            </ul>
          </div>
        )}
        
        {/* Notice about automatic scanning */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-2">🎯 Automatic QR Detection:</h4>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• <strong>Live scanning:</strong> Automatically detects QR codes in camera view</li>
            <li>• <strong>Real-time feedback:</strong> Green frame indicates successful detection</li>
            <li>• <strong>Smart filtering:</strong> Prevents duplicate scans with 2-second cooldown</li>
            <li>• <strong>Multiple formats:</strong> Supports participant IDs, URLs, and encoded data</li>
          </ul>
        </div>
        
        {/* Usage instructions */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">📱 How to scan:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Step 1:</strong> Click "Start Camera" to begin</li>
            <li>• <strong>Step 2:</strong> Point camera at QR code</li>
            <li>• <strong>Step 3:</strong> Keep QR code in the green frame</li>
            <li>• <strong>Step 4:</strong> Wait for automatic detection (usually 1-2 seconds)</li>
            <li>• <strong>Backup:</strong> Use manual input if automatic detection fails</li>
          </ul>
        </div>

        {/* Low-quality camera tips */}
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="text-sm font-medium text-orange-800 mb-2">💡 Tips for Low-Quality Cameras:</h4>
          <ul className="text-xs text-orange-700 space-y-1">
            <li>• <strong>Distance:</strong> Hold QR code 6-12 inches from camera</li>
            <li>• <strong>Lighting:</strong> Use bright, even lighting (avoid shadows)</li>
            <li>• <strong>Stability:</strong> Hold both device and QR code steady</li>
            <li>• <strong>Size:</strong> QR code should fill about 60% of the green frame</li>
            <li>• <strong>Focus:</strong> Wait 2-3 seconds for camera to auto-focus</li>
            <li>• <strong>Angle:</strong> Keep QR code flat and perpendicular to camera</li>
            <li>• <strong>Clean lens:</strong> Wipe camera lens with soft cloth</li>
            <li>• <strong>Alternative:</strong> Use "Upload QR Image" for better quality photos</li>
            {virtualCameraDetected && (
              <>
                <li>• <strong>DroidCam/Virtual:</strong> Ensure good phone camera focus</li>
                <li>• <strong>Connection:</strong> Check WiFi/USB connection stability</li>
                <li>• <strong>Phone position:</strong> Keep phone steady and well-lit</li>
                <li>• <strong>Reset:</strong> Use reset button if scanner gets stuck green</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
} 