# ImageLab — موقع تعديل صور بسيط


## متطلبات
- Node.js 18+ و npm
- حساب على Vercel لنشر المشروع (اختياري لكن مفضل)


## تثبيت وتشغيل محلياً
1. انسخ المشروع
2. انسخ ملف `.env.example` إلى `.env.local` واملأ المتغيرات:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- MAIL_TO
3. ثم:
```bash
npm install
npm run dev