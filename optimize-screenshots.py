#!/usr/bin/env python3
"""
optimize-screenshots.py — kecilkan tangkapan layar untuk README.

Masalah: screenshot dari HP/laptop biasanya PNG 700KB-1.5MB. GitHub memuatnya
lambat, dan PNG tidak efisien untuk gambar berisi banyak warna/foto.

Solusi: perkecil ke lebar maksimum 1400px lalu simpan sebagai JPEG (quality 82).
Hasil umumnya 8-12x lebih kecil tanpa beda kasat mata.

Cara pakai:
  1. Taruh screenshot resolusi penuh di public/assets/images/ dengan nama:
       landing.png, quiz.png, admin.png, result.png
     (Nama file bebas, tinggal sesuaikan daftar NAMES di bawah.)
  2. Jalankan:  python3 optimize-screenshots.py
  3. Script menyimpan JPEG + menampilkan perbandingan ukuran.
     File PNG asli TIDAK dihapus (dipakai sebagai backup).

Butuh: Python 3 + Pillow  (pip install Pillow)
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow belum terpasang. Jalankan: pip install Pillow")

ROOT = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(ROOT, "public", "assets", "images")

# Nama file (tanpa ekstensi) yang akan diproses.
NAMES = ["landing", "quiz", "admin", "result"]

MAX_WIDTH = 1400
QUALITY = 82


def find_src(name):
    """Cari name.png / name.jpg / name.jpeg, abaikan folder backup."""
    for ext in (".png", ".jpg", ".jpeg"):
        p = os.path.join(IMAGES, name + ext)
        if os.path.exists(p):
            return p, ext
    return None, None


def kb(path):
    return os.path.getsize(path) // 1024


def process(name):
    src, ext = find_src(name)
    if not src:
        print(f"  [skip] {name}.png tidak ditemukan")
        return None

    img = Image.open(src)

    # JPEG tidak mendukung transparansi. Rata-kan ke atas warna putih supaya
    # area transparan tidak jadi hitam, lalu buang channel alpha.
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.getchannel("A"))
        img = bg
    else:
        img = img.convert("RGB")

    w, h = img.size
    if w > MAX_WIDTH:
        img = img.resize((MAX_WIDTH, round(h * MAX_WIDTH / w)), Image.LANCZOS)

    out = os.path.join(IMAGES, name + ".jpg")
    img.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)

    before = kb(src)
    after = kb(out)
    saved = 100 - (after * 100 // before) if before else 0
    print(
        f"  {name:8} {w}x{h} -> {img.size[0]}x{img.size[1]}  "
        f"{before}KB -> {after}KB  (hemat {saved}%)"
    )
    return out


def main():
    if not os.path.isdir(IMAGES):
        sys.exit(f"Folder tidak ditemukan: {IMAGES}")

    print(f"Memproses screenshot di {IMAGES}")
    results = [process(n) for n in NAMES]

    if any(results):
        print("\nSelesai. Path di README.md sekarang harus memakai .jpg, contoh:")
        print("  ![Halaman Landing](public/assets/images/landing.jpg)")
        print("File .png asli tetap ada sebagai backup (aman untuk dihapus manual).")
    else:
        print("\nTidak ada file yang diproses.")


if __name__ == "__main__":
    main()
