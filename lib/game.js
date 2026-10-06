'use strict';

const crypto = require('crypto');
const { q } = require('./db');
const {
  getAllQuestions,
  getQuestionById,
  questionCount,
  PHASE_HAVING,
  PHASE_FINISHED,
  PHASE_LOCKED,
} = require('./questions');
const { shuffle } = require('./util');

/** Tangga ketinggian 0..10 (index = jumlah jawaban benar). */
const LEVELS = [
  { km: 0, label: 'Landasan Bulan' },
  { km: 10000, label: 'Awan Stratosfer' },
  { km: 20000, label: 'Tepi Atmosfer' },
  { km: 30000, label: 'Orbit Rendah' },
  { km: 40000, label: 'Sabuk Bintang' },
  { km: 50000, label: 'Ruang Antarbintang' },
  { km: 60000, label: 'Jalur Komet' },
  { km: 70000, label: 'Cincin Planet' },
  { km: 80000, label: 'Orbit Tinggi' },
  { km: 90000, label: 'Nebula Terang' },
  { km: 100000, label: 'Puncak Angkasa' },
];

/** Buat urutan pilihan teracak untuk tiap soal (disimpan agar konsisten saat resume). */
function buildOptionOrders(questions) {
  const map = {};
  for (const qq of questions) {
    map[qq.id] = shuffle(qq.options);
  }
  return map;
}

function levelFor(benar) {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, Number(benar) || 0));
  return { level: idx, ...LEVELS[idx] };
}

/** Poin dasar & aturan streak. */
const BASE_POINTS = 1000;

/**
 * Poin untuk jawaban benar berturut-turut ke-`streak`.
 * streak 1 -> 1000 (x1), streak 2 -> 2000 (x2), streak 3 -> 4000 (x4), ...
 */
function pointsForStreak(streak) {
  const s = Math.max(1, Number(streak) || 1);
  return BASE_POINTS * Math.pow(2, s - 1);
}

/** Multiplier tampil untuk streak tertentu (streak 1 -> x1). */
function multiplierForStreak(streak) {
  return Math.pow(2, Math.max(0, (Number(streak) || 1) - 1));
}

/** Ambil attempt berdasarkan id. */
async function getAttempt(id) {
  const { rows } = await q('SELECT * FROM attempts WHERE id = ?', [String(id)]);
  return rows[0] || null;
}

/** Ambil attempt berdasarkan nama ternormalisasi. */
async function getAttemptByName(namaNorm) {
  const { rows } = await q('SELECT * FROM attempts WHERE nama_norm = ?', [String(namaNorm)]);
  return rows[0] || null;
}

/** Buat attempt baru. Mengembalikan { ok, reason, attempt }. */
async function createAttempt({ nama, namaNorm, absen }) {
  const existing = await getAttemptByName(namaNorm);
  if (existing) {
    return { ok: false, reason: 'exists', existing };
  }

  const questions = getAllQuestions();
  const order = shuffle(questions.map((x) => x.id));
  const optionOrders = buildOptionOrders(questions);
  const now = Date.now();
  const id = crypto.randomUUID();

  await q(
    `INSERT INTO attempts
      (id, nama, nama_norm, absen, nilai, benar, score, streak, max_streak, status,
       pelanggaran, ketinggian, current_question, question_order, option_orders, answers,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 0, 0, 0, ?, ?, '[]', ?, ?)`,
    [
      id,
      nama,
      namaNorm,
      String(absen),
      PHASE_HAVING,
      JSON.stringify(order),
      JSON.stringify(optionOrders),
      now,
      now,
    ]
  );

  const attempt = await getAttempt(id);
  return { ok: true, attempt };
}

function parseAttempt(attempt) {
  if (!attempt) return null;
  return {
    ...attempt,
    question_order: JSON.parse(attempt.question_order),
    option_orders: JSON.parse(attempt.option_orders),
    answers: JSON.parse(attempt.answers),
  };
}

/**
 * State publik untuk siswa (TIDAK membocorkan kunci jawaban).
 * Mengembalikan info misi + soal yang sedang aktif (jika status mengerjakan).
 */
async function getPublicState(id) {
  const raw = await getAttempt(id);
  if (!raw) return null;
  const attempt = parseAttempt(raw);

  const total = questionCount();
  const answers = attempt.answers;
  const answeredCount = answers.length;
  const idx = attempt.current_question;
  const lv = levelFor(attempt.benar);

  const state = {
    id: attempt.id,
    nama: attempt.nama,
    absen: attempt.absen,
    status: attempt.status,
    pelanggaran: attempt.pelanggaran,
    benar: attempt.benar,
    nilai: attempt.nilai,
    score: Number(attempt.score) || 0,
    streak: Number(attempt.streak) || 0,
    maxStreak: Number(attempt.max_streak) || 0,
    answeredCount,
    total,
    level: lv.level,
    km: lv.km,
    label: lv.label,
    levels: LEVELS,
    question: null,
  };

  if (attempt.status === PHASE_HAVING && idx < total) {
    const qid = attempt.question_order[idx];
    const soal = getQuestionById(qid);
    state.question = {
      number: idx + 1,
      id: soal.id,
      text: soal.text,
      options: attempt.option_orders[soal.id],
    };
  }

  return state;
}

/** Proses jawaban. Mengembalikan { ok, reason, correct, ... }. */
async function submitAnswer(id, questionId, option) {
  const raw = await getAttempt(id);
  if (!raw) return { ok: false, reason: 'notfound' };
  const attempt = parseAttempt(raw);

  if (attempt.status === PHASE_LOCKED) return { ok: false, reason: 'locked' };
  if (attempt.status === PHASE_FINISHED) return { ok: false, reason: 'finished' };

  const total = questionCount();
  const idx = attempt.current_question;
  if (idx >= total) return { ok: false, reason: 'done' };

  const expectedQid = attempt.question_order[idx];
  if (Number(questionId) !== Number(expectedQid)) {
    return { ok: false, reason: 'outofsync' };
  }

  const soal = getQuestionById(expectedQid);
  const chosen = String(option);
  const validOption = attempt.option_orders[soal.id].some((o) => String(o) === chosen);
  if (!validOption) return { ok: false, reason: 'invalidoption' };

  const correct = chosen === soal.answer;

  const answers = attempt.answers.slice();
  answers.push({ qid: soal.id, chosen, correct });

  const benar = answers.filter((a) => a.correct).length;
  const nextIdx = idx + 1;
  const finishedNow = nextIdx >= total;

  const nilai = Math.round((benar / total) * 100);
  const status = finishedNow ? PHASE_FINISHED : PHASE_HAVING;
  const now = Date.now();

  // ---- Sistem poin streak (COMBO) ----
  const prevStreak = Number(attempt.streak) || 0;
  const prevScore = Number(attempt.score) || 0;
  const prevMaxStreak = Number(attempt.max_streak) || 0;

  let streak = prevStreak;
  let points = 0;
  if (correct) {
    streak = prevStreak + 1;
    points = pointsForStreak(streak);
  } else {
    streak = 0; // salah -> rantai kelipatan direset
    points = 0; // poin tidak berkurang
  }
  const score = prevScore + points;
  const maxStreak = Math.max(prevMaxStreak, streak);
  const multiplier = correct ? multiplierForStreak(streak) : 0;

  await q(
    `UPDATE attempts
        SET answers = ?, benar = ?, nilai = ?, score = ?, streak = ?, max_streak = ?,
            current_question = ?, status = ?, updated_at = ?
      WHERE id = ? AND status = 'mengerjakan'`,
    [
      JSON.stringify(answers),
      benar,
      nilai,
      score,
      streak,
      maxStreak,
      nextIdx,
      status,
      now,
      attempt.id,
    ]
  );

  const lv = levelFor(benar);
  return {
    ok: true,
    correct,
    correctAnswer: soal.answer,
    chosen,
    benar,
    answeredCount: answers.length,
    total,
    finished: finishedNow,
    level: lv.level,
    km: lv.km,
    label: lv.label,
    // ---- poin ----
    points,
    score,
    streak,
    multiplier,
    maxStreak,
  };
}

/** Tandai pelanggaran -> kunci attempt. */
async function markViolation(id) {
  const raw = await getAttempt(id);
  if (!raw) return { ok: false, reason: 'notfound' };
  if (raw.status === PHASE_FINISHED) return { ok: false, reason: 'finished' };

  await q(
    `UPDATE attempts
        SET status = ?, pelanggaran = pelanggaran + 1, updated_at = ?
      WHERE id = ? AND status != 'selesai'`,
    [PHASE_LOCKED, Date.now(), String(id)]
  );
  return { ok: true };
}

/** Selesaikan paksa (mis. saat semua soal habis / siswa menekan selesai). */
async function finishAttempt(id) {
  const raw = await getAttempt(id);
  if (!raw) return { ok: false, reason: 'notfound' };
  const attempt = parseAttempt(raw);
  if (attempt.status === PHASE_FINISHED) return { ok: true, alreadyFinished: true };

  const total = questionCount();
  const benar = attempt.answers.filter((a) => a.correct).length;
  const nilai = Math.round((benar / total) * 100);

  await q(
    `UPDATE attempts SET status = ?, nilai = ?, benar = ?, current_question = ?, updated_at = ?
      WHERE id = ?`,
    [PHASE_FINISHED, nilai, benar, total, Date.now(), attempt.id]
  );
  return { ok: true };
}

/** Beri izin lanjut (admin). */
async function unlockAttempt(id) {
  const raw = await getAttempt(id);
  if (!raw) return { ok: false, reason: 'notfound' };
  await q(
    `UPDATE attempts SET status = 'mengerjakan', updated_at = ? WHERE id = ?`,
    [Date.now(), String(id)]
  );
  return { ok: true };
}

/** Reset nilai, poin & jawaban (mulai dari awal). */
async function resetAttempt(id) {
  const raw = await getAttempt(id);
  if (!raw) return { ok: false, reason: 'notfound' };
  await q(
    `UPDATE attempts
        SET status = 'mengerjakan', nilai = 0, benar = 0, score = 0, streak = 0,
            max_streak = 0, pelanggaran = 0,
            current_question = 0, answers = '[]', updated_at = ?
      WHERE id = ?`,
    [Date.now(), String(id)]
  );
  return { ok: true };
}

/** Hapus attempt (admin). */
async function deleteAttempt(id) {
  await q('DELETE FROM attempts WHERE id = ?', [String(id)]);
  return { ok: true };
}

/** Hasil lengkap + pembahasan (rumus & langkah). */
async function getResult(id) {
  const raw = await getAttempt(id);
  if (!raw) return null;
  const attempt = parseAttempt(raw);
  const total = questionCount();

  const answers = attempt.answers;
  const review = answers.map((a, i) => {
    const soal = getQuestionById(a.qid);
    return {
      number: i + 1,
      text: soal.text,
      options: soal.options,
      chosen: a.chosen,
      answer: soal.answer,
      correct: a.correct,
      rumus: soal.rumus,
      langkah: soal.langkah,
    };
  });

  const lv = levelFor(attempt.benar);
  return {
    nama: attempt.nama,
    absen: attempt.absen,
    nilai: attempt.nilai,
    benar: attempt.benar,
    total,
    score: Number(attempt.score) || 0,
    streak: Number(attempt.streak) || 0,
    maxStreak: Number(attempt.max_streak) || 0,
    status: attempt.status,
    pelanggaran: attempt.pelanggaran,
    level: lv.level,
    km: lv.km,
    label: lv.label,
    review,
  };
}

/** Daftar semua attempt untuk admin. */
async function listAttempts() {
  const { rows } = await q(
    `SELECT id, nama, absen, nilai, benar, score, streak, max_streak, status,
            pelanggaran, current_question, answers, created_at, updated_at
       FROM attempts`
  );
  const total = questionCount();
  return rows.map((r) => {
    const benar = Number(r.benar) || 0;
    const lv = levelFor(benar);
    let answered = 0;
    try {
      answered = JSON.parse(r.answers || '[]').length;
    } catch {
      answered = 0;
    }
    return {
      id: r.id,
      nama: r.nama,
      absen: r.absen,
      nilai: Number(r.nilai) || 0,
      score: Number(r.score) || 0,
      streak: Number(r.streak) || 0,
      maxStreak: Number(r.max_streak) || 0,
      benar,
      total,
      answered,
      status: r.status,
      pelanggaran: Number(r.pelanggaran) || 0,
      km: lv.km,
      label: lv.label,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at),
    };
  });
}

module.exports = {
  LEVELS,
  BASE_POINTS,
  levelFor,
  pointsForStreak,
  multiplierForStreak,
  createAttempt,
  getAttempt,
  getAttemptByName,
  getPublicState,
  submitAnswer,
  markViolation,
  finishAttempt,
  unlockAttempt,
  resetAttempt,
  deleteAttempt,
  getResult,
  listAttempts,
};
