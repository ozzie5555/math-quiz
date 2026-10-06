#!/usr/bin/env python3
"""
optimize-assets.py — siapkan aset gambar untuk web.

Cara pakai:
  1. Taruh file sumber di public/assets/ dengan nama:
       background.png  (atau .jpg)  -> latar belakang (landing & hasil)
       moon.png                     -> bulan / landasan di halaman kuis
       (opsional) astro-stand.png   -> astronot berdiri (landing)
       (opsional) astro-fly.png     -> astronot terbang (kuis)
  2. Jalankan:  python3 optimize-assets.py
  3. Script membuat versi .webp (ringan) + menampilkan ukuran & rasio.

Butuh: Python 3 + Pillow  (pip install Pillow)
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow belum terpasang. Jalankan: pip install Pillow")

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "assets")


def trim_alpha(img):
    """Buang area transparan di tepi (untuk sprite)."""
    if img.mode != "RGBA":
        return img
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img


def fit_height(img, target_h):
    w, h = img.size
    scale = target_h / h
    return img.resize((max(1, round(w * scale)), target_h), Image.LANCZOS)


def find(name):
    """Cari nama.png atau nama.jpg / nama.jpeg."""
    for ext in (".png", ".jpg", ".jpeg"):
        p = os.path.join(ASSETS, name + ext)
        if os.path.exists(p):
            return p, ext
    return None, None


def export_webp(img, base, quality=84):
    out = os.path.join(ASSETS, base + ".webp")
    img.save(out, "WEBP", quality=quality, method=6)
    return out


def process_background():
    src, ext = find("background")
    if not src:
        print("  [skip] background.png / background.jpg tidak ditemukan")
        return
    img = Image.open(src).convert("RGB")
    w, h = img.size
    # Batasi maksimum agar tidak terlalu besar (tinggi maks 1400px)
    if h > 1400:
        img = img.resize((round(w * 1400 / h), 1400), Image.LANCZOS)
    # Simpan webp + versi jpg ramping untuk fallback
    export_webp(img, "background", 72)
    img.save(os.path.join(ASSETS, "background.jpg"), "JPEG", quality=76, optimize=True, progressive=True)
    print(f"  background: {img.size[0]}x{img.size[1]}  ->  background.webp "
          f"({os.path.getsize(os.path.join(ASSETS,'background.webp'))//1024}KB)")


def process_sprite(name, target_h):
    src, ext = find(name)
    if not src:
        print(f"  [skip] {name}.png tidak ditemukan")
        return
    img = trim_alpha(Image.open(src).convert("RGBA"))
    img = fit_height(img, target_h)
    export_webp(img, name, 86)
    img.save(os.path.join(ASSETS, name + ".png"), "PNG", optimize=True)
    print(f"  {name}: {img.size[0]}x{img.size[1]}  ->  {name}.webp "
          f"({os.path.getsize(os.path.join(ASSETS,name+'.webp'))//1024}KB)")


def main():
    if not os.path.isdir(ASSETS):
        sys.exit(f"Folder tidak ditemukan: {ASSETS}")
    print("Memproses aset di", ASSETS)
    process_background()
    process_sprite("moon", 240)
    process_sprite("astro-stand", 420)
    process_sprite("astro-fly", 320)
    print("Selesai. Refresh halaman (Ctrl+Shift+R) untuk melihat hasilnya.")


if __name__ == "__main__":
    main()
