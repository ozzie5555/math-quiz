'use strict';

/** Kirim respons JSON. */
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

/** Baca body JSON dari request (Vercel otomatis parse, dev-server manual). */
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Normalisasi nama untuk deteksi duplikat (huruf kecil, spasi rapi). */
function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Bersihkan nama untuk ditampilkan (trim + spasi tunggal). */
function cleanName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Cek password admin dari header atau body. */
function isAdmin(req, body) {
  const expected = process.env.ADMIN_PASSWORD || 'Krisna17#';
  const header = req.headers && (req.headers['x-admin-password'] || req.headers['X-Admin-Password']);
  const candidate = header || (body && body.password) || '';
  return String(candidate) === String(expected);
}

/** Acak array (Fisher-Yates). */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  json,
  readBody,
  normalizeName,
  cleanName,
  isAdmin,
  shuffle,
};
