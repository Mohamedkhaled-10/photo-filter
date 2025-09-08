// api/upload.js  (Vercel / Serverless - ES module)
import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: { sizeLimit: '12mb' } // اضبط الحجم حسب حاجتك
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, message:'Method not allowed' });

  try {
    const { filename, image, consent, timestamp } = req.body ?? {};

    if (!consent) return res.status(400).json({ ok:false, message:'consent required' });
    if (!image || typeof image !== 'string' || !image.startsWith('data:')) {
      return res.status(400).json({ ok:false, message:'invalid image' });
    }

    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ ok:false, message:'bad image format' });

    const mime = matches[1];
    const b64 = matches[2];
    const buffer = Buffer.from(b64, 'base64');

    // size limit server-side (safety)
    const maxBytes = 12 * 1024 * 1024; // 12 MB
    if (buffer.length > maxBytes) {
      return res.status(413).json({ ok:false, message:'image too large' });
    }

    // transporter
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SEND_TO_EMAIL) {
      console.error('Missing SMTP env vars');
      return res.status(500).json({ ok:false, message:'server not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const mailOptions = {
      from: `"Image Review" <${process.env.SMTP_USER}>`,
      to: process.env.SEND_TO_EMAIL,
      subject: `صورة للمراجعة — ${filename || 'uploaded.jpg'}`,
      text: `تم رفع صورة للمراجعة.\nالوقت: ${timestamp || new Date().toISOString()}\nالاسم: ${filename || 'uploaded.jpg'}`,
      attachments: [{ filename: filename || 'uploaded.jpg', content: buffer, contentType: mime }]
    };

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ ok:true, message:'sent', info: info.messageId });
  } catch (err) {
    console.error('upload error:', err);
    return res.status(500).json({ ok:false, message:'server error' });
  }
}
