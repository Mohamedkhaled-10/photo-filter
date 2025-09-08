// pages/api/send.js
import nodemailer from 'nodemailer'

export const config = {
  api: {
    // زوّد هذا لو الصور كبيرة (مثال 8mb). عدّل حسب حاجتك.
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dataUrl, filename } = req.body || {}
  if (!dataUrl) return res.status(400).json({ error: 'No image provided' })

  try {
    // validate env
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 465)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const to = process.env.MAIL_TO

    if (!host || !port || !user || !pass || !to) {
      console.error('Missing SMTP env vars', { host, port, user, !!pass, to })
      return res.status(500).json({ error: 'Server misconfiguration: missing SMTP env vars' })
    }

    // parse data URL
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid data URL' })
    }
    const mimeType = matches[1]
    const base64 = matches[2]
    const buffer = Buffer.from(base64, 'base64')

    // create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports (587)
      auth: { user, pass },
    })

    // Verify transporter connection (helps surface auth errors early)
    try {
      await transporter.verify()
    } catch (verifyErr) {
      console.error('Transporter verify failed:', verifyErr)
      return res.status(500).json({ error: 'SMTP auth/connection failed. Check credentials.' })
    }

    const mailOptions = {
      from: `"ImageLab" <${user}>`,
      to,
      subject: `New image uploaded: ${filename || 'edited.png'}`,
      text: 'Attached is the edited image from ImageLab.',
      attachments: [
        {
          filename: filename || 'edited.png',
          content: buffer,
          contentType: mimeType,
        },
      ],
    }

    await transporter.sendMail(mailOptions)

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Mailer error:', err)
    // لا ترجع تفاصيل حساسة للعميل — بس رسالة عامة وكافية للـ debug في اللوج
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
