# External QR Scanner API Solution

## Problem Description

The QR code scanner was failing to detect QR codes even when they were clearly visible and positioned correctly within the scanning box. This is a common issue with JavaScript-based QR scanners, especially when dealing with:

- Virtual cameras (DroidCam, OBS, etc.)
- Low-quality camera feeds
- Challenging lighting conditions
- Specific QR code formats or sizes

## Solution: External QR Code API Integration

I've implemented an external QR code scanning API as a fallback solution when the regular camera scanning fails. This uses **QuickChart's QR Reader API** as an alternative method.

## Features Added

### 1. External API Toggle
- Added a checkbox to enable/disable external API usage
- Located in the camera status section
- Users can opt-in to use cloud-based scanning

### 2. API Scan Button
- "🌐 Scan with API" button appears when external API is enabled and camera is active
- Captures the current video frame and sends it to the external API
- Provides immediate feedback during processing

### 3. Enhanced File Upload
- File upload now tries regular scanning first
- If regular scanning fails and external API is enabled, it automatically tries the external API
- Provides clear feedback about which method succeeded

### 4. Improved User Experience
- Success messages with auto-dismiss after 5 seconds
- Loading indicators during API processing
- Clear error messages if API fails
- Fallback instructions for users

## Technical Implementation

### Core Functions

```typescript
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
```

### UI Components

```tsx
{/* External API Toggle */}
<div className="flex items-center space-x-2">
  <label className="text-sm text-gray-600">
    <input
      type="checkbox"
      checked={useExternalAPI}
      onChange={(e) => setUseExternalAPI(e.target.checked)}
      className="mr-1"
    />
    Use External API
  </label>
</div>

{/* External API Scan Button */}
{useExternalAPI && (
  <button
    onClick={captureAndScanWithAPI}
    disabled={apiScanLoading}
    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
  >
    <span>🌐</span>
    <span>{apiScanLoading ? 'Scanning...' : 'Scan with API'}</span>
  </button>
)}
```

## Usage Instructions

### For Users Experiencing Scanning Issues:

1. **Enable External API**
   - Check the "Use External API" checkbox in the camera status section
   - This enables cloud-based QR code detection

2. **Use the API Scan Button**
   - Start the camera as normal
   - Position the QR code clearly in the camera view
   - Click the "🌐 Scan with API" button
   - Wait for the external API to process the image

3. **Alternative Methods**
   - **Upload Image**: Take a photo of the QR code and upload it
   - **Manual Input**: Type the participant ID directly (e.g., EX-01)

### For Virtual Camera Users (DroidCam/OBS):

The system automatically detects virtual cameras and:
- Shows optimized instructions
- Recommends using the external API
- Provides the "Force Refresh" option
- Suggests alternative input methods

## API Provider: QuickChart

- **Service**: QuickChart QR Reader API
- **Endpoint**: `https://quickchart.io/qr/read`
- **Method**: POST with FormData
- **Advantages**:
  - Free to use
  - High accuracy
  - Supports multiple image formats
  - No API key required
  - CORS-enabled

## Fallback Strategy

The scanning process follows this hierarchy:

1. **Primary**: Local qr-scanner library (fastest, works offline)
2. **Secondary**: External API (more accurate, requires internet)
3. **Tertiary**: Manual input (always works, user types ID)

## Benefits

1. **Improved Success Rate**: External API can detect QR codes that local scanning misses
2. **Better Virtual Camera Support**: Cloud processing handles virtual camera issues better
3. **User Choice**: Users can opt-in to external API usage
4. **Graceful Degradation**: Multiple fallback options ensure system always works
5. **Clear Feedback**: Users understand what's happening and what to try next

## Testing

To test the external API integration:

1. Enable the external API toggle
2. Point camera at a QR code
3. If regular scanning fails, click "Scan with API"
4. Upload a QR code image and verify it tries both methods
5. Test with challenging QR codes (small, blurry, angled)

## Future Enhancements

- Support for additional QR scanning APIs
- Automatic API fallback when local scanning fails
- Image quality improvement before API submission
- Caching of successful scans to avoid duplicate API calls
- Performance metrics and success rate tracking

This solution provides a robust fallback mechanism that should significantly improve QR code detection success rates, especially for users experiencing issues with virtual cameras or challenging scanning conditions. 