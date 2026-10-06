'use strict';

const { json, readBody } = require('../lib/util');
const { getPublicState } = require('../lib/game');

// POST /api/state  { id }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  const id = body.id;
  if (!id) return json(res, 400, { error: 'id_kosong' });

  const state = await getPublicState(id);
  if (!state) return json(res, 404, { error: 'notfound' });

  return json(res, 200, { ok: true, state });
};
