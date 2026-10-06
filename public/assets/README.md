# public/assets/

Folder aset gambar.

## ⭐ Nama file yang dipakai sistem (tinggal timpa untuk ganti)

| Elemen | Nama file | Format | Dipakai di |
| ------ | --------- | ------ | ---------- |
| 🌌 **Latar belakang** | `background.png` / `.jpg` | PNG/JPG | Landing, Kuis, Hasil |
| 🌙 **Bulan (landasan)** | `moon.png` | PNG transparan | Kuis |
| 🧑‍🚀 Astronot terbang | `astro-fly.png` | PNG transparan | Kuis |
| 🧑‍🚀 Astronot berdiri | `astro-stand.png` | PNG transparan | Landing |

### Ganti aset
1. Taruh gambar baru di folder ini dengan salah satu nama di atas.
2. Jalankan: `python3 optimize-assets.py` (membuat versi `.webp` ringan).
3. Refresh halaman (Ctrl+Shift+R).

## Catatan

- Browser memakai versi `.webp` (jauh lebih kecil) bila `optimize-assets.py` dijalankan.
- **Bulan** ditampilkan besar sebagai landasan; astronot diletakkan di atas puncaknya.
- **Astronot terbang** sudah dirotasi agar menghadap ke atas; api jetpack keluar dari kakinya.
- File sumber desain lain (`astronot.png`, `astronot-lari.png`, `bulan.png`) disimpan sebagai bahan.
