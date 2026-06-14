const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ══════════════════════════════════════════
//  НАСТРОЙКИ — ЗАПОЛНИ ПЕРЕД ЗАПУСКОМ
// ══════════════════════════════════════════
const BOT_TOKEN   = 'ВСТАВЬ_ТОКЕН_БОТА';      // от @BotFather
const ADMIN_CHAT  = 'ВСТАВЬ_СВОЙ_CHAT_ID';    // от @userinfobot
const ADMIN_PWD   = 'mtv2025admin';
const PORT        = process.env.PORT || 3000;
const DATA_FILE   = path.join(__dirname, 'bookings.json');
// ══════════════════════════════════════════

// Хранилище броней
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Отправка сообщения в Telegram
function sendTelegram(text) {
  if (!BOT_TOKEN || BOT_TOKEN.includes('ВСТАВЬ')) return;
  const body = JSON.stringify({ chat_id: ADMIN_CHAT, text, parse_mode: 'HTML' });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  });
  req.write(body); req.end();
}

// Mime types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API ──────────────────────────────────
  if (pathname === '/api/bookings' && req.method === 'GET') {
    const data = loadData();
    // Return only booked IDs (no names/phones for guests)
    const publicData = {};
    for (const [k, v] of Object.entries(data)) {
      publicData[k] = { bookedAt: v.bookedAt }; // hide name/phone
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(publicData));
    return;
  }

  if (pathname === '/api/book' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { id, name, phone } = JSON.parse(body);
        const data = loadData();
        if (data[id]) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, taken: true }));
          return;
        }
        const bookedAt = new Date().toISOString();
        data[id] = { name, phone, bookedAt };
        saveData(data);

        // Telegram notification
        const type = id.startsWith('g') ? '👗 Девушка' : '👔 Парень';
        sendTelegram(
          `🎤 <b>Новая бронь!</b>\n\n` +
          `${type}\n` +
          `🎭 Образ: <b>${id}</b>\n` +
          `👤 Имя: <b>${name}</b>\n` +
          `📱 Телефон: <b>${phone}</b>\n` +
          `🕐 Время: ${new Date().toLocaleString('ru-RU')}`
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, bookedAt }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/cancel' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const { id } = JSON.parse(body);
      const data = loadData();
      delete data[id];
      saveData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (pathname === '/api/admin/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const { id, pwd } = JSON.parse(body);
      if (pwd !== ADMIN_PWD) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'forbidden' })); return;
      }
      const data = loadData();
      delete data[id];
      saveData(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // ── STATIC FILES ─────────────────────────
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  if (!ext) filePath = path.join(__dirname, 'index.html'); // SPA fallback

  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (e2, c2) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(c2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎤 MTV 2000s Party сервер запущен на порту ${PORT}`);
  console.log(`   Открой: http://localhost:${PORT}`);
  if (BOT_TOKEN.includes('ВСТАВЬ')) {
    console.log('\n⚠️  Не забудь вставить BOT_TOKEN и ADMIN_CHAT в server.js!');
  }
});
