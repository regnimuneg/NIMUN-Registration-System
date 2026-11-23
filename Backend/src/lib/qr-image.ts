import QRCode from 'qrcode'
import sharp from 'sharp'

const QR_COLOR = { r: 25, g: 95, b: 140 } // #195F8C, same as the NIMUN'26 QR codes

/** PNG of a QR code that holds only the ID: coloured modules, transparent background. */
export async function makeQrPng(id: string): Promise<Buffer> {
  const qr = await QRCode.toBuffer(id, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 20,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const { data, info } = await sharp(qr).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const light = data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200
    if (light) {
      data[i + 3] = 0
    } else {
      data[i] = QR_COLOR.r
      data[i + 1] = QR_COLOR.g
      data[i + 2] = QR_COLOR.b
      data[i + 3] = 255
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}

/** Same QR on a white square, for email clients that show transparent PNGs on dark backgrounds. */
export async function makeQrPngOnWhite(id: string): Promise<Buffer> {
  const png = await makeQrPng(id)
  return sharp(png).flatten({ background: '#ffffff' }).extend({ top: 40, bottom: 40, left: 40, right: 40, background: '#ffffff' }).png().toBuffer()
}
