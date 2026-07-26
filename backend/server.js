import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import cron from "node-cron";
import FormData from "form-data";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || "";

// Serve frontend static files and add simple routes/redirects
const frontendDir = process.env.FRONTEND_DIR || path.join(__dirname, "../frontend");
app.use(express.static(frontendDir));

// Root serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Serve contacts page at /contacts and keep old URLs redirected to it
app.get('/contacts', (req, res) => {
  res.sendFile(path.join(frontendDir, 'contacts.html'));
});

// Redirect legacy contacts paths to the clean /contacts URL
app.get('/contact', (req, res) => res.redirect(301, '/contacts'));
app.get('/contacts.html', (req, res) => res.redirect(301, '/contacts'));

// Redirects for other old URLs to /contact
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/zayavka.html', (req, res) => res.redirect(301, '/contacts'));
app.get('/zayavka', (req, res) => res.redirect(301, '/contacts'));

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + file.originalname)
});
const upload = multer({ storage });

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const CHAT_ID = process.env.CHAT_ID || "";

app.post("/api/upload", upload.array("files", 10), async (req, res) => {
  try {
    const { name = "", phone = "", message = "", email2 = "" } = req.body || {};

    // verify reCAPTCHA (v3) using secret from env
    const recaptchaToken = req.body['g-recaptcha-response'] || "";
    if (RECAPTCHA_SECRET) {
      try {
        const verify = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
          params: { secret: RECAPTCHA_SECRET, response: recaptchaToken, remoteip: req.ip }
        });

        // v3: check score >= 0.5
        if (!verify.data || !verify.data.success || (verify.data.score !== undefined && verify.data.score < 0.5)) {
          console.log('reCAPTCHA v3 failed:', verify.data);
          // remove uploaded files if any
          if (req.files && req.files.length) {
            req.files.forEach(f => { try { fs.unlinkSync(path.join(uploadDir, f.filename)); } catch (e) { } });
          }
          return res.status(400).json({ ok: false, error: 'recaptcha_failed' });
        }
        console.log('reCAPTCHA v3 score:', verify.data.score);
      } catch (e) {
        console.error('reCAPTCHA verification error:', e);
        if (req.files && req.files.length) {
          req.files.forEach(f => { try { fs.unlinkSync(path.join(uploadDir, f.filename)); } catch (e) { } });
        }
        return res.status(500).json({ ok: false, error: 'recaptcha_error' });
      }
    } else {
      console.log('RECAPTCHA_SECRET not set — skipping reCAPTCHA verification');
    }

    if (email2 && email2.trim()) return res.json({ ok: true });

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const nowStr = now.toISOString().replace('T', ' ').split('.')[0];
    const requestId = `${Math.floor(now.getTime() / 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const caption = `📩 Заявка #${requestId}\n🕒 ${nowStr}\n\n👤 ${name}\n📞 ${phone}\n💬 ${message || "—"}`;

    const target = process.env.CHANNEL_ID || CHAT_ID;
    if (BOT_TOKEN && target) {
      if (req.files && req.files.length) {
        // send first file with caption
        const first = req.files[0];
        const form = new FormData();
        form.append('chat_id', target);
        form.append('document', fs.createReadStream(path.join(uploadDir, first.filename)));
        form.append('caption', caption);
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, form, { headers: form.getHeaders() });

        // send remaining files without caption
        if (req.files.length > 1) {
          await Promise.all(req.files.slice(1).map(file => {
            const f = new FormData();
            f.append('chat_id', target);
            f.append('document', fs.createReadStream(path.join(uploadDir, file.filename)));
            return axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, f, { headers: f.getHeaders() });
          }));
        }

        // duplicate: send text + files to personal chat if needed
        if (CHAT_ID && CHAT_ID !== target) {
          await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: CHAT_ID, text: caption });
          await Promise.all(req.files.map(file => {
            const f = new FormData();
            f.append('chat_id', CHAT_ID);
            f.append('document', fs.createReadStream(path.join(uploadDir, file.filename)));
            return axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, f, { headers: f.getHeaders() });
          }));
        }

      } else {
        // no files: single message
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: target, text: caption });
        if (CHAT_ID && CHAT_ID !== target) await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: CHAT_ID, text: caption });
      }
    } else {
      console.log('Skipping Telegram: BOT_TOKEN or target not set');
    }

    // Send email notification (tries SMTP when configured, otherwise sendmail)
    try {
      const notifyEmail = process.env.NOTIFY_EMAIL || 'mikhaylyuk2006@list.ru';
      const mailSubject = `Заявка #${requestId}`;
      const mailHtml = `
        <p>Заявка #${requestId}</p>
        <p>Время: ${nowStr}</p>
        <p>Имя: ${name}</p>
        <p>Телефон: ${phone}</p>
        <p>Сообщение: ${message || '—'}</p>
      `;

      console.log(`[MAIL DEBUG] Sending to: ${notifyEmail}`);
      console.log(`[MAIL DEBUG] SMTP Config:`, {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_SECURE: process.env.SMTP_SECURE,
        MAIL_FROM: process.env.MAIL_FROM
      });

      console.log('[MAIL DEBUG] Using SMTP transport with:');
      console.log({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        from: process.env.MAIL_FROM
      });

      let transporter;

      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          logger: true,
          debug: true
        });

        console.log('[SMTP] Transporter created successfully');
      } else {
        console.log('[SMTP] Missing SMTP config — cannot send email');
        throw new Error('SMTP config incomplete');
      }
      console.log('[SMTP DEBUG] Current config used by nodemailer:');
      console.log({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS // <-- вот он
        },
        from: process.env.MAIL_FROM
      });


      const attachments = (req.files || []).map(f => ({ filename: f.originalname || f.filename, path: path.join(uploadDir, f.filename) }));

      await transporter.sendMail({
        from: process.env.MAIL_FROM || `no-reply@${process.env.MAIL_DOMAIN || 'serious-company.online'}`,
        to: notifyEmail,
        subject: mailSubject,
        html: mailHtml,
        attachments
      });
      console.log(`[MAIL] ✓ Email sent to ${notifyEmail}`);
    } catch (e) {
      console.error('[MAIL ERROR]', e.message);
      console.error('[MAIL ERROR] Full error:', e);
    }

    res.json({ ok: true, id: requestId, time: nowStr });
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ ok: false });
  }
});

const MAX_FILE_AGE_DAYS = 3;
cron.schedule('0 3 * * *', () => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return console.error('Ошибка чтения uploads:', err);
    const now = Date.now();
    const maxAge = MAX_FILE_AGE_DAYS * 24 * 60 * 60 * 1000;
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > maxAge) fs.unlink(filePath, () => { });
      });
    });
  });
});

app.use((err, req, res, next) => { console.error('Unhandled error:', err); res.status(500).json({ ok: false }); });

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));

