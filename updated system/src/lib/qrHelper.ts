export interface QRCodeOptions {
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
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
  
  // Create compact QR data for better scanning
  // Use shorter format to reduce QR complexity
  const qrData = JSON.stringify({
    id: participantId,
    type: 'JNIMUN',
    t: Math.floor(Date.now() / 1000) // Unix timestamp for compactness
  });
  
  // For now, return the data that will be used to generate QR
  // In the component, we'll use react-qr-code to generate the actual QR
  return qrData;
}

export function parseQRData(qrString: string): { id: string; type: string; timestamp: string } | null {
  try {
    const data = JSON.parse(qrString);
    // Support both old and new formats
    if ((data.type === 'JNIMUN_PARTICIPANT' || data.type === 'JNIMUN') && data.id) {
      return {
        id: data.id,
        type: data.type,
        timestamp: data.timestamp || (data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString())
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function downloadQRCode(canvas: HTMLCanvasElement, participantId: string): void {
  const link = document.createElement('a');
  link.download = `qr_${participantId}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
} 