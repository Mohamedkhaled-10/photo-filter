// api/upload-nodemailer.js  (Vercel Serverless, ES module)
import nodemailer from 'nodemailer';

export const config = {
  api: {
    bodyParser: { sizeLimit: '12mb' } // اضبط الحجم هنا حسب حاجتك
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, message:'Method not allowed' });

  try {
    const { filename, image, consent, timestamp } = req.body ?? {};

    // التحقق من الموافقة
    if (!consent) return res.status(400).json({ ok:false, message:'consent required' });

    if (!image || typeof image !== 'string' || !image.startsWith('data:')) {
      return res.status(400).json({ ok:false, message:'invalid image' });
    }

    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ ok:false, message:'bad image format' });

    const mime = matches[1];
    const b64 = matches[2];
    const buffer = Buffer.from(b64, 'base64');

    // transporter (اعتمد متغيرات البيئة في Vercel)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    // optional: يمكنك إضافة rate-limit هنا إذا رغبت (انظر ملاحظات)
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
    console.error('upload-nodemailer error:', err);
    return res.status(500).json({ ok:false, message:'server error' });
  }
}
