'use strict';

const { json, readBody } = require('../lib/util');
const { getResult } = require('../lib/game');
const { RUMUS_UTAMA } = require('../lib/questions');

// POST /api/result  { id }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  const id = body.id;
  if (!id) return json(res, 400, { error: 'id_kosong' });

  const result = await getResult(id);
  if (!result) return json(res, 404, { error: 'notfound' });

  return json(res, 200, { ok: true, result, rumusUtama: RUMUS_UTAMA });
};
