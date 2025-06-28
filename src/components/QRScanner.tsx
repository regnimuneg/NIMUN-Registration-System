'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { parseQRData } from '@/lib/qrHelper'
import { Camera, Upload, Edit3, CheckCircle, Smartphone, Folder, Lightbulb, Pause, RefreshCw } from 'lucide-react'
import Html5QrcodePlugin from './Html5QrcodePlugin'
import QrScanner from 'qr-scanner'

interface QRScannerProps {
  onScan: (participantId: string) => void
  onError?: (error: string) => void
  isActive: boolean
}

export default function QRScanner({ onScan, onError, isActive }: QRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Mobile device detection (moved to top to fix hoisting issues)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
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

  // Client-side mobile detection to avoid SSR mismatch
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
      setIsMobileDevice(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))
    }
    checkMobile()
  }, [])
  
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
    setScanning(false)
    setScanStatus('idle')
  }, [])

  // Start QR scanning with enhanced debugging
  const startQRScanning = useCallback(() => {
    setUserInitiated(true)
    setScanning(true)
    setScanStatus('scanning')
  }, [])

  // Stop camera function
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...')
    setScanning(false)
    setScanStatus('idle')
    setUserInitiated(false)
  }, [])

  const handleQRDetection = useCallback((result: string) => {
    const newScanCount = scanCount + 1
    setScanCount(newScanCount)
    setLastScannedCode(result)
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
        setSuccess(`✅ QR Code detected: ${parsed.id}`)
        
        // Stop camera after first scan
        if (newScanCount === 1) {
          console.log('🛑 Stopping camera after first scan')
          setTimeout(() => {
            stopCamera()
          }, 1500) // Small delay to show success message
        }
        return
      }
      
      // If not our format, check if it's a direct participant ID
      console.log('🔍 Checking if direct participant ID format...')
      if (result.match(/^[A-Z]{2}-\d{2}$/)) {
        console.log('✅ Direct participant ID detected:', result)
        onScan(result)
        setError(null)
        setSuccess(`✅ QR Code detected: ${result}`)
        
        // Stop camera after first scan
        if (newScanCount === 1) {
          console.log('🛑 Stopping camera after first scan')
          setTimeout(() => {
            stopCamera()
          }, 1500) // Small delay to show success message
        }
        return
      }
      
      // Try to extract ID from URL or other formats
      console.log('🔍 Attempting to extract ID from URL/text...')
      const idMatch = result.match(/(?:id[=:]|participant[=:]|user[=:])([A-Z]{2}-\d{2})/i)
      if (idMatch) {
        console.log('✅ Extracted participant ID from URL:', idMatch[1])
        const extractedId = idMatch[1].toUpperCase()
        onScan(extractedId)
        setError(null)
        setSuccess(`✅ QR Code detected: ${extractedId}`)
        
        // Stop camera after first scan
        if (newScanCount === 1) {
          console.log('🛑 Stopping camera after first scan')
          setTimeout(() => {
            stopCamera()
          }, 1500) // Small delay to show success message
        }
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
  }, [onScan, onError, scanCount, stopCamera])

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

  // Handle reset scan count
  const handleResetScanCount = useCallback(() => {
    console.log('User initiated scan count reset')
    setScanCount(0)
    setLastScannedCode(null)
    setError(null)
    setSuccess(null)
  }, [])

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
    if (!scanning) return

    try {
      console.log('🌐 Attempting external API scan...')
      setApiScanLoading(true)
      setScanStatus('detected')

      // Add a small pause to show we're processing
      await new Promise(resolve => setTimeout(resolve, 1000))

      setScanStatus('scanning')
      setApiScanLoading(false)
      
    } catch (error) {
      console.error('API scan failed:', error)
      setError('Failed to scan with external API. Please try again or use manual input.')
      setApiScanLoading(false)
    }
  }, [scanning])

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
    if (userInitiated && !scanning && cameraSupported) {
      const timeoutId = setTimeout(() => {
        setScanning(true)
      }, 100) // Small delay to prevent rapid firing
      
      return () => clearTimeout(timeoutId)
    }
  }, [userInitiated, scanning, cameraSupported])

  // Cleanup on unmount - stable effect
  useEffect(() => {
    return () => {
      console.log('QRScanner unmounting - cleaning up camera')
      setScanning(false)
      setScanStatus('idle')
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
    <div className={`qr-scanner-container ${isMobileDevice ? 'px-4 py-2' : 'p-6 shadow-lg'}`}>
      {!isMobileDevice && (
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Smartphone className="w-5 h-5 mr-2" />
        QR Code Scanner
      </h2>
      )}
      
      {/* Mobile-optimized header */}
        {isMobileDevice && (
        <div className="mb-3 text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">QR Scanner</h2>
          <div className="text-sm text-gray-600">
            Scan Count: <span className="font-bold text-blue-600">{scanCount}</span>
            {lastScannedCode && (
              <span className="ml-3">
                Last: <span className="font-mono text-xs">{lastScannedCode.substring(0, 8)}...</span>
              </span>
            )}
            </div>
          </div>
        )}

      {/* Mobile-specific quick tips */}
      {isMobileDevice && scanCount === 0 && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-700 text-center">
            💡 Hold steady • Good lighting • Fill 80% of frame
          </div>
        </div>
      )}

      {/* Mobile-optimized status bar */}
      {isMobileDevice && (
        <div className="mb-3 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${scanning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">{scanning ? 'Scanning' : 'Ready'}</span>
            {scanStatus === 'detected' && <span className="text-green-600 text-xs">✅</span>}
            {apiScanLoading && <span className="text-purple-600 text-xs">🌐</span>}
          </div>
          <label className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={useExternalAPI}
              onChange={(e) => setUseExternalAPI(e.target.checked)}
              className="mr-1 scale-75"
            />
            API
          </label>
        </div>
      )}

      {/* Desktop status section */}
      {!isMobileDevice && (
        <div className="bg-gray-50 rounded-xl mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Camera Status:</span>
              <span className={`inline-flex items-center text-sm font-medium ${
                scanning ? 'text-green-600' : 'text-gray-500'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  scanning ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                {scanning ? 'Active' : 'Inactive'}
              </span>
              {virtualCameraDetected && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                  📹 Virtual Camera
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 flex items-center">
                <input
                  type="checkbox"
                  checked={useExternalAPI}
                  onChange={(e) => setUseExternalAPI(e.target.checked)}
                  className="mr-2"
                />
                Use External API
              </label>
            </div>
          </div>
          
          {scanning && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <span>Scanning...</span>
              {scanStatus === 'scanning' && <span className="text-blue-600 flex items-center"><Camera className="w-3 h-3 mr-1" />Active</span>}
              {scanStatus === 'detected' && <span className="text-green-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Detected!</span>}
              {apiScanLoading && <span className="text-purple-600">🌐 Processing...</span>}
            </div>
          )}
        </div>
      )}

      {/* Camera Controls */}
      <div className={`${isMobileDevice ? 'mb-3' : 'mb-4'}`}>
        {!scanning ? (
          <>
            {scanCount > 0 && (
              <div className={`w-full mb-3 ${isMobileDevice ? 'p-3' : 'p-4'} bg-green-50 border border-green-200 rounded-lg`}>
                <div className="text-center">
                  <div className={`text-green-800 font-medium ${isMobileDevice ? 'text-sm mb-2' : 'mb-2'}`}>
                    ✅ QR Code Successfully Scanned!
                  </div>
                  {!isMobileDevice && (
                    <div className="text-green-700 text-sm mb-3">
                      Would you like to scan another QR code?
                    </div>
                  )}
                  <div className={`${isMobileDevice ? 'grid grid-cols-2 gap-2' : 'flex justify-center space-x-3'}`}>
          <button
            onClick={handleStartCamera}
            disabled={!cameraSupported}
            className={`btn-primary flex items-center justify-center space-x-2 ${
                        isMobileDevice ? 'text-sm py-2' : ''
            }`}
          >
            <Camera className="w-4 h-4" />
                      <span>Scan Again</span>
                    </button>
                    <button
                      onClick={handleResetScanCount}
                      className={`btn-secondary flex items-center justify-center space-x-2 ${
                        isMobileDevice ? 'text-sm py-2' : ''
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {scanCount === 0 && (
              <button
                onClick={handleStartCamera}
                disabled={!cameraSupported}
                className={`btn-primary flex items-center justify-center space-x-2 w-full ${
                  isMobileDevice ? 'py-3 text-base font-medium' : ''
                }`}
              >
                <Camera className="w-5 h-5" />
            <span>Start Camera</span>
          </button>
            )}
          </>
        ) : (
          <div className={`${isMobileDevice ? 'grid grid-cols-1 gap-2' : 'flex flex-wrap gap-2'}`}>
            <button
              onClick={handleStopCamera}
              className={`btn-danger flex items-center justify-center space-x-2 ${
                isMobileDevice ? 'w-full py-3' : ''
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
                  isMobileDevice ? 'w-full py-3' : ''
                }`}
              >
                <span>🌐</span>
                <span>{apiScanLoading ? 'Scanning...' : 'Scan with API'}</span>
              </button>
            )}
          </div>
        )}
        
        {/* Alternative Methods */}
        <div className={`${isMobileDevice ? 'mt-3 space-y-2' : 'mt-4 flex gap-2'}`}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`btn-success flex items-center justify-center space-x-2 ${
              isMobileDevice ? 'w-full py-2 text-sm' : ''
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Upload Image</span>
          </button>
          
          <div className={`${isMobileDevice ? 'flex gap-2' : 'flex gap-2 flex-1'}`}>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyPress={handleManualInputKeyPress}
              placeholder={isMobileDevice ? "ID (EX-01)" : "Enter ID (e.g., EX-01)"}
              className={`flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isMobileDevice ? 'min-w-0' : ''
              }`}
            />
            <button
              onClick={handleManualInput}
              disabled={!manualInput.trim()}
              className={`btn-primary flex items-center justify-center space-x-1 ${
                isMobileDevice ? 'px-3' : 'space-x-2'
              } ${!manualInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Edit3 className="w-4 h-4" />
              {!isMobileDevice && <span>Enter</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Selection - Desktop only */}
      {showCameraSelection && availableCameras.length > 1 && !isMobileDevice && (
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
      <div className={`relative ${isMobileDevice ? 'mb-3' : 'mb-4'}`}>
        {scanning && isActive && (
          <div className={isMobileDevice ? 'rounded-lg overflow-hidden' : ''}>
          <Html5QrcodePlugin
            fps={virtualCameraDetected ? 2 : (isMobileDevice ? 4 : 5)}
            qrbox={isMobileDevice ? undefined : { width: 250, height: 250 }}
            disableFlip={false}
            verbose={false}
            qrCodeSuccessCallback={(decodedText) => {
              console.log('🔍 QR Code detected:', decodedText)
              setScanStatus('detected')
              handleQRDetection(decodedText)
              
              // Add a small pause after detection
              const pauseTime = virtualCameraDetected ? 2000 : (isMobileDevice ? 300 : 500)
              setTimeout(() => {
                setScanStatus('scanning')
              }, pauseTime)
            }}
            qrCodeErrorCallback={(error) => {
              console.warn('QR Code scanning error:', error)
              onError?.(String(error))
            }}
          />
          </div>
        )}
        
        {!scanning && (
          <div className={`w-full ${isMobileDevice ? 'aspect-square max-w-full' : 'max-w-md h-64'} mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50`}>
            <div className="text-center text-gray-500">
              <div className="mb-2">
                <Camera className={`mx-auto text-gray-400 ${isMobileDevice ? 'w-12 h-12' : 'w-12 h-12'}`} />
              </div>
              <div className={isMobileDevice ? 'text-base font-medium' : 'font-medium'}>Camera not active</div>
              <div className={`${isMobileDevice ? 'text-sm mt-1' : 'text-sm mt-1'}`}>
                {isMobileDevice ? 'Tap "Start Camera" to begin' : 'Click "Start Camera" to begin scanning'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Virtual Camera Instructions - Desktop only */}
      {virtualCameraDetected && !isMobileDevice && (
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

      {/* Virtual Camera Instructions - Mobile simplified */}
      {virtualCameraDetected && isMobileDevice && scanning && (
        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg text-center">
          <div className="text-xs text-purple-700">
            📹 Virtual camera detected • Optimized settings active
        </div>
          <button
            onClick={forceRefreshScanner}
            className="mt-1 bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs"
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Scan Information - Desktop only */}
      {!isMobileDevice && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-600 text-sm">Scans Count</div>
            <div className="font-bold text-gray-800 text-xl">{scanCount}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-600 text-sm mb-1">Last Scanned</div>
            <div className="font-mono text-gray-800 break-all text-sm">
            {lastScannedCode ? (
                lastScannedCode.length > 20
                  ? `${lastScannedCode.substring(0, 20)}...` 
                : lastScannedCode
            ) : 'None'}
          </div>
        </div>
        
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-600 text-sm">Status</div>
            <div className="font-medium text-sm">
            {scanStatus === 'idle' && '⏸️ Idle'}
            {scanStatus === 'scanning' && '🔍 Scanning...'}
            {scanStatus === 'detected' && '✅ Detected!'}
              {apiScanLoading && '🌐 API Processing'}
          </div>
        </div>
      </div>
      )}

      {/* Detection Help Notice - Show when scanning but no detections after 10 seconds */}
      {scanning && scanStatus === 'scanning' && scanCount === 0 && (
        <div className={`${isMobileDevice ? 'mb-3 p-3' : 'mb-4 p-4'} bg-orange-50 border border-orange-200 rounded-lg`}>
          {isMobileDevice ? (
            <div className="text-center">
              <div className="text-orange-800 font-medium text-sm mb-2">
                💡 QR Code Not Detecting?
              </div>
              {useExternalAPI ? (
                <button
                  onClick={captureAndScanWithAPI}
                  disabled={apiScanLoading}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg px-3 py-2 text-sm font-medium"
                >
                  🌐 {apiScanLoading ? 'Scanning...' : 'Try API Scan'}
                </button>
              ) : (
                <label className="flex items-center justify-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useExternalAPI}
                    onChange={(e) => setUseExternalAPI(e.target.checked)}
                    className="rounded"
                  />
                  <span>Enable API scanning</span>
                </label>
              )}
              <div className="text-xs text-orange-600 mt-2">
                Try upload image or manual input
              </div>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={`${isMobileDevice ? 'mb-3 p-3' : 'mb-4 p-4'} bg-red-50 border border-red-200 rounded-lg`}>
          {isMobileDevice ? (
            <div className="text-center">
              <div className="text-red-800 font-medium text-sm mb-2">❌ Error</div>
              <div className="text-red-700 text-xs mb-2">{error.split(':')[0]}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-xs underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className={`${isMobileDevice ? 'mb-3 p-3' : 'mb-4 p-4'} bg-green-50 border border-green-200 rounded-lg`}>
          {isMobileDevice ? (
            <div className="text-center">
              <div className="text-green-800 text-sm">{success}</div>
              <button
                onClick={() => setSuccess(null)}
                className="mt-1 text-green-600 hover:text-green-800 text-xs underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
          <div className="text-green-800">{success}</div>
          <button
            onClick={() => setSuccess(null)}
            className="mt-2 text-green-600 hover:text-green-800 text-sm underline"
          >
            Dismiss
          </button>
            </>
          )}
        </div>
      )}

      {/* Camera Permission Status */}
      {cameraPermission === 'denied' && (
        <div className={`${isMobileDevice ? 'mb-3 p-3' : 'mb-4 p-4'} bg-yellow-50 border border-yellow-200 rounded-lg`}>
          <div className={`text-yellow-800 ${isMobileDevice ? 'text-center text-sm' : ''}`}>
            <strong>Camera Permission Denied</strong>
            {!isMobileDevice && <br />}
            {isMobileDevice && <div className="text-xs mt-1">
            Please allow camera access in your browser settings and refresh the page.
            </div>}
            {!isMobileDevice && 'Please allow camera access in your browser settings and refresh the page.'}
          </div>
        </div>
      )}

      {!cameraSupported && (
        <div className={`${isMobileDevice ? 'mb-3 p-3' : 'mb-4 p-4'} bg-red-50 border border-red-200 rounded-lg`}>
          <div className={`text-red-800 ${isMobileDevice ? 'text-center text-sm' : ''}`}>
            <strong>Camera Not Supported</strong>
            {!isMobileDevice && <br />}
            {isMobileDevice && <div className="text-xs mt-1">
            Your device doesn't support camera access. Please use the file upload or manual input options.
            </div>}
            {!isMobileDevice && 'Your device doesn\'t support camera access. Please use the file upload or manual input options.'}
          </div>
        </div>
      )}

      {/* Alternative Methods - Desktop only */}
      {!isMobileDevice && (
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-700 mb-2">Alternative Methods</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Upload Image:</strong> Take a photo of the QR code and upload it</p>
          <p>• <strong>Manual Input:</strong> Type the participant ID directly (e.g., EX-01)</p>
          {useExternalAPI && <p>• <strong>External API:</strong> Uses cloud-based QR detection for better accuracy</p>}
        </div>
      </div>
      )}

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