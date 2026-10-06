'use strict';

const { json, readBody, isAdmin } = require('../../lib/util');
const { listAttempts } = require('../../lib/game');

// POST /api/admin/scores  { password }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  if (!isAdmin(req, body)) return json(res, 401, { error: 'password_salah', message: 'Password admin salah.' });

  const attempts = await listAttempts();
  const byScore = attempts.slice().sort((a, b) => b.nilai - a.nilai || a.updated_at - b.updated_at);
  const scoreboard = byScore.map((a, i) => ({ ...a, rank: i + 1 }));

  return json(res, 200, { ok: true, attempts, scoreboard });
};
