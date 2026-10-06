'use strict';

const { json, readBody } = require('../lib/util');
const { submitAnswer } = require('../lib/game');

// POST /api/answer  { id, questionId, option }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  const { id, questionId, option } = body;
  if (!id || questionId == null || option == null) {
    return json(res, 400, { error: 'data_kurang' });
  }

  const result = await submitAnswer(id, questionId, option);
  if (!result.ok) {
    const messages = {
      notfound: 'Sesi tidak ditemukan.',
      locked: 'Misi terkunci. Hubungi admin.',
      finished: 'Misi sudah selesai.',
      done: 'Semua soal sudah dijawab.',
      outofsync: 'Soal tidak sinkron, muat ulang halaman.',
      invalidoption: 'Pilihan tidak valid.',
    };
    return json(res, 400, { error: result.reason, message: messages[result.reason] || 'Gagal.' });
  }

  return json(res, 200, { ok: true, result });
};
