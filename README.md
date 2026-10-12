<div align="center">

<h1>Spaceman Math Quest</h1>

<p><b>Kuis permutasi interaktif bertema astronot luar angkasa.</b></p>

<p>Siswa menjawab 10 soal cerita permutasi sambil menerbangkan astronotnya makin tinggi ke angkasa,<br>
sementara guru memantau seluruh progres secara real-time melalui panel admin.</p>

<p>Dapat dijalankan <b>online</b> (Vercel + Turso) maupun <b>lokal</b> untuk simulasi di kelas.</p>

<p>
  <img src="public/assets/icons/html5.svg" width="28" alt="HTML5" />
  <img src="public/assets/icons/css.svg" width="28" alt="CSS3" />
  <img src="public/assets/icons/javascript.svg" width="28" alt="JavaScript" />
  <img src="public/assets/icons/nodejs.svg" width="28" alt="Node.js" />
  <img src="public/assets/icons/sqlite.svg" width="28" alt="SQLite" />
  <img src="public/assets/icons/turso.svg" width="28" alt="Turso" />
  <img src="public/assets/icons/vercel.svg" width="28" alt="Vercel" />
  <img src="public/assets/icons/github.svg" width="28" alt="GitHub" />
</p>

</div>

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tangkapan Layar](#tangkapan-layar)
- [Alur Permainan](#alur-permainan)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Deploy Produksi (Vercel + Turso)](#deploy-produksi-vercel--turso)
- [Panel Admin](#panel-admin)
- [Aturan Permainan](#aturan-permainan)
- [Mengubah Soal](#mengubah-soal)

---

## Fitur Utama

- **10 soal cerita permutasi** dengan 4 pilihan ganda
- **Soal & pilihan diacak** untuk setiap siswa
- **Astronot naik 10 tingkat** (10.000 → 100.000 km) setiap jawaban benar
- **Sistem poin COMBO** — jawaban benar beruntun melipatgandakan poin ×2
- **Panel admin** — scoreboard live, statistik, kelola peserta, ekspor ke Excel
- **Anti-cheat** — keluar halaman, pindah tab, atau refresh akan memunculkan peringatan dan mengunci misi
- **Pembahasan lengkap** — rumus dan langkah pengerjaan di halaman hasil

---

## Tangkapan Layar

<div align="center">

<img src="public/assets/images/landing.jpg" width="760" alt="Halaman landing"><br>
<sub><b>Landing</b> — mengisi nama & nomor absen</sub>

</div>

| <img src="public/assets/images/quiz.jpg" width="380" alt="Halaman kuis"> | <img src="public/assets/images/result.jpg" width="380" alt="Halaman hasil"> |
| :---: | :---: |
| **Kuis** — soal, astronot, dan progress misi | **Hasil** — poin, nilai, dan pembahasan |

<div align="center">

<img src="public/assets/images/admin.jpg" width="760" alt="Panel admin"><br>
<sub><b>Panel Admin</b> — scoreboard dan pengelolaan peserta</sub>

</div>

---

## Alur Permainan

1. Siswa membuka halaman landing dan mengisi **nama** serta **nomor absen**.
2. Sistem menampilkan 10 soal permutasi dengan urutan soal dan pilihan yang diacak.
3. Setiap jawaban benar menaikkan astronot satu tingkat dan menambah poin COMBO.
4. Keluar halaman, pindah tab, atau refresh akan **mengunci misi** — siswa dapat lanjut
   dari soal terakhir setelah guru mengizinkan lewat panel admin.
5. Setelah 10 soal selesai, halaman hasil menampilkan total poin, nilai, dan pembahasan.
6. Guru memantau scoreboard secara real-time dan mengekspor hasil ke Excel.

---

## Tech Stack

| Teknologi | Keterangan |
| --- | --- |
| <img src="public/assets/icons/html5.svg" width="18" alt="HTML5"> HTML5 | Struktur halaman statis |
| <img src="public/assets/icons/css.svg" width="18" alt="CSS3"> CSS3 | Tampilan bertema luar angkasa |
| <img src="public/assets/icons/javascript.svg" width="18" alt="JavaScript"> JavaScript | Logika frontend interaktif |
| <img src="public/assets/icons/nodejs.svg" width="18" alt="Node.js"> Node.js | Runtime server & serverless functions |
| <img src="public/assets/icons/sqlite.svg" width="18" alt="SQLite"> SQLite | Database lokal untuk mode pengembangan |
| <img src="public/assets/icons/turso.svg" width="18" alt="Turso"> Turso | Database cloud untuk produksi |
| <img src="public/assets/icons/vercel.svg" width="18" alt="Vercel"> Vercel | Hosting & deployment serverless |
| <img src="public/assets/icons/github.svg" width="18" alt="GitHub"> GitHub | Version control & CI/CD |

---

## Struktur Proyek

```
math-project/
├── api/                     # Vercel Serverless Functions
│   ├── start.js             #   daftar misi (nama + absen), cek duplikat
│   ├── state.js             #   status misi + soal aktif
│   ├── answer.js            #   kirim jawaban (divalidasi di server)
│   ├── violation.js         #   tandai pelanggaran -> kunci
│   ├── finish.js            #   selesaikan misi
│   ├── result.js            #   hasil + pembahasan
│   └── admin/               #   scores, unlock, reset, delete
├── lib/
│   ├── questions.js         # bank soal (teks, opsi, kunci, rumus, langkah)
│   ├── db.js                # Turso (produksi) / SQLite lokal (dev)
│   ├── game.js              # logika misi, penilaian, tingkat ketinggian
│   └── util.js              # helper respons, auth admin, dll
├── public/                  # Frontend statis (di-deploy Vercel)
│   ├── index.html           # landing / daftar misi
│   ├── quiz.html            # halaman kuis
│   ├── result.html          # halaman hasil & pembahasan
│   ├── admin.html           # panel admin
│   ├── css/style.css
│   ├── js/                  # app, quiz, result, admin, space, hud, api
│   └── assets/              # gambar & ikon
│       └── images/          # tangkapan layar untuk dokumentasi
├── dev-server.js            # server lokal untuk uji coba
├── vercel.json              # konfigurasi deploy Vercel
├── .env.example             # contoh environment variables
└── package.json
```

---

## Menjalankan Secara Lokal

Tanpa `TURSO_*`, aplikasi otomatis memakai **SQLite lokal** (`data/quiz.db`).

```bash
npm install
cp .env.example .env.local     # opsional: ubah ADMIN_PASSWORD
npm start                      # atau: node dev-server.js
```

Lalu buka:

- **Siswa** : http://localhost:3000
- **Admin** : http://localhost:3000/admin (password default `Krisna17#`)

Siswa lain di WiFi/hotspot yang sama dapat mengakses `http://<IP-laptop>:3000`
(IP ditampilkan otomatis di terminal saat server mulai).

> Ubah `ADMIN_PASSWORD` sebelum dipakai di kelas agar tidak memakai password default.

---

## Deploy Produksi (Vercel + Turso)

### 1. Buat Database Turso

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

1. Push proyek ini ke GitHub.
2. https://vercel.com/new → import repository.
3. Framework Preset: **Other** (biarkan otomatis; `vercel.json` sudah mengatur).
4. Sebelum deploy, buka **Environment Variables**, tambahkan:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | `Krisna17#` |
| `TURSO_DATABASE_URL` | `libsql://...turso.io` |
| `TURSO_AUTH_TOKEN` | token dari langkah 1 |

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

> Halaman siswa dapat dibuka dari mana saja. Laptop guru tidak perlu menyala selama ujian.

---

## Panel Admin

- Login menggunakan password (`ADMIN_PASSWORD`)
- **Statistik**: total peserta, selesai, terkunci, rata-rata poin, rata-rata nilai
- **Scoreboard** diurutkan berdasarkan poin tertinggi
- **Semua Peserta**: pencarian nama/absen, filter status, kolom Poin · Nilai · Streak
- **Aksi Peserta**: Izinkan Lanjut (untuk yang terkunci), Reset, Hapus
- **Ekspor Excel** dalam format `.xls` yang rapi
- **Auto-refresh** data setiap 8 detik

---

## Aturan Permainan

| Aturan | Keterangan |
| --- | --- |
| **Poin (COMBO)** | Benar ke-n berturut-turut = `1.000 × 2^(n-1)`, maksimal 10 benar = **1.023.000 poin** |
| **Jawaban Salah** | Poin tidak berkurang, tetapi COMBO reset ke +1.000 |
| **Nilai** | 10 soal × 10 = **0–100** |
| **Ketinggian Astronot** | Naik 10 tingkat per jawaban benar (terpisah dari poin) |
| **Pembahasan** | Ditampilkan di halaman hasil, bukan saat mengerjakan |
| **Timer** | Tidak ada |
| **Suara** | Tidak ada |
| **Urutan Soal & Pilihan** | Diacak untuk setiap siswa |
| **Keluar / Pindah Tab / Refresh** | Muncul peringatan browser, misi terkunci, lanjut dari soal terakhir setelah diizinkan admin |
| **Setelah Selesai** | Ulang perlu izin admin |
| **Nama Duplikat** | Ditolak; admin harus menghapus data lama terlebih dahulu |

---

## Mengubah Soal

Semua soal berada di **`lib/questions.js`**. Contoh satu entri:

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
(atau `.env.local` saat lokal).
