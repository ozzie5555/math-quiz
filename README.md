# 🧑‍🚀 Spaceman Math Quest — Kuis Permutasi

Web kuis matematika bertema astronot yang **terbang makin tinggi** setiap jawaban benar.
Dibangun untuk dijalankan **online** (Vercel + Turso) maupun **lokal** untuk uji coba.

- 🎯 10 soal cerita **Permutasi**, 4 pilihan, urutan diacak
- 🧑‍🚀 Astronot naik 10 tingkat (10.000 → 100.000 km) tiap jawaban benar
- 🔥 **Sistem poin COMBO**: benar berturut-turut = poin berlipat ×2, api roket makin besar (canvas)
- 🏆 Panel admin: tabel poin & nilai, scoreboard, izin lanjut, reset, hapus, export CSV
- 🔒 Anti-cheat: keluar halaman / pindah tab / layar mati → **langsung terkunci**, butuh izin admin
- 📖 Setelah selesai: total poin + pembahasan **rumus & langkah pengerjaan**

---

## 📁 Struktur

```
math-project/
├── api/                     # Vercel Serverless Functions
│   ├── start.js             #   daftar misi (nama + absen), cek duplikat
│   ├── state.js             #   status misi + soal aktif
│   ├── answer.js            #   kirim jawaban (dikunci di server)
│   ├── violation.js         #   tandai pelanggaran -> kunci
│   ├── finish.js            #   selesaikan misi
│   ├── result.js            #   hasil + pembahasan
│   └── admin/{scores,unlock,reset,delete}.js
├── lib/
│   ├── questions.js         # bank soal (teks, opsi, kunci, rumus, langkah)
│   ├── db.js                # Turso (produksi) / SQLite lokal (dev)
│   ├── game.js              # logika misi, penilaian, tingkat ketinggian
│   └── util.js              # helper respons, auth admin, dll
├── public/                  # Frontend statis (di-deploy Vercel)
│   ├── index.html  quiz.html  result.html  admin.html
│   ├── css/style.css
│   └── js/{api,space,hud,flame,app,quiz,result,admin}.js
├── dev-server.js            # server lokal untuk uji coba
├── vercel.json
├── .env.example
└── package.json
```

---

## 🚀 Coba Lokal (tanpa akun apa pun)

Tanpa `TURSO_*`, aplikasi otomatis memakai **SQLite lokal** (`data/quiz.db`).

```bash
npm install
cp .env.example .env.local     # opsional: ubah ADMIN_PASSWORD
npm start                      # atau: node dev-server.js
```

Buka:
- **Siswa** : http://localhost:3000
- **Admin** : http://localhost:3000/admin  (password default `Krisna17#`)

Siswa lain di WiFi/hotspot yang sama bisa buka `http://<IP-laptop>:3000`
(IP ditampilkan otomatis di terminal saat server mulai).

---

## ☁️ Deploy Produksi (Vercel + Turso)

### 1. Buat database Turso

```bash
# Install Turso CLI (Linux/macOS)
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup          # atau: turso auth login
turso db create spaceman-math-quest
turso db show spaceman-math-quest --url      # -> TURSO_DATABASE_URL
turso db tokens create spaceman-math-quest   # -> TURSO_AUTH_TOKEN
```

### 2. Deploy ke Vercel

Cara termudah lewat dashboard:

1. Push project ini ke GitHub.
2. https://vercel.com/new → import repository.
3. Framework Preset: **Other** (biarkan otomatis; `vercel.json` sudah mengatur).
4. Sebelum deploy, buka **Environment Variables**, tambahkan:

| Name                 | Value                    |
| -------------------- | ------------------------ |
| `ADMIN_PASSWORD`     | `Krisna17#`              |
| `TURSO_DATABASE_URL` | `libsql://...turso.io`   |
| `TURSO_AUTH_TOKEN`   | token dari langkah 1     |

5. **Deploy**. Vercel otomatis menyajikan `public/` sebagai statis dan `api/` sebagai serverless function.

Atau lewat CLI:

```bash
npm i -g vercel
vercel login
vercel env add ADMIN_PASSWORD        # masukkan nilainya
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel --prod
```

Setelah selesai:
- **Siswa** : `https://<nama-proyek>.vercel.app`
- **Admin** : `https://<nama-proyek>.vercel.app/admin`

> 💡 Halaman siswa bisa dibuka dari mana saja (kuota/hotspot). Laptop tidak perlu menyala.

---

## 🔐 Aturan Permainan

| Aturan                | Nilai                                            |
| --------------------- | ------------------------------------------------ |
| Poin (COMBO)          | Benar ke-n berturut-turut = `1.000 × 2^(n-1)` (maks 10 benar = **1.023.000 poin**) |
| Jawaban salah         | Poin **tidak berkurang**, tetapi COMBO **reset** ke +1.000 |
| Nilai                 | 10 soal × 10 = **0–100** (tetap dihitung, tampil di hasil & admin) |
| Ketinggian astronot   | Naik 10 tingkat per jawaban benar (terpisah dari poin) |
| Pembahasan            | Di halaman hasil (bukan saat mengerjakan)        |
| Timer                 | Tidak ada                                        |
| Suara                 | Tidak ada                                        |
| Urutan soal & pilihan | Diacak                                           |
| Keluar / pindah tab   | **Langsung terkunci** → izin admin → **lanjut dari soal terakhir** (poin & COMBO tersimpan) |
| Setelah selesai       | Ulang perlu izin admin                          |
| Nama duplikat         | Ditolak; admin harus hapus dulu untuk pakai nama sama |

## 🛠️ Panel Admin

- Login password (`ADMIN_PASSWORD`)
- Statistik: total peserta, selesai, terkunci, **rata-rata poin & rata-rata nilai**
- **Scoreboard** (diurutkan berdasarkan **poin**)
- **Semua peserta**: cari nama/absen, filter status; kolom **Poin · Nilai · Streak**
- Aksi: **Izinkan Lanjut** (untuk yang terkunci), **Reset**, **Hapus**
- **⬇ Export CSV** & auto-refresh

---

## 📝 Mengubah Soal

Semua soal ada di **`lib/questions.js`**. Contoh satu entri:

```js
{
  id: 1,
  text: 'Dalam sebuah lomba terdapat 8 peserta ...',
  options: ['56', '168', '336', '512'],
  answer: '336',                        // harus persis salah satu isi options
  rumus: 'P(n,r) = n! / (n-r)!',
  langkah: ['P(8,3) = 8! / (8-3)!', '= 8! / 5!', '= 8 x 7 x 6', '= 336'],
}
```

Ubah `ADMIN_PASSWORD` kapan saja lewat Environment Variables di Vercel
( atau `.env.local` saat lokal ).
