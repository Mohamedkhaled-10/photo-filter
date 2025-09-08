// pages/api/send.js
import { Resend } from 'resend'

// أنشئ نسخة من Resend باستخدام API Key من متغير البيئة
const resend = new Resend(process.env.RESEND_API_KEY)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // علشان الصور ما تعملش مشكلة
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dataUrl, filename } = req.body || {}
  if (!dataUrl) {
    return res.status(400).json({ error: 'No image provided' })
  }

  // نفك Base64 من الـ dataUrl
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!matches) {
    return res.status(400).json({ error: 'Invalid data URL' })
  }

  const mimeType = matches[1]
  const base64 = matches[2]
  const buffer = Buffer.from(base64, 'base64')

  try {
    // إرسال الإيميل عبر Resend
    await resend.emails.send({
      from: 'ImageLab <onboarding@resend.dev>', // لازم دومين موثوق بعد التجربة
      to: process.env.MAIL_TO, // إيميلك اللي هتستقبل عليه
      subject: `New image uploaded: ${filename || 'edited.png'}`,
      html: `<p>Attached is the edited image from <strong>ImageLab</strong>.</p>`,
      attachments: [
        {
          filename: filename || 'edited.png',
          content: buffer,
          contentType: mimeType,
        },
      ],
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Resend error:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
