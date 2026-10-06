'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Lapisan database.
 * - Jika env TURSO_DATABASE_URL + TURSO_AUTH_TOKEN ada  -> pakai Turso (libSQL).
 * - Jika tidak (uji lokal)  -> pakai file SQLite via `node:sqlite` bawaan Node.
 *
 * Keduanya memakai antarmuka async yang sama:
 *   await q(sql, args)  -> { rows }
 *
 * Pola "read-then-write" tetap aman untuk 1 kelas karena UPDATE bersyarat
 * selalu memakai WHERE ... yang memastikan status tidak berubah.
 */

const isVercel = !!process.env.VERCEL;
const useTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let driver; // { q(sql, args) }

if (useTurso) {
  const { createClient } = require('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  driver = {
    async q(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return { rows: rs.rows };
    },
  };
} else {
  // Fallback lokal: SQLite file via node:sqlite (Node >= 22).
  const { DatabaseSync } = require('node:sqlite');
  const dbDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
  try {
    if (!isVercel) fs.mkdirSync(dbDir, { recursive: true });
  } catch {
    /* ignore */
  }
  const dbPath = isVercel ? '/tmp/spaceman-quiz.db' : path.join(dbDir, 'quiz.db');
  const db = new DatabaseSync(dbPath);

  driver = {
    async q(sql, args = []) {
      const stmt = db.prepare(sql);
      const upper = sql.trim().slice(0, 6).toUpperCase();
      if (upper === 'SELECT' || sql.trim().toUpperCase().startsWith('WITH')) {
        return { rows: stmt.all(...args) };
      }
      stmt.run(...args);
      return { rows: [] };
    },
  };
}

let schemaReady = null;

/** Buat tabel jika belum ada (sekali per instance). */
async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await driver.q(`
        CREATE TABLE IF NOT EXISTS attempts (
          id                TEXT PRIMARY KEY,
          nama              TEXT NOT NULL,
          nama_norm         TEXT NOT NULL,
          absen             TEXT NOT NULL,
          nilai             INTEGER DEFAULT 0,
          benar             INTEGER DEFAULT 0,
          status            TEXT NOT NULL DEFAULT 'mengerjakan',
          pelanggaran      INTEGER DEFAULT 0,
          ketinggian        INTEGER DEFAULT 0,
          current_question  INTEGER DEFAULT 0,
          question_order    TEXT NOT NULL,
          option_orders     TEXT NOT NULL,
          answers           TEXT NOT NULL DEFAULT '[]',
          created_at        INTEGER NOT NULL,
          updated_at        INTEGER NOT NULL
        )
      `);
      await driver.q(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_attempts_nama ON attempts (nama_norm)`
      );
    })();
  }
  return schemaReady;
}

/** Query utama. */
async function q(sql, args = []) {
  await ensureSchema();
  return driver.q(sql, args);
}

module.exports = { q, ensureSchema, useTurso, isVercel };
