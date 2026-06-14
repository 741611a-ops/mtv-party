const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const BOT_TOKEN  = process.env.BOT_TOKEN  || '';
const ADMIN_CHAT = process.env.ADMIN_CHAT || '';
const ADMIN_PWD  = process.env.ADMIN_PWD  || 'mtv2025admin';
const PORT       = process.env.PORT       || 3000;
const DATA_FILE  = path.join(__dirname, 'bookings.json');

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendTelegram(text) {
  if (!BOT_TOKEN) { console.log('[TG] BOT_TOKEN не задан'); return; }
  if (!ADMIN_CHAT) { console.log('[TG] ADMIN_CHAT не задан'); return; }
  const body = JSON.stringify({ chat_id: ADMIN_CHAT, text, parse_mode: 'HTML' });
  console.log('[TG] Отправка -> chat_id=' + ADMIN_CHAT);
  const req = https.request({
    hostname: 'api.telegram.org',
    path: '/bot' + BOT_TOKEN + '/sendMessage',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.ok) { console.log('[TG] Успешно отправлено!'); }
        else { console.error('[TG] Ошибка:', parsed.description); }
      } catch(e) { console.error('[TG] Ошибка парсинга:', data); }
    });
  });
  req.on('error', (e) => console.error('[TG] Сетевая ошибка:', e.message));
  req.write(body);
  req.end();
}

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

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (pathname === '/api/bookings' && req.method === 'GET') {
    const data = loadData();
    const publicData = {};
    for (const [k, v] of Object.entries(data)) {
      publicData[k] = { bookedAt: v.bookedAt };
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

        const type = id.startsWith('g') ? '👗 Девушка' : '👔 Парень';
        const idx = parseInt(id.split('-')[1]);
        sendTelegram(
          '🎤 <b>Новая бронь!</b>\n\n' +
          type + '\n' +
          '👤 Имя: <b>' + name + '</b>\n' +
          '📱 Телефон: <b>' + phone + '</b>\n' +
          '🕐 Время: ' + new Date().toLocaleString('ru-RU')
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
      try {
        const { id } = JSON.parse(body);
        const data = loadData();
        delete data[id];
        saveData(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/admin/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
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
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  if (!ext) filePath = path.join(__dirname, 'index.html');

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
  console.log('MTV 2000s Party запущен на порту ' + PORT);
  console.log('BOT_TOKEN задан: ' + (BOT_TOKEN ? 'ДА' : 'НЕТ'));
  console.log('ADMIN_CHAT задан: ' + (ADMIN_CHAT ? 'ДА' : 'НЕТ'));
});
