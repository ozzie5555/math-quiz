'use strict';

const { json, readBody } = require('../lib/util');
const { finishAttempt } = require('../lib/game');

// POST /api/finish  { id }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  const id = body.id;
  if (!id) return json(res, 400, { error: 'id_kosong' });

  const result = await finishAttempt(id);
  if (!result.ok) return json(res, 404, { error: result.reason || 'notfound' });

  return json(res, 200, { ok: true });
};
