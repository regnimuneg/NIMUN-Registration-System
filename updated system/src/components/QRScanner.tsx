'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { parseQRData } from '@/lib/qrHelper'
import QrScanner from 'qr-scanner'
import { Camera, Upload, Edit3, CheckCircle, Smartphone, Folder, Lightbulb, Pause } from 'lucide-react'

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
  
  // Mobile device detection (moved to top to fix hoisting issues)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Client-side mobile detection to avoid SSR mismatch
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
      setIsMobileDevice(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))
    }
    checkMobile()
  }, [])
  
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

  // Start QR scanning with enhanced debugging
  const startQRScanning = useCallback(() => {
    if (!videoRef.current) {
      console.warn('Cannot start QR scanning: Video element not available')
      return
    }

    stopQRScanning() // Clear any existing scanning

    setScanStatus('scanning')
    
    console.log('🔍 Starting QR scanner with enhanced debugging...')
    console.log('📹 Video element state:', {
      videoWidth: videoRef.current.videoWidth,
      videoHeight: videoRef.current.videoHeight,
      readyState: videoRef.current.readyState,
      networkState: videoRef.current.networkState
    })
    
    // Initialize QR Scanner with proper visual highlights
    console.log('🔍 Initializing QR Scanner with visual highlights...')
    
    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result: any) => {
        const now = Date.now()
        const qrData = result?.data || result
        console.log(`🔍 RAW QR scan result received:`, result)
        console.log(`🔍 QR data extracted: "${qrData}" (type: ${typeof qrData})`)
        console.log(`🔍 Device info: Mobile=${isMobileDevice}, Virtual camera=${virtualCameraDetected}`)
        
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
        highlightScanRegion: true, // Enable the yellow square overlay
        highlightCodeOutline: true, // Enable QR code outline highlighting
        maxScansPerSecond: 5, // Reasonable scan rate
        returnDetailedScanResult: true // Get more detailed results
      }
    )

    console.log(`🚀 QR Scanner initialized with settings:`, {
      virtualCameraDetected,
      maxScansPerSecond: virtualCameraDetected ? 2 : (isMobileDevice ? 4 : 5),
      highlightScanRegion: true,
      highlightCodeOutline: true,
      scanRegionRatio: isMobileDevice ? 0.8 : 0.6
    })

    // Start scanning with error handling and fallbacks
    qrScannerRef.current.start().then(() => {
      console.log('✅ QR Scanner started successfully')
      
      // Check if scanner is properly initialized with highlights
      setTimeout(() => {
        if (qrScannerRef.current) {
          console.log('🔍 Checking scanner visual elements...')
          // Check if the scanner overlay elements exist in the DOM
          const scanRegion = document.querySelector('.scan-region-highlight')
          const codeOutline = document.querySelector('.code-outline-highlight')
          
          console.log('📏 Scanner overlay elements:', {
            scanRegion: !!scanRegion,
            codeOutline: !!codeOutline,
            videoElement: !!videoRef.current,
            videoReady: videoRef.current?.readyState === 4
          })
          
          if (!scanRegion) {
            console.warn('⚠️ Scan region highlight not found in DOM')
            console.log('🔄 This might explain why the yellow squares are not visible')
          } else {
            console.log('✅ Scan region highlight found - yellow squares should be visible')
          }
        }
      }, 1000)
      
      // Add a timeout to detect if scanning is working
      setTimeout(() => {
        if (scanStatus === 'scanning' && scanCount === 0) {
          console.log('⚠️ No QR codes detected after 10 seconds, trying fallback scanner...')
          startFallbackScanner()
        }
      }, 10000)
      
    }).catch((err) => {
      console.warn('❌ QR Scanner start error:', err)
      console.log('🔄 Trying fallback scanner...')
      startFallbackScanner()
    })
    
    // Add periodic debugging
    const debugInterval = setInterval(() => {
      if (qrScannerRef.current && scanStatus === 'scanning') {
        console.log('🔍 Scanner status check:', {
          scanStatus,
          scanCount,
          cameraActive: !!streamRef.current,
          videoReady: videoRef.current?.readyState === 4
        })
      } else {
        clearInterval(debugInterval)
      }
    }, 5000) // Log every 5 seconds
    
  }, [virtualCameraDetected, isMobileDevice, scanStatus, scanCount])

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

  // Fallback scanner without custom scan region
  const startFallbackScanner = useCallback(() => {
    if (!videoRef.current) {
      console.warn('Cannot start fallback scanner: Video element not available')
      return
    }

    console.log('🔄 Starting fallback QR scanner with proper highlights...')
    
    // Stop existing scanner
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current = null
    }

    // Initialize fallback QR Scanner with visual highlights
    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result: any) => {
        const now = Date.now()
        const qrData = result?.data || result
        console.log(`🔍 FALLBACK QR detected: "${qrData}"`)
        
        if (now - lastScanTimeRef.current > 1000) { // Simple cooldown
          lastScanTimeRef.current = now
          setScanStatus('detected')
          setLastScannedCode(qrData)
          handleQRDetection(qrData)
          
          setTimeout(() => {
            setScanStatus('scanning')
          }, 500)
        }
      },
      {
        highlightScanRegion: true, // Ensure visual highlights in fallback
        highlightCodeOutline: true,
        maxScansPerSecond: 3
      }
    )

    // Start the fallback scanner
    qrScannerRef.current.start().then(() => {
      console.log('✅ Fallback QR Scanner started successfully')
      
      // Check for visual elements in fallback scanner too
      setTimeout(() => {
        console.log('🔍 Checking fallback scanner visual elements...')
        const scanRegion = document.querySelector('.scan-region-highlight')
        console.log('📏 Fallback scanner overlay:', !!scanRegion)
        
        if (scanRegion) {
          console.log('✅ Fallback scanner shows yellow squares!')
        } else {
          console.error('❌ Even fallback scanner has no visual overlay - this indicates a deeper issue')
        }
      }, 1000)
      
    }).catch((err) => {
      console.error('❌ Fallback scanner also failed:', err)
      setScanStatus('idle')
      setError('QR scanner failed to start. The yellow scanning overlay cannot be displayed. Please try manual input or file upload.')
    })
    
  }, [handleQRDetection])

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

      // Check for available cameras first
      let availableCameras = []
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        availableCameras = devices.filter(device => device.kind === 'videoinput')
        console.log('Available cameras:', availableCameras.length, availableCameras)
        
        if (availableCameras.length === 0) {
          throw new Error('No camera devices found on this device')
        }
      } catch (enumerateError) {
        console.warn('Could not enumerate devices:', enumerateError)
        // Continue anyway - some browsers may restrict enumeration but still allow camera access
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
        // Minimal constraints fallback
        {
          video: {
            width: { min: 320 },
            height: { min: 240 }
          }
        },
        // Last resort - any video device
        {
          video: true
        }
      )

      let mediaStream: MediaStream | null = null
      let lastError: any = null
      
      console.log(`Attempting camera access with ${configs.length} configurations...`)
      
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i]
        try {
          console.log(`Trying camera config ${i + 1}/${configs.length}:`, config)
          mediaStream = await navigator.mediaDevices.getUserMedia(config)
          if (mediaStream) {
            console.log(`✅ Camera access granted with config ${i + 1}:`, config)
            break
          }
        } catch (configError: any) {
          console.log(`❌ Config ${i + 1} failed:`, config, configError)
          lastError = configError
          continue
        }
      }

      if (!mediaStream) {
        // Provide detailed error information
        let detailedError = 'Unable to access camera with any configuration.\n\n'
        
        if (lastError) {
          detailedError += `Last error: ${lastError.name} - ${lastError.message}\n\n`
        }
        
        detailedError += 'Troubleshooting steps:\n'
        detailedError += '1. Check camera permissions in your browser\n'
        detailedError += '2. Close other applications using the camera\n'
        detailedError += '3. Try refreshing the page\n'
        detailedError += '4. Use HTTPS if not already\n'
        detailedError += '5. Try a different browser\n\n'
        
        if (availableCameras.length > 0) {
          detailedError += `Available cameras: ${availableCameras.length} found`
        } else {
          detailedError += 'No cameras detected on this device'
        }
        
        throw new Error(detailedError)
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
      console.log('📁 Image blob details:', {
        size: imageBlob.size,
        type: imageBlob.type
      })
      
      // Use our internal API route to avoid CORS issues
      const formData = new FormData()
      formData.append('image', imageBlob, 'qr-image.png')
      
      const response = await fetch('/api/qr/external-scan', {
        method: 'POST',
        body: formData
      })
      
      console.log('📡 API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📋 API response:', result)
        if (result.success && result.text) {
          console.log('✅ External API detected QR:', result.text)
          return result.text
        }
      }
      
      const errorData = await response.json().catch(() => ({}))
      console.log('❌ API error response:', errorData)
      
      let errorMessage = errorData.error || 'No QR code detected by external API'
      
      // Add helpful suggestions based on the error
      if (errorMessage.includes('No QR code detected')) {
        errorMessage += '\n\nTroubleshooting tips:\n• Ensure QR code is clearly visible and well-lit\n• Try moving camera closer or further from QR code\n• Check that QR code is not damaged or partially obscured\n• Try taking a photo and uploading instead'
      }
      
      throw new Error(errorMessage)
      
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
      
      console.log('📷 Capturing frame:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      })
      
      // Capture current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Debug: Show captured image quality info
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const totalPixels = imageData.data.length / 4
      let brightPixels = 0
      let darkPixels = 0
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
        if (brightness > 200) brightPixels++
        if (brightness < 50) darkPixels++
      }
      
      console.log('🖼️ Image quality analysis:', {
        totalPixels,
        brightPixels,
        darkPixels,
        brightRatio: (brightPixels / totalPixels * 100).toFixed(1) + '%',
        darkRatio: (darkPixels / totalPixels * 100).toFixed(1) + '%',
        contrastRatio: brightPixels > 0 && darkPixels > 0 ? (brightPixels / darkPixels).toFixed(2) : 'N/A'
      })
      
      // Convert to blob with higher quality
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('📁 Created blob:', {
              size: blob.size,
              type: blob.type,
              sizeKB: (blob.size / 1024).toFixed(1) + 'KB'
            })
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, 'image/png', 0.95) // High quality PNG
      })
      
      // Debug: Create download link for captured image (for testing)
      if (process.env.NODE_ENV === 'development') {
        const url = URL.createObjectURL(blob)
        console.log('🔍 Debug: Download captured image:', url)
        
        // Temporarily show download link for debugging
        const debugLink = document.createElement('a')
        debugLink.href = url
        debugLink.download = `qr-capture-${Date.now()}.png`
        debugLink.textContent = 'Download Captured Image (Debug)'
        debugLink.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:red;color:white;padding:5px;'
        document.body.appendChild(debugLink)
        
        setTimeout(() => {
          document.body.removeChild(debugLink)
          URL.revokeObjectURL(url)
        }, 10000) // Remove after 10 seconds
      }
      
      // Try external API
      const result = await scanWithExternalAPI(blob)
      if (result) {
        handleQRDetection(result)
        setSuccess('✅ QR detected using external API!')
      }
      
    } catch (error) {
      console.error('Capture and scan failed:', error)
      
      // Provide specific error messages based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('🌐 Network error. Check internet connection and try again.')
      } else if (error instanceof Error && error.message.includes('No QR code detected')) {
        setError('📷 No QR code detected in camera view. Position QR code clearly in scan area.\n\nTips:\n• Ensure good lighting\n• Hold camera steady\n• Move closer/further for better focus\n• Try uploading a photo instead')
      } else {
        setError('❌ External API scan failed. Try manual input or file upload.')
      }
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
          // Check if it's a network error
          if (apiError instanceof TypeError && apiError.message.includes('fetch')) {
            setError('🌐 Network error accessing external QR API. Check internet connection.')
            return
          }
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

  // Manual input state
  const [manualInput, setManualInput] = useState('')
  
  // Handle manual input
  const handleManualInput = useCallback(() => {
    if (manualInput && manualInput.trim()) {
      onScan(manualInput.trim().toUpperCase())
      setManualInput('') // Clear input after scan
    }
  }, [onScan, manualInput])

  // Handle Enter key in manual input
  const handleManualInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualInput()
    }
  }, [handleManualInput])

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

  // Check if we're accessing via network IP (not localhost/HTTPS)
  const isNetworkAccess = useCallback(() => {
    if (typeof window === 'undefined') return false
    const location = window.location
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    const isHTTPS = location.protocol === 'https:'
    const isNetworkIP = /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)
    
    return isNetworkIP && !isHTTPS
  }, [])

  // Get appropriate error message for camera access failures
  const getCameraErrorMessage = useCallback((error: any) => {
    const isNetwork = isNetworkAccess()
    
    if (isNetwork) {
      return {
        title: '🔒 HTTPS Required for Network Access',
        message: 'Camera access requires HTTPS when using network IP addresses.',
        solutions: [
          'Use HTTPS: npm run dev:network, then visit https://192.168.1.4:3000',
          'Or access via localhost: http://localhost:3000',
          'Or enable Chrome flag: chrome://flags/#unsafely-treat-insecure-origin-as-secure'
        ]
      }
    }
    
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      return {
        title: '📷 Camera Permission Denied',
        message: 'Please allow camera access to scan QR codes.',
        solutions: [
          'Click the camera icon in your browser address bar',
          'Select "Allow" for camera permissions',
          'Refresh the page and try again'
        ]
      }
    }
    
    if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
      return {
        title: '📷 No Camera Found',
        message: 'No camera devices were detected on this device.',
        solutions: [
          'Check if your camera is properly connected',
          'Try refreshing the page',
          'Use file upload as an alternative'
        ]
      }
    }
    
    return {
      title: '❌ Camera Error',
      message: `Camera initialization failed: ${error?.message || 'Unknown error'}`,
      solutions: [
        'Try refreshing the page',
        'Check browser camera permissions',
        'Use file upload as an alternative'
      ]
    }
  }, [isNetworkAccess])

  return (
    <div className={`qr-scanner-container ${isMobileDevice ? '' : 'p-6 shadow-lg'}`}>
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Smartphone className="w-5 h-5 mr-2" />
        QR Code Scanner
      </h2>
      
              {/* Mobile-specific instructions */}
        {isMobileDevice && (
          <div className="mb-2 p-2 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl">
            <h3 className="font-medium text-[var(--primary)] mb-1 text-sm font-heading flex items-center">
              <Smartphone className="w-4 h-4 mr-2" />
              Mobile Scanning Tips
            </h3>
            <div className="text-xs text-[var(--text-secondary)] space-y-0.5 font-body">
              <p>• Hold phone steady and keep QR code well-lit</p>
              <p>• Ensure QR code fills 60-80% of camera frame</p>
              <p>• Use back camera for better focus</p>
              {useExternalAPI && <p>• Use "Scan with API" if auto-scan fails</p>}
            </div>
          </div>
        )}

        {/* Camera Status and Controls */}
        <div className={`bg-gray-50 rounded-xl ${isMobileDevice ? 'mb-2 p-2 text-center' : 'mb-4 p-4'}`}>
          <div className={`mb-2 ${isMobileDevice ? 'space-y-2' : 'flex items-center justify-between'}`}>
            <div className={`flex items-center ${isMobileDevice ? 'justify-center' : ''} space-x-2`}>
              <span className="text-sm font-medium text-[var(--text-secondary)] font-body">Camera Status:</span>
              <span className={`inline-flex items-center text-sm font-medium font-body ${
                scanning ? 'text-green-600' : 'text-gray-500'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  scanning ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                {scanning ? 'Active' : 'Inactive'}
              </span>
              {virtualCameraDetected && (
                <span className={`text-xs bg-[var(--accent-2)]/10 text-[var(--accent-2)] px-2 py-1 rounded-full font-body ${
                  isMobileDevice ? 'block mt-1' : ''
                }`}>
                  📹 Virtual Camera Detected
                </span>
              )}
            </div>
            
            {/* External API Toggle */}
            <div className={`flex items-center space-x-2 ${isMobileDevice ? 'justify-center mt-2' : ''}`}>
              <label className="text-sm text-[var(--text-secondary)] flex items-center font-body">
                <input
                  type="checkbox"
                  checked={useExternalAPI}
                  onChange={(e) => setUseExternalAPI(e.target.checked)}
                  className="mr-2 accent-[var(--primary)]"
                />
                <span className={isMobileDevice ? 'font-medium' : ''}>Use External API</span>
              </label>
            </div>
          </div>
          
          {scanning && (
            <div className={`flex items-center space-x-2 text-sm text-[var(--text-secondary)] font-body ${
              isMobileDevice ? 'justify-center' : ''
            }`}>
              <span>Scanning...</span>
              {scanStatus === 'scanning' && <span className="text-[var(--accent-1)] flex items-center"><Camera className="w-3 h-3 mr-1" />Scanning...</span>}
              {scanStatus === 'detected' && <span className="text-green-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Detected!</span>}
              {apiScanLoading && <span className="text-[var(--accent-2)]">🌐 API processing...</span>}
            </div>
          )}
        </div>

      {/* Camera Controls */}
      <div className={`${isMobileDevice ? 'mb-2 space-y-1' : 'mb-4 flex flex-wrap gap-2'}`}>
        {!scanning ? (
          <button
            onClick={handleStartCamera}
            disabled={!cameraSupported}
            className={`btn-primary flex items-center justify-center space-x-2 ${
              isMobileDevice ? 'w-full' : ''
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Start Camera</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleStopCamera}
              className={`btn-danger flex items-center justify-center space-x-2 ${
                isMobileDevice ? 'w-full' : ''
              }`}
            >
              <Pause className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
            
            {/* External API Scan Button */}
            {useExternalAPI && (
              <button
                onClick={captureAndScanWithAPI}
                disabled={apiScanLoading}
                className={`btn-accent-2 flex items-center justify-center space-x-2 ${
                  isMobileDevice ? 'w-full' : ''
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
            className={`btn-success flex items-center justify-center space-x-2 ${
              isMobileDevice ? 'btn-sm' : ''
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>{isMobileDevice ? 'Upload' : 'Upload Image'}</span>
          </button>
          
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyPress={handleManualInputKeyPress}
              placeholder="Enter ID (e.g., EX-01)"
              className={`flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isMobileDevice ? 'text-sm' : ''
              }`}
            />
            <button
              onClick={handleManualInput}
              disabled={!manualInput.trim()}
              className={`btn-primary flex items-center justify-center space-x-2 ${
                isMobileDevice ? 'btn-sm' : ''
              } ${!manualInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Enter</span>
            </button>
          </div>
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
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm flex items-center">
              <Smartphone className="w-3 h-3 mr-1" />
              Position QR code in the frame
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
              <div className="mb-2">
                <Camera className={`mx-auto text-gray-400 ${isMobileDevice ? 'w-16 h-16' : 'w-12 h-12'}`} />
              </div>
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
      <div className={`${isMobileDevice ? 'mb-2 space-y-1' : 'mb-4 grid grid-cols-1 md:grid-cols-3 gap-4'}`}>
        <div className={`bg-gray-50 rounded-lg ${isMobileDevice ? 'p-2 flex justify-between items-center' : 'p-3'}`}>
          <div className={`text-gray-600 ${isMobileDevice ? 'text-xs' : 'text-sm'}`}>Scans Count</div>
          <div className={`font-bold text-gray-800 ${isMobileDevice ? 'text-lg' : 'text-xl'}`}>{scanCount}</div>
        </div>
        
        <div className={`bg-gray-50 rounded-lg ${isMobileDevice ? 'p-2' : 'p-3'}`}>
          <div className={`text-gray-600 ${isMobileDevice ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>Last Scanned</div>
          <div className={`font-mono text-gray-800 break-all ${isMobileDevice ? 'text-xs' : 'text-sm'}`}>
            {lastScannedCode ? (
              lastScannedCode.length > (isMobileDevice ? 30 : 20)
                ? `${lastScannedCode.substring(0, isMobileDevice ? 30 : 20)}...` 
                : lastScannedCode
            ) : 'None'}
          </div>
        </div>
        
        <div className={`bg-gray-50 rounded-lg ${isMobileDevice ? 'p-2 flex justify-between items-center' : 'p-3'}`}>
          <div className={`text-gray-600 ${isMobileDevice ? 'text-xs' : 'text-sm'}`}>Status</div>
          <div className={`font-medium ${isMobileDevice ? 'text-xs' : 'text-sm'}`}>
            {scanStatus === 'idle' && '⏸️ Idle'}
            {scanStatus === 'scanning' && '🔍 Scanning...'}
            {scanStatus === 'detected' && '✅ Detected!'}
            {apiScanLoading && (isMobileDevice ? '🌐 API...' : ' + 🌐 API Processing')}
          </div>
        </div>
      </div>

      {/* Detection Help Notice - Show when scanning but no detections after 10 seconds */}
      {scanning && scanStatus === 'scanning' && scanCount === 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-medium text-orange-800 mb-2">QR Code Not Detecting?</h3>
              <div className="text-sm text-orange-700 space-y-2">
                <p>If you can see a QR code in the camera but it's not being detected:</p>
                <div className="flex flex-col space-y-2">
                  {useExternalAPI ? (
                    <button
                      onClick={captureAndScanWithAPI}
                      disabled={apiScanLoading}
                      className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg px-4 py-2 text-sm font-medium self-start"
                    >
                      🌐 {apiScanLoading ? 'Scanning...' : 'Try External API Scan'}
                    </button>
                  ) : (
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={useExternalAPI}
                        onChange={(e) => setUseExternalAPI(e.target.checked)}
                        className="rounded"
                      />
                      <span>Enable External API scanning for better detection</span>
                    </label>
                  )}
                  <div className="text-xs text-orange-600">
                    • Try upload image or manual input as alternatives<br/>
                    • Ensure QR code is well-lit and clearly visible<br/>
                    • Hold camera steady for better focus
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          {(() => {
            try {
              const errorObj = getCameraErrorMessage({ message: error })
              return (
                <div>
                  <div className="font-medium text-red-800 mb-2">{errorObj.title}</div>
                  <div className="text-red-700 mb-3">{errorObj.message}</div>
                  <div className="text-sm text-red-600">
                    <div className="font-medium mb-1">Solutions:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {errorObj.solutions.map((solution, index) => (
                        <li key={index}>{solution}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            } catch {
              return <div className="text-red-800 whitespace-pre-line">{error}</div>
            }
          })()}
          <button
            onClick={() => setError(null)}
            className="mt-3 text-red-600 hover:text-red-800 text-sm underline"
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