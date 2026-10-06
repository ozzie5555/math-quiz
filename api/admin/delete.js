'use strict';

const { json, readBody, isAdmin } = require('../../lib/util');
const { deleteAttempt } = require('../../lib/game');

// POST /api/admin/delete  { password, id }
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  const body = await readBody(req);
  if (!isAdmin(req, body)) return json(res, 401, { error: 'password_salah' });
  if (!body.id) return json(res, 400, { error: 'id_kosong' });

  await deleteAttempt(body.id);
  return json(res, 200, { ok: true });
};
