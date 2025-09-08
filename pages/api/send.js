import nodemailer from 'nodemailer'


export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })


const { dataUrl, filename } = req.body || {}
if (!dataUrl) return res.status(400).json({ error: 'No image provided' })


try {
// extract base64
const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)
if (!matches) return res.status(400).json({ error: 'Invalid data URL' })
const mimeType = matches[1]
const base64 = matches[2]
const buffer = Buffer.from(base64, 'base64')


// setup transporter using SMTP env vars
const transporter = nodemailer.createTransport({
host: process.env.SMTP_HOST,
port: Number(process.env.SMTP_PORT || 465),
secure: true,
auth: {
user: process.env.SMTP_USER,
pass: process.env.SMTP_PASS,
}
})


// message
const mailOptions = {
from: process.env.SMTP_USER,
to: process.env.MAIL_TO,
subject: 'New image uploaded from ImageLab',
text: 'Attached is the edited image.',
attachments: [
{
filename: filename || 'edited.png',
content: buffer,
contentType: mimeType
}
]
}


// send mail
await transporter.sendMail(mailOptions)
return res.status(200).json({ ok: true })
} catch (err) {
console.error(err)
return res.status(500).json({ error: err.message || 'Server error' })
}
}