// api/upload.js (Vercel - improved)
import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: { sizeLimit: '12mb' } // غيّره لو محتاج
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok:false, message: 'Method not allowed' });
    return;
  }

  try {
    const { image, filename, consent, timestamp } = req.body ?? {};

    // optional: check consent if you require it
    if (!consent) {
      return res.status(400).json({ ok:false, message: 'consent required' });
    }

    if (!image || typeof image !== 'string' || !image.startsWith('data:')) {
      return res.status(400).json({ ok:false, message: 'invalid image format' });
    }

    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (!match) return res.status(400).json({ ok:false, message: 'bad image format' });

    const mime = match[1];
    const b64 = match[2];
    const buffer = Buffer.from(b64, 'base64');

    // server-side size guard
    const MAX_BYTES = Number(process.env.MAX_IMAGE_BYTES || 12 * 1024 * 1024);
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ ok:false, message: 'image too large' });
    }

    // ENV names: use GMAIL_USER / GMAIL_PASS or change them to what you set on Vercel
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    const dest = process.env.SEND_TO_EMAIL || user;

    if (!user || !pass || !dest) {
      console.error('Missing SMTP envs:', { user: !!user, pass: !!pass, dest: !!dest });
      return res.status(500).json({ ok:false, message: 'server not configured' });
    }

    // Create transporter (Gmail note: use App Password)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const mailOptions = {
      from: user,
      to: dest,
      subject: `New Photo — ${filename || 'uploaded.jpg'}`,
      text: `A new image was uploaded.\nTime: ${timestamp || new Date().toISOString()}\nFilename: ${filename || 'uploaded.jpg'}`,
      attachments: [{
        filename: filename || 'photo.png',
        content: b64,
        encoding: 'base64',
        contentType: mime
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ ok:true, message: 'sent', info: info.messageId });
  } catch (err) {
    console.error('upload handler error:', err);
    // لا تكشف معلومات حساسة للعميل
    return res.status(500).json({ ok:false, message: 'server error' });
  }
}
