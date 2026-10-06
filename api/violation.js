'use strict';

const { json, readBody } = require('../lib/util');
const { markViolation } = require('../lib/game');

// POST /api/violation  { id, reason }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  const id = body.id;
  if (!id) return json(res, 400, { error: 'id_kosong' });

  await markViolation(id);
  return json(res, 200, { ok: true, locked: true });
};
