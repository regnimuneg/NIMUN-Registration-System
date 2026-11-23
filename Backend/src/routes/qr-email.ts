/**
 * Email each OC member their QR code (OC Conference '27).
 *
 * Sends through Resend (https://resend.com). Needs these environment variables:
 *   RESEND_API_KEY     API key from Resend
 *   QR_EMAIL_FROM      sender, e.g. "NIMUN'27 <registration@nimuneg.org>" (domain verified in Resend)
 *   QR_EMAIL_ENABLED   must be "true" before real participants can be emailed.
 *                      Until then only test emails (testTo) go out.
 *
 * POST /api/qr-email { testTo, participantId? }  one test email to testTo (participant's QR, or PRS-01)
 * POST /api/qr-email { participantId }           that person's QR to their own email
 * POST /api/qr-email { all: true }               every OC member with an email
 * GET  /api/qr-email/status
 */
import express, { type Request, type Response } from 'express'
import { query } from '../config/index.js'
import { makeQrPngOnWhite } from '../lib/qr-image.js'

const router = express.Router()

const apiKey = () => process.env.RESEND_API_KEY || ''
const fromAddr = () => process.env.QR_EMAIL_FROM || "NIMUN'27 <onboarding@resend.dev>"
const enabled = () => process.env.QR_EMAIL_ENABLED === 'true'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
// IDs that must never be emailed a QR code (UNI-03 was left out on request).
// QR_EMAIL_EXCLUDE can add more, comma separated.
const excluded = () => new Set(['UNI-03', ...(process.env.QR_EMAIL_EXCLUDE || '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)])

interface Person { id: string; first_name: string; last_name: string; email: string | null; council: string | null }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function emailHtml(p: Person) {
  return `<!doctype html><html><body style="margin:0;background:#f3ece4;font-family:Consolas,'Courier New',monospace;color:#202020">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ece4;padding:24px 0"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#faf6f0;border:2px solid #202020">
    <tr><td style="background:#183591;color:#f3ece4;padding:22px 24px;font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:1px">NIMUN'27</td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 12px;font-size:16px">Hi ${esc(p.first_name)},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5">Here is your QR code for the OC Conference, 24 to 27 November. Show it at the registration desk every day, and at the food point on Conference Day.</p>
      <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:2px">Your ID</p>
      <p style="margin:0 0 16px;font-family:'Arial Black',Arial,sans-serif;font-size:28px;color:#183591">${esc(p.id)}</p>
      <p style="margin:0 0 8px;text-align:center"><img src="cid:qr" width="260" height="260" alt="QR code for ${esc(p.id)}" style="border:1.5px solid #202020"></p>
      <p style="margin:16px 0 0;font-size:13px;color:#55524d">The QR code is also attached. Save it to your phone so it works without signal.</p>
    </td></tr>
  </table></td></tr></table></body></html>`
}

async function sendOne(p: Person, to: string) {
  const png = await makeQrPngOnWhite(p.id)
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddr(),
      to: [to],
      subject: `Your NIMUN'27 QR code (${p.id})`,
      html: emailHtml(p),
      text: `Hi ${p.first_name},\n\nYour NIMUN'27 OC Conference ID is ${p.id}. Your QR code is attached. Show it at registration every day and at the food point on Conference Day.`,
      attachments: [{ filename: `${p.id}.png`, content: png.toString('base64'), content_id: 'qr' }],
    }),
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`Email service refused (${r.status}) ${body.slice(0, 200)}`)
  }
}

const PEOPLE_SQL = `
  SELECT m.id, u.first_name, u.last_name, u.email, substring(m.role from '^OC Member \\((.*)\\)$') AS council
  FROM members m JOIN users u ON u.id = m.user_id
  WHERE m.role LIKE 'OC Member (%' AND NOT m.inactive`

router.get('/status', (_req: Request, res: Response) => {
  res.json({ configured: !!apiKey(), enabled: enabled(), from: fromAddr(), excluded: [...excluded()] })
})

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!apiKey()) {
      return res.status(503).json({ error: 'Email is not set up yet. Add RESEND_API_KEY in Vercel first.' })
    }
    const { participantId, all, testTo } = req.body ?? {}

    // Test email: always allowed (to one address the admin types)
    if (testTo) {
      if (typeof testTo !== 'string' || !EMAIL_RE.test(testTo)) return res.status(400).json({ error: 'That test address looks wrong' })
      const id = typeof participantId === 'string' && participantId ? participantId.toUpperCase() : 'PRS-01'
      const r = await query(`${PEOPLE_SQL} AND m.id = $1`, [id])
      const p: Person = (r.rows[0] as Person | undefined) ?? { id, first_name: 'there', last_name: '', email: null, council: null }
      await sendOne(p, testTo)
      return res.json({ success: true, sent: 1, test: true, to: testTo })
    }

    if (!enabled()) {
      return res.status(403).json({ error: 'Real emails are switched off until the test email is approved (QR_EMAIL_ENABLED).' })
    }

    let people: Person[]
    if (all === true) {
      people = (await query(`${PEOPLE_SQL} ORDER BY m.id`)).rows as Person[]
    } else if (typeof participantId === 'string' && participantId) {
      people = (await query(`${PEOPLE_SQL} AND m.id = $1`, [participantId.toUpperCase()])).rows as Person[]
      if (people.length === 0) return res.status(404).json({ error: 'No OC member with that ID' })
    } else {
      return res.status(400).json({ error: 'Give participantId, all or testTo' })
    }

    const ex = excluded()
    if (people.length === 1 && ex.has(people[0].id)) return res.status(403).json({ error: `${people[0].id} is on the do-not-send list` })
    const skipped = people.filter((p) => ex.has(p.id) || !p.email || !EMAIL_RE.test(p.email)).map((p) => p.id)
    const todo = people.filter((p) => !ex.has(p.id) && p.email && EMAIL_RE.test(p.email))
    const failed: { id: string; error: string }[] = []
    let sent = 0
    // A few at a time to stay inside the email service's rate limit
    for (let i = 0; i < todo.length; i += 4) {
      await Promise.all(todo.slice(i, i + 4).map(async (p) => {
        try { await sendOne(p, p.email!); sent++ } catch (e: any) { failed.push({ id: p.id, error: e?.message ?? 'failed' }) }
      }))
      if (i + 4 < todo.length) await new Promise((r) => setTimeout(r, 1100))
    }
    console.log(`QR email by ${req.auth?.memberId}: sent ${sent}, skipped ${skipped.length}, failed ${failed.length}`)
    res.json({ success: failed.length === 0, sent, skipped, failed })
  } catch (error: any) {
    console.error('QR email error:', error)
    res.status(500).json({ error: error?.message || 'Failed to send' })
  }
})

export default router
