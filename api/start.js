'use strict';

const { json, readBody, normalizeName, cleanName } = require('../lib/util');
const { createAttempt, getAttemptByName } = require('../lib/game');

// POST /api/start  { nama, absen }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  const nama = cleanName(body.nama);
  const absen = String(body.absen || '').trim();

  if (!nama || nama.length < 3) {
    return json(res, 400, { error: 'nama_tidak_valid', message: 'Nama lengkap minimal 3 karakter.' });
  }
  if (!absen) {
    return json(res, 400, { error: 'absen_kosong', message: 'Nomor absen wajib diisi.' });
  }

  const namaNorm = normalizeName(nama);

  // Cek duplikat lebih dulu (agar pesannya jelas).
  const existing = await getAttemptByName(namaNorm);
  if (existing) {
    if (existing.status === 'terkunci') {
      return json(res, 409, {
        error: 'nama_terkunci',
        message: 'Nama ini sedang terkunci. Hubungi admin untuk izin melanjutkan.',
      });
    }
    if (existing.status === 'selesai') {
      return json(res, 409, {
        error: 'nama_selesai',
        message: 'Nama ini sudah menyelesaikan kuis. Hubungi admin jika ingin mengulang.',
      });
    }
    return json(res, 409, {
      error: 'nama_duplikat',
      message: 'Nama ini sudah dipakai. Gunakan nama lain atau hubungi admin.',
    });
  }

  const created = await createAttempt({ nama, namaNorm, absen });
  if (!created.ok) {
    return json(res, 409, {
      error: 'nama_duplikat',
      message: 'Nama ini sudah dipakai. Gunakan nama lain atau hubungi admin.',
    });
  }

  return json(res, 200, {
    ok: true,
    id: created.attempt.id,
    nama: created.attempt.nama,
    absen: created.attempt.absen,
  });
};
