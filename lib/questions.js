'use strict';

/**
 * Bank soal Permutasi (10 soal cerita).
 * Setiap soal: { id, text, options[4], answer, rumus, langkah[] }
 * - `answer`  : string opsi yang benar (harus persis salah satu isi `options`)
 * - `rumus`   : rumus utama yang dipakai
 * - `langkah` : langkah pengerjaan (baris demi baris)
 */
const QUESTIONS = [
  {
    id: 1,
    text: 'Dalam sebuah lomba terdapat 8 peserta. Panitia akan menentukan juara 1, juara 2, dan juara 3. Berapa banyak kemungkinan susunan juara yang dapat terjadi?',
    options: ['56', '168', '336', '512'],
    answer: '336',
    rumus: 'P(n,r) = n! / (n-r)!',
    langkah: [
      'P(8,3) = 8! / (8-3)!',
      '= 8! / 5!',
      '= 8 x 7 x 6',
      '= 336',
    ],
  },
  {
    id: 2,
    text: 'Sebuah kelas memiliki 6 bendera berbeda yang akan disusun berjajar di depan kelas. Semua bendera harus digunakan. Berapa banyak susunan yang mungkin?',
    options: ['120', '360', '720', '1.440'],
    answer: '720',
    rumus: 'P(n,n) = n!',
    langkah: [
      '6! = 6 x 5 x 4 x 3 x 2 x 1',
      '= 720',
    ],
  },
  {
    id: 3,
    text: 'Sebanyak 7 siswa duduk mengelilingi sebuah meja bundar. Berapa banyak susunan tempat duduk yang berbeda?',
    options: ['120', '240', '360', '720'],
    answer: '720',
    rumus: 'P = (n-1)!',
    langkah: [
      'P = (7-1)!',
      '= 6!',
      '= 720',
    ],
  },
  {
    id: 4,
    text: 'Rina memiliki kartu huruf yang membentuk kata SANDANG. Ia ingin menyusun seluruh kartu tersebut menjadi berbagai susunan. Jika huruf yang sama dianggap tidak berbeda, berapa banyak susunan yang dapat dibuat?',
    options: ['420', '840', '1.260', '2.520'],
    answer: '1.260',
    rumus: 'P = n! / (k1! x k2! x ...)',
    langkah: [
      'Kata SANDANG memiliki 7 huruf.',
      'A muncul 2 kali, N muncul 2 kali.',
      'P = 7! / (2! x 2!)',
      '= 5040 / (2 x 2)',
      '= 5040 / 4',
      '= 1260',
    ],
  },
  {
    id: 5,
    text: 'Sebuah sistem keamanan membuat kode yang terdiri dari 4 digit angka. Setiap digit dapat berupa angka 0 sampai 9 dan angka boleh digunakan berulang. Berapa banyak kode yang dapat dibuat?',
    options: ['1.000', '5.000', '9.000', '10.000'],
    answer: '10.000',
    rumus: 'P = n^r',
    langkah: [
      'Terdapat 10 pilihan angka untuk setiap posisi dan 4 posisi.',
      'P = 10^4',
      '= 10.000',
    ],
  },
  {
    id: 6,
    text: 'Dari 7 calon pengurus OSIS, akan dipilih 4 orang untuk mengisi jabatan ketua, wakil ketua, sekretaris, dan bendahara. Berapa banyak susunan pengurus yang mungkin?',
    options: ['210', '420', '840', '1.680'],
    answer: '840',
    rumus: 'P(n,r) = n! / (n-r)!',
    langkah: [
      'P(7,4) = 7! / (7-4)!',
      '= 7! / 3!',
      '= 7 x 6 x 5 x 4',
      '= 840',
    ],
  },
  {
    id: 7,
    text: 'Sebuah toko memiliki 5 jenis poster berbeda. Semua poster tersebut akan dipasang berjajar pada sebuah dinding. Berapa banyak urutan pemasangan yang mungkin?',
    options: ['25', '60', '100', '120'],
    answer: '120',
    rumus: 'P(n,n) = n!',
    langkah: [
      '5! = 5 x 4 x 3 x 2 x 1',
      '= 120',
    ],
  },
  {
    id: 8,
    text: 'Sebanyak 8 orang sedang makan bersama dan duduk mengelilingi meja bundar. Berapa banyak susunan tempat duduk yang berbeda?',
    options: ['720', '1.440', '5.040', '40.320'],
    answer: '5.040',
    rumus: 'P = (n-1)!',
    langkah: [
      'P = (8-1)!',
      '= 7!',
      '= 5040',
    ],
  },
  {
    id: 9,
    text: 'Sebuah permainan menggunakan seluruh huruf dari kata MATEMATIKA untuk membuat susunan kata. Huruf yang sama dianggap identik. Berapa banyak susunan berbeda yang dapat dibuat?',
    options: ['75.600', '151.200', '302.400', '604.800'],
    answer: '151.200',
    rumus: 'P = n! / (k1! x k2! x k3!)',
    langkah: [
      'Kata MATEMATIKA terdiri dari 10 huruf.',
      'A muncul 3 kali, M muncul 2 kali, T muncul 2 kali.',
      'P = 10! / (3! x 2! x 2!)',
      '= 3.628.800 / (6 x 2 x 2)',
      '= 3.628.800 / 24',
      '= 151.200',
    ],
  },
  {
    id: 10,
    text: 'Sebuah aplikasi membuat kode akses 5 digit menggunakan angka 0 sampai 9. Setiap angka boleh digunakan lebih dari satu kali dan angka 0 boleh berada di posisi pertama. Berapa banyak kode yang dapat dibuat?',
    options: ['10.000', '50.000', '100.000', '1.000.000'],
    answer: '100.000',
    rumus: 'P = n^r',
    langkah: [
      'Terdapat 10 pilihan angka untuk setiap posisi dan terdapat 5 posisi.',
      'P = 10^5',
      '= 100.000',
    ],
  },
];

/** 5 rumus utama permutasi (ditampilkan di halaman hasil). */
const RUMUS_UTAMA = [
  { nama: 'Permutasi unsur berbeda', rumus: 'P(n,r) = n! / (n-r)!' },
  { nama: 'Permutasi seluruh unsur', rumus: 'P(n,n) = n!' },
  { nama: 'Permutasi melingkar', rumus: 'P = (n-1)!' },
  { nama: 'Permutasi dengan unsur sama', rumus: 'P = n! / (k1! x k2! x ...)' },
  { nama: 'Permutasi berulang', rumus: 'P = n^r' },
];

const PHASE_HAVING = 'mengerjakan';
const PHASE_FINISHED = 'selesai';
const PHASE_LOCKED = 'terkunci';

/** Ambil bank soal (array). */
function getAllQuestions() {
  return QUESTIONS;
}

/** Cari soal berdasarkan id. */
function getQuestionById(id) {
  return QUESTIONS.find((q) => q.id === Number(id)) || null;
}

/** Jumlah soal. */
function questionCount() {
  return QUESTIONS.length;
}

module.exports = {
  QUESTIONS,
  RUMUS_UTAMA,
  PHASE_HAVING,
  PHASE_FINISHED,
  PHASE_LOCKED,
  getAllQuestions,
  getQuestionById,
  questionCount,
};
