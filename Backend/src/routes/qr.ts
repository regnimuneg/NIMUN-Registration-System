import express, { type Request, type Response } from 'express'
import { query } from '../config'
import QRCode from 'qrcode'
import sharp from 'sharp'

const router = express.Router()

// Generate QR code
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { participantId } = req.body

    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' })
    }

    // Generate QR code - store just the participant ID (schema has VARCHAR(100) limit)
    // QR code will be generated on-the-fly from the ID
    const qrCodeValue = participantId

    // Check if participant is delegate or member
    const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [participantId])
    const memberCheck = await query('SELECT id FROM members WHERE id = $1', [participantId])
    
    if (delegateCheck.rows.length > 0) {
      // Update QR code in delegates table (store ID, not data URL)
      await query(`
        UPDATE delegates SET qr_code = $1 WHERE id = $2
      `, [qrCodeValue, participantId])
    } else if (memberCheck.rows.length > 0) {
      // Members don't have qr_code field in schema, but we can still generate QR codes
      // The QR code will be generated and returned, just not stored in the database
      console.log(`[QR] Generated QR code for member: ${participantId}`)
    } else {
      return res.status(404).json({ error: 'Participant not found' })
    }

    // Generate QR code buffer first with white background
    const qrBuffer = await QRCode.toBuffer(participantId, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#195F8C', // RGB(25, 95, 140) from generate_qrcodes.py
        light: '#FFFFFF'
      }
    })

    // Process with sharp to make white background transparent
    // Similar to Python script: replace white pixels (RGB > 200) with transparent
    const { data, info } = await sharp(qrBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = new Uint8Array(data)
    const fillColor = [25, 95, 140, 255] // #195F8C with full opacity
    
    // Process each pixel
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      
      // If pixel is white/light (RGB > 200), make it transparent
      if (r > 200 && g > 200 && b > 200) {
        pixels[i + 3] = 0 // Set alpha to 0 (transparent)
      } else {
        // Set QR code color to #195F8C (25, 95, 140)
        pixels[i] = fillColor[0]
        pixels[i + 1] = fillColor[1]
        pixels[i + 2] = fillColor[2]
        pixels[i + 3] = fillColor[3]
      }
    }
    
    // Convert back to PNG with transparency
    const final = await sharp(pixels, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
      .png()
      .toBuffer()

    // Convert to data URL
    const base64 = final.toString('base64')
    const qrData = `data:image/png;base64,${base64}`

    res.json({
      success: true,
      qrUrl: qrData,
      participantId
    })
  } catch (error) {
    console.error('QR generation error:', error)
    res.status(500).json({ error: 'Failed to generate QR code' })
  }
})

// Bulk QR generation
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { participantIds } = req.body

    if (!Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'participantIds must be an array' })
    }

    const results = []
    for (const participantId of participantIds) {
      try {
        // Check if delegate or member
        const delegateCheck = await query('SELECT id FROM delegates WHERE id = $1', [participantId])
        const memberCheck = await query('SELECT id FROM members WHERE id = $1', [participantId])
        
        if (delegateCheck.rows.length > 0) {
          // Store just the ID (schema limitation) for delegates
          await query(`
            UPDATE delegates SET qr_code = $1 WHERE id = $2
          `, [participantId, participantId])
        } else if (memberCheck.rows.length > 0) {
          // Members don't have qr_code field, but we can still generate QR codes
          console.log(`[QR] Generated QR code for member: ${participantId}`)
        } else {
          results.push({ participantId, success: false, error: 'Participant not found' })
          continue
        }

        // Generate QR code with transparent background
        const qrBuffer = await QRCode.toBuffer(participantId, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          margin: 1,
          color: {
            dark: '#195F8C',
            light: '#FFFFFF'
          }
        })

        // Process with sharp to make white background transparent
        const { data, info } = await sharp(qrBuffer)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })

        const pixels = new Uint8Array(data)
        const fillColor = [25, 95, 140, 255]
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          
          if (r > 200 && g > 200 && b > 200) {
            pixels[i + 3] = 0
          } else {
            pixels[i] = fillColor[0]
            pixels[i + 1] = fillColor[1]
            pixels[i + 2] = fillColor[2]
            pixels[i + 3] = fillColor[3]
          }
        }
        
        const final = await sharp(pixels, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
          .png()
          .toBuffer()

        const base64 = final.toString('base64')
        const qrData = `data:image/png;base64,${base64}`

        results.push({ participantId, success: true, qrUrl: qrData })
      } catch (error) {
        results.push({ participantId, success: false, error: String(error) })
      }
    }

    res.json({ success: true, results })
  } catch (error) {
    console.error('Bulk QR generation error:', error)
    res.status(500).json({ error: 'Failed to generate QR codes' })
  }
})

// External QR scan (for image upload)
router.post('/external-scan', async (req: Request, res: Response) => {
  try {
    // This would require a QR code scanning library
    // For now, return an error suggesting client-side scanning
    res.status(501).json({
      error: 'External QR scanning not yet implemented. Use client-side scanning instead.'
    })
  } catch (error) {
    console.error('External QR scan error:', error)
    res.status(500).json({ error: 'Failed to scan QR code' })
  }
})

export default router
