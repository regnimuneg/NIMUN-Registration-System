export interface QRCodeOptions {
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}

// QR Server API options
export interface QRServerOptions {
  size?: number;
  format?: 'png' | 'svg';
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  backgroundColor?: string; // For white background
  transparent?: boolean; // For transparent background
}

export function generateQRCodeUrl(
  participantId: string, 
  options: QRCodeOptions = {}
): string {
  const {
    size = 300,
    bgColor = 'transparent',
    fgColor = '#000000',
    level = 'H'
  } = options;
  
  // Create QR data matching the specified format
  const qrData = JSON.stringify({
    id: participantId,
    type: 'JNIMUN',
    t: Math.floor(Date.now() / 1000) // Unix timestamp
  });
  
  // For now, return the data that will be used to generate QR
  // In the component, we'll use react-qr-code to generate the actual QR
  return qrData;
}

// Generate QR codes using QR Server API with background options
export async function generateQRCodeWithBackground(
  participantId: string,
  options: QRServerOptions = {}
): Promise<Blob | null> {
  try {
    // Generate the QR data
    const qrData = generateQRCodeUrl(participantId);
    
    const requestBody = {
      data: qrData,
      size: options.size || 300,
      format: options.format || 'png',
      backgroundColor: options.backgroundColor,
      transparent: options.transparent || false,
      errorCorrectionLevel: options.errorCorrectionLevel || 'H'
    };

    // Use our local API route to avoid CORS issues
    const response = await fetch('/api/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`QR API request failed: ${response.status} - ${errorData.error}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

// Generate QR codes using QR Server API (simple version)
export async function generateQRCodeWithQRServer(
  participantId: string,
  size: number = 300,
  format: 'png' | 'svg' = 'png'
): Promise<Blob | null> {
  return generateQRCodeWithBackground(participantId, {
    size,
    format,
    transparent: false,
    backgroundColor: '#FFFFFF'
  });
}

// Generate transparent QR code using QuickChart API for true PNG transparency
export async function generateTransparentQR(
  participantId: string,
  size: number = 300,
  format: 'png' | 'svg' = 'png'
): Promise<Blob | null> {
  // Try QuickChart for true transparent PNG
  try {
    const qrData = generateQRCodeUrl(participantId)
    const quickChartUrl =
      `https://quickchart.io/qr` +
      `?text=${encodeURIComponent(qrData)}` +
      `&size=${size}` +
      `&ecLevel=H` +
      `&dark=${encodeURIComponent('#000000')}` +
      `&light=${encodeURIComponent('rgba(0,0,0,0)')}`

    const response = await fetch(quickChartUrl)
    if (response.ok) {
      return await response.blob()
    } else {
      console.error('QuickChart API error:', response.status)
    }
  } catch (error) {
    console.error('Error generating transparent QR via QuickChart:', error)
  }
  
  // Fallback to QR Server API
  console.log('Falling back to QR Server API for transparent QR')
  return generateQRCodeWithBackground(participantId, {
    size,
    format,
    transparent: true
  })
}

// Generate white background QR code
export async function generateWhiteBackgroundQR(
  participantId: string,
  size: number = 300,
  format: 'png' | 'svg' = 'png'
): Promise<Blob | null> {
  return generateQRCodeWithBackground(participantId, {
    size,
    format,
    transparent: false,
    backgroundColor: '#FFFFFF'
  });
}

export function parseQRData(qrString: string): { id: string; type: string; timestamp: string } | null {
  try {
    const data = JSON.parse(qrString);
    // Handle the new format: {"id":"DC-01","type":"JNIMUN","t":1750735448}
    if (data.type === 'JNIMUN' && data.id && data.t) {
      return {
        id: data.id,
        type: data.type,
        timestamp: new Date(data.t * 1000).toISOString()
      };
    }
    // Fallback for old format
    if (data.type === 'JNIMUN_PARTICIPANT' && data.id) {
      return {
        id: data.id,
        type: data.type,
        timestamp: data.timestamp || new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function downloadQRCode(canvas: HTMLCanvasElement, participantId: string): void {
  const link = document.createElement('a');
  link.download = `qr-${participantId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Helper function to download QR code from blob
export function downloadQRCodeFromBlob(blob: Blob, participantId: string, format: string = 'png'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `qr-${participantId}.${format}`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 