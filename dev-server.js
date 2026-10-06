'use strict';

/**
 * dev-server.js — server lokal untuk uji coba (BUKAN untuk produksi).
 * Menjalankan API serverless + menyajikan folder public/ persis seperti Vercel.
 *
 *   node dev-server.js   -> http://localhost:3000
 *
 * Tanpa TURSO_* di .env.local, otomatis memakai SQLite lokal (data/quiz.db).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---------------------------- load .env.local ---------------------------- */
function loadEnv() {
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const API_DIR = path.join(process.cwd(), 'api');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Route bersih -> file html. */
function resolveStatic(urlPath) {
  let rel = urlPath.split('?')[0];
  if (rel === '/' || rel === '') rel = '/index.html';
  if (rel === '/quiz' || rel === '/quiz/') rel = '/quiz.html';
  if (rel === '/result' || rel === '/result/') rel = '/result.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';

  const filePath = path.join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) return null; // cegah path traversal
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;

  // fallback: /quiz.html untuk /quiz
  const withHtml = filePath + '.html';
  if (fs.existsSync(withHtml)) return withHtml;
  return null;
}

/** Muat handler API (module.exports = async (req,res)). */
function loadHandler(urlPath) {
  // /api/admin/scores -> api/admin/scores.js
  const rel = urlPath.replace(/^\/api\//, '').replace(/\/$/, '');
  const file = path.join(API_DIR, rel + '.js');
  if (!file.startsWith(API_DIR)) return null;
  if (!fs.existsSync(file)) return null;
  // Hot-reload: buang cache api/ + lib/ setiap request.
  clearProjectCache();
  return require(file);
}

/** Buang cache modul project sendiri agar perubahan langsung terlihat. */
function clearProjectCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(API_DIR) || key.includes(path.sep + 'lib' + path.sep)) {
      delete require.cache[key];
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // ---- API ----
  if (pathname.startsWith('/api/')) {
    const handler = loadHandler(pathname);
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'not_found', path: pathname }));
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[api error]', pathname, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify({ error: 'server_error', message: String(err && err.message) }));
    }
    return;
  }

  // ---- static ----
  const filePath = resolveStatic(pathname);
  if (!filePath) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Not Found');
    return;
  }
  const ext = path.extname(filePath);
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  const nets = require('os').networkInterfaces();
  const localIPs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) localIPs.push(net.address);
    }
  }
  const dbMode = process.env.TURSO_DATABASE_URL ? 'Turso (cloud)' : 'SQLite lokal (data/quiz.db)';
  console.log('\n🧑‍🚀 Spaceman Math Quest — server lokal berjalan');
  console.log('   Database     : ' + dbMode);
  console.log('   Admin        : http://localhost:' + PORT + '/admin   (password: ' + (process.env.ADMIN_PASSWORD || 'Krisna17#') + ')');
  console.log('   Siswa (lokal): http://localhost:' + PORT);
  if (localIPs.length) {
    console.log('   Siswa (LAN)  : http://' + localIPs[0] + ':' + PORT);
  }
  console.log('');
});
