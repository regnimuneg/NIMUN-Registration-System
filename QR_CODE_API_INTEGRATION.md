# QR Code API Integration Guide

This document explains how to integrate external high-quality QR code APIs like QRCodeMonkey into your JNIMUN registration system.

## Overview

The system now supports both:
1. **Client-side QR generation** (existing): Using `react-qr-code` library
2. **External API QR generation** (new): Using professional QR code services

## Supported APIs

### 1. QR Server API (Free)
- **URL**: `https://api.qrserver.com/v1/create-qr-code/`
- **Cost**: Free
- **Features**: Basic high-quality QR codes
- **No API key required**

### 2. QRCodeMonkey API (Professional)
- **URL**: `https://qrcode-monkey.p.rapidapi.com/qr/custom`
- **Cost**: Free tier available, paid plans for advanced features
- **Features**: 
  - Custom logos
  - Gradient colors
  - Custom shapes and styles
  - Multiple export formats (PNG, SVG, PDF, EPS)
  - High resolution for print quality

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in your project root:

```env
# QR Code APIs (Optional - for professional QR codes)
# Get your API key from https://rapidapi.com/qrcode-monkey/api/qrcode-monkey
QRCODE_MONKEY_API_KEY=your_rapidapi_key_here
```

### 2. Getting QRCodeMonkey API Key
1. Visit [RapidAPI QRCodeMonkey](https://rapidapi.com/qrcode-monkey/api/qrcode-monkey)
2. Sign up for a free account
3. Subscribe to the QRCodeMonkey API (free tier available)
4. Copy your API key to the environment variable

## Usage

### Basic Usage
```tsx
import { QRCodeDisplay } from '@/components/QRCodeGenerator'

// Standard QR code (existing functionality)
<QRCodeDisplay
  qrData={qrData}
  participantId={participantId}
  size={300}
/>

// Professional QR code with external API
<QRCodeDisplay
  qrData={qrData}
  participantId={participantId}
  size={300}
  useExternalAPI={true}
/>
```

### Advanced Styling
```tsx
<QRCodeDisplay
  qrData={qrData}
  participantId={participantId}
  size={300}
  useExternalAPI={true}
  professionalStyle={{
    body: 'rounded-pointed',
    eye: 'frame14',
    eyeBall: 'ball16',
    bodyColor: '#1e40af',
    bgColor: '#FFFFFF',
    gradientColor1: '#1e40af',
    gradientColor2: '#1e3a8a',
    gradientType: 'radial'
  }}
/>
```

## Features

### Download Options
When using external APIs, users get additional download options:
- **Standard**: White background, Transparent background
- **Professional**: High-resolution PNG, Vector SVG, Print-ready PDF

### Fallback Strategy
The system uses a fallback approach:
1. Try professional API (if API key provided)
2. Fall back to free QR Server API
3. Fall back to client-side generation

## API Functions

### Helper Functions
```tsx
import { 
  generateQRCodeWithQRServer,
  generateQRCodeWithMonkey,
  generateQRCodeWithMonkeyPro,
  downloadQRCodeFromBlob 
} from '@/lib/qrHelper'

// Generate with free API
const qrUrl = await generateQRCodeWithQRServer(participantId, 300, 'png')

// Generate with professional API
const blob = await generateQRCodeWithMonkeyPro(participantId, options, apiKey)
```

## Benefits

### External APIs vs Client-side
- ✅ **Higher quality**: Professional-grade QR codes
- ✅ **Better performance**: Server-side generation
- ✅ **Advanced features**: Logos, gradients, custom shapes
- ✅ **Print quality**: Vector formats and high resolution
- ✅ **Reliability**: No client-side dependencies
- ✅ **Customization**: Professional branding options

## Cost Considerations

### Free Options
- QR Server API: Completely free
- QRCodeMonkey: Free tier with limitations

### Paid Options
- QRCodeMonkey Pro: Advanced features, higher limits
- Custom enterprise solutions available

## Testing

Use the debug page at `/debug/qr-upload` to test the new functionality:
1. Toggle "Use External High-Quality QR API"
2. Compare quality between client-side and external APIs
3. Test download options

## Troubleshooting

### Common Issues
1. **API key not working**: Verify the key is correct and has proper permissions
2. **CORS errors**: External APIs should handle CORS properly
3. **Rate limits**: Free tiers have usage limits

### Debugging
Check browser console for error messages and API response details.

## Future Enhancements

Potential improvements:
- Logo upload integration
- Bulk QR generation with external APIs
- Custom branding templates
- Analytics integration
- A/B testing for QR code styles 