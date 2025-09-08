// server.js
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(cors()); // تعطيل أو تقييد الدومينات في الإنتاج

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SEND_TO = process.env.SEND_TO_EMAIL;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SEND_TO) {
  console.warn('Please configure SMTP_HOST, SMTP_USER, SMTP_PASS, SEND_TO_EMAIL in .env');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for others
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { filename, image, consent, timestamp } = req.body;

    if (!consent) return res.status(400).json({ ok:false, message:'consent required' });

    if (!image || typeof image !== 'string' || !image.startsWith('data:')) {
      return res.status(400).json({ ok:false, message:'invalid image' });
    }

    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if(!matches) return res.status(400).json({ ok:false, message:'bad image format' });

    const mime = matches[1];
    const b64 = matches[2];
    const buffer = Buffer.from(b64, 'base64');

    // Optional: add basic rate-limit or storage before send
    const mailOptions = {
      from: `"Image Review" <${SMTP_USER}>`,
      to: SEND_TO,
      subject: `صورة جديدة للمراجعة - ${filename || 'unknown'}`,
      text: `تم رفع صورة للمراجعة.\nالوقت: ${timestamp || new Date().toISOString()}\nالاسم: ${filename || 'uploaded.jpg'}`,
      attachments: [{ filename: filename || 'uploaded.jpg', content: buffer, contentType: mime }]
    };

    const info = await transporter.sendMail(mailOptions);
    return res.json({ ok:true, message:'sent', info: info.messageId });
  } catch (err) {
    console.error('Server error', err);
    return res.status(500).json({ ok:false, message:'server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on port ${PORT}`));
