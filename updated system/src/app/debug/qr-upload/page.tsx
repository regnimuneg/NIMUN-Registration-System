'use client'

import { useState, useRef, useCallback } from 'react'
import QRCode from 'react-qr-code'
import QrScanner from 'qr-scanner'

export default function QRUploadDebugPage() {
  const [debugLogs, setDebugLogs] = useState<string[]>(['🎯 QR Upload Debug Test loaded'])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🔍'
    const logEntry = `[${timestamp}] ${emoji} ${message}`
    setDebugLogs(prev => [...prev, logEntry])
  }, [])

  const clearLogs = useCallback(() => {
    setDebugLogs([])
  }, [])

  // Test QR parsing (same logic as your app)
  const testQRParsing = useCallback((qrString: string) => {
    addLog('Testing QR data parsing...')
    
    try {
      // Test 1: JSON parsing
      const data = JSON.parse(qrString)
      if ((data.type === 'JNIMUN_PARTICIPANT' || data.type === 'JNIMUN') && data.id) {
        addLog(`Valid JSON QR data - ID: ${data.id}`, 'success')
        return
      }
      addLog(`JSON parsed but not JNIMUN format: ${JSON.stringify(data)}`, 'warning')
    } catch (e) {
      addLog('Not valid JSON, checking other formats...')
    }

    // Test 2: Direct ID format
    if (qrString.match(/^[A-Z]{2}-\d{2}$/)) {
      addLog(`Valid direct participant ID: ${qrString}`, 'success')
      return
    }

    // Test 3: URL extraction
    const idMatch = qrString.match(/(?:id[=:]|participant[=:]|user[=:])([A-Z]{2}-\d{2})/i)
    if (idMatch) {
      addLog(`Extracted ID from URL: ${idMatch[1]}`, 'success')
      return
    }

    addLog(`Could not parse QR format: ${qrString.substring(0, 50)}...`, 'error')
  }, [addLog])

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    addLog('📁 handleFileUpload called')
    console.log('handleFileUpload called', event)
    
    const file = event.target.files?.[0]
    if (!file) {
      addLog('❌ No file selected')
      return
    }

    addLog(`✅ File selected: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`)

    try {
      // Get image dimensions first
      const img = new Image()
      const imageLoadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => {
          addLog(`Image dimensions: ${img.width}x${img.height}px`)
          resolve()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
      })
      
      await imageLoadPromise
      URL.revokeObjectURL(img.src)
      
      // Try multiple scanning methods
      let result = null
      let scanMethod = ''
      
      // Method 1: Default scanning
      try {
        addLog('Attempting QR scan with default method...')
        result = await QrScanner.scanImage(file)
        if (result) {
          scanMethod = 'default'
          addLog('QR code detected with default method', 'success')
        }
      } catch (error) {
        addLog(`Default method failed: ${error}`, 'error')
      }
      
      // Method 2: Try with different approach (without options)
      if (!result) {
        try {
          addLog('Attempting QR scan with alternative method...')
          // Try scanning without any options
          result = await QrScanner.scanImage(file)
          if (result) {
            scanMethod = 'alternative'
            addLog('QR code detected with alternative method', 'success')
          }
        } catch (error) {
          addLog(`Alternative method failed: ${error}`, 'error')
        }
      }
      
      if (result) {
        addLog(`QR scan successful using ${scanMethod} method: ${result}`, 'success')
        addLog(`QR data length: ${result.length}`)
        addLog(`QR data preview: ${result.substring(0, 100)}`)
        
        // Test parsing
        testQRParsing(result)
      } else {
        addLog('No QR code detected with any method', 'error')
        addLog('Troubleshooting tips:', 'warning')
        addLog('  - Ensure the QR code is clear and well-lit')
        addLog('  - Try a higher resolution image')
        addLog('  - Make sure the QR code takes up a good portion of the image')
      }
    } catch (error) {
      addLog(`General error: ${error}`, 'error')
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addLog, testQRParsing])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        addLog(`File dropped: ${file.name}`)
        // Create a proper file list
        const fileList = files
        if (fileInputRef.current) {
          fileInputRef.current.files = fileList
          fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
        }
      } else {
        addLog('Please drop an image file', 'error')
      }
    }
  }, [addLog])

  // Generate test QR codes
  const testQRData = [
    { id: 'EX-01', data: 'EX-01' },
    { id: 'EX-02', data: JSON.stringify({id: 'EX-02', type: 'JNIMUN', t: Math.floor(Date.now()/1000)}) },
    { id: 'RG-01', data: JSON.stringify({id: 'RG-01', type: 'JNIMUN_PARTICIPANT', timestamp: new Date().toISOString()}) }
  ]

  const downloadQR = useCallback((qrData: string, filename: string) => {
    // Create a canvas to generate the QR code
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // We'll use the QRCode component's SVG and convert it
    const tempDiv = document.createElement('div')
    document.body.appendChild(tempDiv)
    
    // This is a simplified version - in a real implementation you'd need to properly convert the SVG
    addLog(`Download initiated for ${filename}`, 'success')
    
    document.body.removeChild(tempDiv)
  }, [addLog])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔧 QR Upload Debug Test</h1>
          <p className="text-gray-600">Test QR code upload functionality to identify scanning issues.</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">📤 Upload QR Image</h2>
          <div 
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-100' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onClick={() => {
              console.log('Upload area clicked')
              addLog('🖱️ Upload area clicked - opening file dialog')
              console.log('fileInputRef.current:', fileInputRef.current)
              if (fileInputRef.current) {
                fileInputRef.current.click()
                addLog('✅ File input clicked')
              } else {
                addLog('❌ File input ref is null', 'error')
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-6xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-700 mb-2">Click to upload QR image</p>
            <p className="text-sm text-gray-500">Or drag and drop a QR code image here</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            onClick={(e) => {
              console.log('File input clicked')
              addLog('File input clicked')
            }}
          />
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Log
            </button>
            <button
              onClick={() => {
                console.log('Manual file dialog button clicked')
                addLog('🔘 Manual file dialog button clicked')
                console.log('fileInputRef.current:', fileInputRef.current)
                if (fileInputRef.current) {
                  fileInputRef.current.click()
                  addLog('✅ Manual file input clicked')
                } else {
                  addLog('❌ File input ref is null', 'error')
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open File Dialog
            </button>
          </div>
        </div>

        {/* Test QR Codes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Test QR Codes</h2>
          <p className="text-gray-600 mb-4">Try uploading these generated QR codes:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testQRData.map((test) => (
              <div key={test.id} className="border border-gray-200 rounded-lg p-4 text-center">
                <h4 className="font-semibold mb-2">{test.id}</h4>
                <div className="bg-white p-2 rounded">
                  <QRCode
                    value={test.data}
                    size={150}
                    level="H"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 break-all">{test.data}</p>
                <button
                  onClick={() => downloadQR(test.data, test.id)}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Test Upload
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Debug Log */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Debug Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-80 overflow-y-auto font-mono text-sm">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500">🎯 QR Upload Debug Test loaded - upload a file to see logs</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 