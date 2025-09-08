// pages/api/send.js
import nodemailer from 'nodemailer'

export const config = {
  api: {
    // زود الحجم لو محتاج (مثلاً '16mb')
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
    // قراءة متغيرات البيئة
    const host = process.env.SMTP_HOST || ''
    const portStr = process.env.SMTP_PORT || '465'
    const port = Number(portStr) || 465
    const user = process.env.SMTP_USER || ''
    const pass = process.env.SMTP_PASS || ''
    const to = process.env.MAIL_TO || ''

    // تحقق من المتغيرات (نطبع وجود القيم فقط وليس القيم نفسها لأمان)
    if (!host || !port || !user || !pass || !to) {
      console.error('Missing SMTP env vars', {
        hostExists: !!host,
        portExists: !!portStr,
        userExists: !!user,
        passExists: !!pass,
        toExists: !!to,
      })
      return res
        .status(500)
        .json({ error: 'Server misconfiguration: missing SMTP env vars' })
    }

    // parse data URL (data:[mime];base64,[data])
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid data URL' })
    }
    const mimeType = matches[1]
    const base64 = matches[2]
    const buffer = Buffer.from(base64, 'base64')

    // إعداد خيارات النقل بشكل مرن
    const transportOptions = {
      host,
      port,
      secure: port === 465, // true لو 465 (SMTPS)، false لو 587 (STARTTLS)
      auth: {
        user,
        pass,
      },
      // إذا واجهت مشاكل TLS/SSL أثناء الاختبار، مؤقتًا يمكن تفعيل هذا الحقل
      // لكن الأفضل تركه false للبيئة الحقيقية:
      // tls: { rejectUnauthorized: false },
    }

    const transporter = nodemailer.createTransport(transportOptions)

    // تحقق من الاتصال/المصادقة مبكراً لظهور أخطاء واضحة في اللوج
    try {
      await transporter.verify()
    } catch (verifyErr) {
      // طباعة تفاصيل مفيدة للـ debugging (بدون كشف الـ secrets)
      console.error('Transporter verify failed:', {
        message: verifyErr && verifyErr.message ? verifyErr.message : verifyErr,
        code: verifyErr && verifyErr.code ? verifyErr.code : undefined,
      })
      return res
        .status(500)
        .json({ error: 'SMTP auth/connection failed. Check credentials and host/port.' })
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

    // إرسال الإيميل
    await transporter.sendMail(mailOptions)

    return res.status(200).json({ ok: true })
  } catch (err) {
    // لوج تفصيلي للمطور - لا نُعيد تفاصيل حساسة للعميل
    console.error('Mailer error:', {
      message: err && err.message ? err.message : err,
      stack: err && err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : undefined,
    })
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
