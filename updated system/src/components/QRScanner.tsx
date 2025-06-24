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
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [showCameraSelection, setShowCameraSelection] = useState(false)
  const [useExternalAPI, setUseExternalAPI] = useState(false)
  const [apiScanLoading, setApiScanLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

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

      // Store available cameras for selection
      setAvailableCameras(videoDevices)

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

      // Debug: Log all camera devices with types
      console.log('📹 All video devices:', videoDevices.map(d => {
        const isVirtual = virtualCameraNames.some(name => d.label.toLowerCase().includes(name))
        const isDroidCam = d.label.toLowerCase().includes('droidcam')
        return {
        label: d.label,
        deviceId: d.deviceId,
          isVirtual,
          isDroidCam,
          type: isDroidCam ? 'DroidCam' : isVirtual ? 'Virtual' : 'Native'
        }
      }))

      // Show camera selection if multiple cameras available
      if (videoDevices.length > 1) {
        setShowCameraSelection(true)
      }

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
    
    // Initialize QR Scanner - optimized for mobile and low quality cameras
    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result: any) => {
        const now = Date.now()
        const qrData = result?.data || result
        console.log(`🔍 QR scan result received: "${qrData}" (Mobile: ${isMobileDevice}, Virtual camera: ${virtualCameraDetected})`)
        
        // Prevent scanning the same code multiple times quickly
        // Adjust cooldown based on device type
        const cooldownTime = virtualCameraDetected ? 3000 : (isMobileDevice ? 800 : 1000)
        console.log(`⏰ Cooldown check: Last scan ${now - lastScanTimeRef.current}ms ago, required: ${cooldownTime}ms`)
        
        if (now - lastScanTimeRef.current > cooldownTime) {
          lastScanTimeRef.current = now
          console.log(`✅ Processing QR scan (Mobile: ${isMobileDevice}, Virtual camera mode: ${virtualCameraDetected})`)
          setScanStatus('detected')
          setLastScannedCode(qrData)
          handleQRDetection(qrData)
          
          // Adjust pause time based on device type
          const pauseTime = virtualCameraDetected ? 2000 : (isMobileDevice ? 300 : 500)
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
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: virtualCameraDetected ? 2 : (isMobileDevice ? 4 : 5),
        preferredCamera: 'environment',
        calculateScanRegion: (video: any) => {
          // Mobile-optimized scan region - larger area for easier scanning
          const smallerDimension = Math.min(video.videoWidth, video.videoHeight)
          const scanSizeRatio = isMobileDevice ? 0.8 : 0.6 // Larger scan area on mobile
          const scanSize = Math.round(scanSizeRatio * smallerDimension)
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

      // Build camera configuration optimized for mobile devices
      const baseVideoConfig = {
        width: { 
          ideal: isMobileDevice ? 1280 : (virtualCameraDetected ? 1280 : 1920), 
          min: 640, 
          max: isMobileDevice ? 1920 : 3840 
        },
        height: { 
          ideal: isMobileDevice ? 720 : (virtualCameraDetected ? 720 : 1080), 
          min: 480, 
          max: isMobileDevice ? 1080 : 2160 
        },
        focusMode: virtualCameraDetected ? undefined : 'continuous',
        exposureMode: virtualCameraDetected ? undefined : 'continuous',
        // Mobile-specific optimizations
        frameRate: { ideal: isMobileDevice ? 30 : 24, max: 30 },
        aspectRatio: isMobileDevice ? { ideal: 16/9 } : undefined
      }

      // Try different camera configurations - optimized for QR scanning
      const configs = []

      // If a specific camera is selected, use it first
      if (selectedCameraId) {
        configs.push({
          video: {
            deviceId: { exact: selectedCameraId },
            ...baseVideoConfig
          }
        })
      }

      // Fallback configurations - prioritize mobile-optimized settings
      if (isMobileDevice) {
        configs.push(
          // Mobile: Environment (back) camera with autofocus
          { 
            video: { 
              facingMode: 'environment',
              ...baseVideoConfig,
              focusMode: 'continuous',
              focusDistance: { ideal: 0.3 } // Optimize for QR scanning distance
            }
          },
          // Mobile: Environment camera with basic constraints
          { 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 30 }
            }
          },
          // Mobile: User (front) camera fallback
          {
            video: {
              facingMode: 'user',
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 30 }
            }
          }
        )
      } else {
        configs.push(
          // Desktop: Environment (back) camera
          { 
            video: { 
              facingMode: 'environment',
              ...baseVideoConfig
            }
          },
          // Desktop: User (front) camera
          {
            video: {
              facingMode: 'user',
              ...baseVideoConfig
            }
          }
        )
      }
      
      // Common fallbacks for both mobile and desktop
      configs.push(
        // Any camera with optimized resolution
        {
          video: {
            width: { ideal: isMobileDevice ? 1280 : 1920, min: 640 },
            height: { ideal: isMobileDevice ? 720 : 1080, min: 480 },
            frameRate: { ideal: 30, max: 30 }
          }
        },
        // Basic fallback
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
      )

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

  // External QR API scan function
  const scanWithExternalAPI = useCallback(async (imageBlob: Blob) => {
    setApiScanLoading(true)
    try {
      console.log('🌐 Attempting external API scan...')
      
      // Try QuickChart QR reader API
      const formData = new FormData()
      formData.append('image', imageBlob, 'qr-image.png')
      
      const response = await fetch('https://quickchart.io/qr/read', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.text) {
          console.log('✅ External API detected QR:', result.text)
          return result.text
        }
      }
      
      throw new Error('No QR code detected by external API')
      
    } catch (error) {
      console.error('External API scan failed:', error)
      throw error
    } finally {
      setApiScanLoading(false)
    }
  }, [])

  // Capture current video frame and try external API
  const captureAndScanWithAPI = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    try {      
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')
      
      // Set canvas size to video size
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Capture current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/png')
      })
      
      // Try external API
      const result = await scanWithExternalAPI(blob)
      if (result) {
        handleQRDetection(result)
        setSuccess('✅ QR detected using external API!')
      }
      
    } catch (error) {
      console.error('Capture and scan failed:', error)
      setError('External API scan failed. Try manual input or file upload.')
    }
  }, [scanWithExternalAPI, handleQRDetection])

  // Handle file upload for QR scanning
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log(`File upload started: ${file.name} ${file.type}`)
    
    try {
      console.log('🔍 Attempting to scan QR from uploaded image...')
      
      // Try regular qr-scanner first
      try {
        const result = await QrScanner.scanImage(file)
        if (result) {
          console.log('✅ QR Code detected from file:', result)
          await handleQRDetection(result)
          setSuccess('✅ QR code scanned from uploaded image!')
          return
        }
      } catch (qrScanError) {
        console.log('Regular scanner failed, trying external API...')
      }
      
      // If regular scanner fails, try external API
      if (useExternalAPI) {
        try {
          const result = await scanWithExternalAPI(file)
          if (result) {
            console.log('✅ External API detected QR from file:', result)
            await handleQRDetection(result)
            setSuccess('✅ QR code detected using external API!')
            return
          }
        } catch (apiError) {
          console.log('External API also failed:', apiError)
        }
      }
      
      console.log('❌ No QR code found in uploaded image')
      setError('No QR code found in the uploaded image. Please try a different image or use manual input.')
      
    } catch (error) {
      console.error('❌ Error scanning QR from uploaded image:', error)
      setError('Failed to scan QR code from image. Please try again or use manual input.')
    }
    
    // Reset the input
    event.target.value = ''
  }, [handleQRDetection, scanWithExternalAPI, useExternalAPI])

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
    setSuccess(null)
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

  // Clear error and success messages after some time
  useEffect(() => {
    if (error) {
      const timeoutId = setTimeout(() => {
        setError(null)
      }, 10000) // Clear error after 10 seconds
      
      return () => clearTimeout(timeoutId)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timeoutId = setTimeout(() => {
        setSuccess(null)
      }, 5000) // Clear success message after 5 seconds
      
      return () => clearTimeout(timeoutId)
    }
  }, [success])

  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Client-side mobile detection to avoid SSR mismatch
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
      setIsMobileDevice(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))
    }
    checkMobile()
  }, [])

  // Mobile-specific optimizations
  useEffect(() => {
    if (isMobileDevice) {
      // Prevent zoom on double tap
      let lastTouchEnd = 0
      const preventZoom = (e: TouchEvent) => {
        const now = (new Date()).getTime()
        if (now - lastTouchEnd <= 300) {
          e.preventDefault()
        }
        lastTouchEnd = now
      }
      
      document.addEventListener('touchend', preventZoom, { passive: false })
      
      // Keep screen awake during scanning
      let wakeLock: any = null
      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen')
            console.log('Screen wake lock activated')
          }
        } catch (err) {
          console.log('Wake lock not supported or failed:', err)
        }
      }
      
      if (scanning) {
        requestWakeLock()
      }
      
      return () => {
        document.removeEventListener('touchend', preventZoom)
        if (wakeLock) {
          wakeLock.release()
          console.log('Screen wake lock released')
        }
      }
    }
  }, [scanning, isMobileDevice])

  return (
    <div className={`bg-white rounded-lg shadow-lg ${isMobileDevice ? 'p-3 mx-2' : 'p-6'}`}>
      <h2 className={`font-bold mb-4 text-gray-800 ${isMobileDevice ? 'text-xl text-center' : 'text-2xl'}`}>
        📱 QR Code Scanner
      </h2>
      
              {/* Mobile-specific instructions */}
        {isMobileDevice && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">📱 Mobile Scanning Tips</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Hold phone steady and keep QR code well-lit</p>
              <p>• Ensure QR code fills 60-80% of camera frame</p>
              <p>• Use back camera for better focus</p>
              <p>• Screen will stay awake during scanning</p>
              {useExternalAPI && <p>• Use "Scan with API" if auto-scan fails</p>}
            </div>
          </div>
        )}

        {/* Camera Status and Controls */}
        <div className={`mb-4 p-4 bg-gray-50 rounded-lg ${isMobileDevice ? 'text-center' : ''}`}>
          <div className={`mb-2 ${isMobileDevice ? 'space-y-2' : 'flex items-center justify-between'}`}>
            <div className={`flex items-center ${isMobileDevice ? 'justify-center' : ''} space-x-2`}>
              <span className="text-sm font-medium text-gray-700">Camera Status:</span>
              <span className={`text-sm font-medium ${
                scanning ? 'text-green-600' : 'text-gray-500'
              }`}>
                {scanning ? '🟢 Active' : '⚫ Inactive'}
              </span>
              {virtualCameraDetected && (
                <span className={`text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded ${
                  isMobileDevice ? 'block mt-1' : ''
                }`}>
                  📹 Virtual Camera Detected
                </span>
              )}
            </div>
            
            {/* External API Toggle */}
            <div className={`flex items-center space-x-2 ${isMobileDevice ? 'justify-center mt-2' : ''}`}>
              <label className="text-sm text-gray-600 flex items-center">
                <input
                  type="checkbox"
                  checked={useExternalAPI}
                  onChange={(e) => setUseExternalAPI(e.target.checked)}
                  className="mr-2"
                />
                <span className={isMobileDevice ? 'font-medium' : ''}>Use External API</span>
              </label>
            </div>
          </div>
          
          {scanning && (
            <div className={`flex items-center space-x-2 text-sm text-gray-600 ${
              isMobileDevice ? 'justify-center' : ''
            }`}>
              <span>Scanning...</span>
              {scanStatus === 'scanning' && <span className="text-blue-600">🔍 Scanning...</span>}
              {scanStatus === 'detected' && <span className="text-green-600">✅ Detected!</span>}
              {apiScanLoading && <span className="text-purple-600">🌐 API processing...</span>}
            </div>
          )}
        </div>

      {/* Camera Controls */}
      <div className={`mb-4 ${isMobileDevice ? 'space-y-2' : 'flex flex-wrap gap-2'}`}>
        {!scanning ? (
          <button
            onClick={handleStartCamera}
            disabled={!cameraSupported}
            className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center space-x-2 ${
              isMobileDevice ? 'w-full py-3 text-lg' : 'px-4 py-2'
            }`}
          >
            <span>📷</span>
            <span>Start Camera</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleStopCamera}
              className={`bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center space-x-2 ${
                isMobileDevice ? 'w-full py-3 text-lg' : 'px-4 py-2'
              }`}
            >
              <span>⏹️</span>
              <span>Stop Camera</span>
            </button>
            
            {/* External API Scan Button */}
            {useExternalAPI && (
              <button
                onClick={captureAndScanWithAPI}
                disabled={apiScanLoading}
                className={`bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center space-x-2 ${
                  isMobileDevice ? 'w-full py-3 text-lg' : 'px-4 py-2'
                }`}
              >
                <span>🌐</span>
                <span>{apiScanLoading ? 'Scanning...' : 'Scan with API'}</span>
              </button>
            )}
          </>
        )}
        
        <div className={`${isMobileDevice ? 'grid grid-cols-2 gap-2' : 'flex gap-2'}`}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center space-x-2 ${
              isMobileDevice ? 'py-3' : 'px-4 py-2'
            }`}
          >
            <span>📁</span>
            <span>{isMobileDevice ? 'Upload' : 'Upload Image'}</span>
          </button>
          
          <button
            onClick={handleManualInput}
            className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center space-x-2 ${
              isMobileDevice ? 'py-3' : 'px-4 py-2'
            }`}
          >
            <span>⌨️</span>
            <span>{isMobileDevice ? 'Manual' : 'Manual Input'}</span>
          </button>
        </div>
      </div>

      {/* Camera Selection */}
      {showCameraSelection && availableCameras.length > 1 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Camera:
          </label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Auto-select camera</option>
            {availableCameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${camera.deviceId.substring(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video Display */}
      <div className="relative mb-4">
        <video
          ref={videoRef}
          className={`w-full ${isMobileDevice ? 'h-auto aspect-square max-w-full' : 'max-w-md'} mx-auto border-4 rounded-lg ${
            scanStatus === 'detected' ? 'border-green-500 bg-green-50' : 
            scanStatus === 'scanning' ? 'border-blue-500' : 'border-gray-300'
          }`}
          style={{ display: scanning ? 'block' : 'none' }}
          playsInline
          muted
          autoPlay
        />
        
        {/* Mobile scan guidance overlay */}
        {scanning && isMobileDevice && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full flex items-center justify-center">
              <div className="border-2 border-white opacity-50 rounded-lg animate-pulse"
                   style={{ 
                     width: '70%', 
                     height: '70%',
                     boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)'
                   }}>
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
              📱 Position QR code in the frame
            </div>
          </div>
        )}
        
        {/* Hidden canvas for frame capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        
        {!scanning && (
          <div className={`w-full ${isMobileDevice ? 'aspect-square max-w-full' : 'max-w-md h-64'} mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50`}>
            <div className="text-center text-gray-500">
              <div className={`mb-2 ${isMobileDevice ? 'text-6xl' : 'text-4xl'}`}>📷</div>
              <div className={isMobileDevice ? 'text-lg font-medium' : ''}>Camera not active</div>
              <div className={`${isMobileDevice ? 'text-sm mt-2' : 'text-sm'}`}>
                {isMobileDevice ? 'Tap "Start Camera" to begin' : 'Click "Start Camera" to begin scanning'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Virtual Camera Instructions */}
      {virtualCameraDetected && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-medium text-purple-800 mb-2">📹 Virtual Camera Detected (DroidCam/OBS)</h3>
          <div className="text-sm text-purple-700 space-y-1">
            <p>• Using optimized settings for virtual cameras</p>
            <p>• Slower scan rate to prevent freezing</p>
            <p>• Longer cooldown between scans</p>
            <p>• Try the "Scan with API" button if regular scanning fails</p>
            <p>• Consider using "Upload Image" or "Manual Input" as alternatives</p>
          </div>
          {scanning && (
            <button
              onClick={forceRefreshScanner}
              className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
            >
              🔄 Force Refresh
            </button>
          )}
        </div>
      )}

      {/* Scan Information */}
      <div className={`mb-4 ${isMobileDevice ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}`}>
        <div className={`bg-gray-50 rounded-lg ${isMobileDevice ? 'p-4 flex justify-between items-center' : 'p-3'}`}>
          <div className="text-sm text-gray-600">Scans Count</div>
          <div className={`font-bold text-gray-800 ${isMobileDevice ? 'text-2xl' : 'text-xl'}`}>{scanCount}</div>
        </div>
        
        <div className={`bg-gray-50 rounded-lg ${isMobileDevice ? 'p-4' : 'p-3'}`}>
          <div className="text-sm text-gray-600 mb-1">Last Scanned</div>
          <div className={`font-mono text-gray-800 break-all ${isMobileDevice ? 'text-base' : 'text-sm'}`}>
            {lastScannedCode ? (
              lastScannedCode.length > (isMobileDevice ? 30 : 20)
                ? `${lastScannedCode.substring(0, isMobileDevice ? 30 : 20)}...` 
                : lastScannedCode
            ) : 'None'}
          </div>
        </div>
        
        <div className={`bg-gray-50 rounded-lg ${isMobileDevice ? 'p-4 flex justify-between items-center' : 'p-3'}`}>
          <div className="text-sm text-gray-600">Status</div>
          <div className={`font-medium ${isMobileDevice ? 'text-base' : 'text-sm'}`}>
            {scanStatus === 'idle' && '⏸️ Idle'}
            {scanStatus === 'scanning' && '🔍 Scanning...'}
            {scanStatus === 'detected' && '✅ Detected!'}
            {apiScanLoading && (isMobileDevice ? '🌐 API...' : ' + 🌐 API Processing')}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 whitespace-pre-line">{error}</div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-800">{success}</div>
          <button
            onClick={() => setSuccess(null)}
            className="mt-2 text-green-600 hover:text-green-800 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Camera Permission Status */}
      {cameraPermission === 'denied' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-yellow-800">
            <strong>Camera Permission Denied</strong><br />
            Please allow camera access in your browser settings and refresh the page.
          </div>
        </div>
      )}

      {!cameraSupported && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800">
            <strong>Camera Not Supported</strong><br />
            Your device doesn't support camera access. Please use the file upload or manual input options.
          </div>
        </div>
      )}

      {/* Alternative Methods */}
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-700 mb-2">Alternative Methods</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Upload Image:</strong> Take a photo of the QR code and upload it</p>
          <p>• <strong>Manual Input:</strong> Type the participant ID directly (e.g., EX-01)</p>
          {useExternalAPI && <p>• <strong>External API:</strong> Uses cloud-based QR detection for better accuracy</p>}
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
    </div>
  )
} 