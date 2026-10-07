/* =========================================================================
   space.js — starfield (bintang berkelip) + parallax
   ========================================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let stars = [];
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let raf = null;
  let offset = 0;
  let targetOffset = 0;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function count() {
    const area = window.innerWidth * window.innerHeight;
    // Kurangi partikel di layar kecil (< 480px) agar hemat baterai.
    const density = window.innerWidth < 480 ? 0.00012 : 0.0002;
    return Math.round(area * density);
  }

  function build() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = count();
    stars = [];
    for (let i = 0; i < n; i++) {
      // 3 lapis parallax: jauh (kecil, pelan), tengah, dekat (besar, cepat)
      const layer = Math.random();
      let r, depth, base;
      if (layer < 0.55) {          // lapis jauh
        r = Math.random() * 0.9 + 0.3;
        depth = Math.random() * 0.25 + 0.15;
        base = Math.random() * 0.3 + 0.2;
      } else if (layer < 0.85) {   // lapis tengah
        r = Math.random() * 1.4 + 0.6;
        depth = Math.random() * 0.4 + 0.5;
        base = Math.random() * 0.4 + 0.4;
      } else {                     // lapis dekat
        r = Math.random() * 1.8 + 1.2;
        depth = Math.random() * 0.5 + 1.0;
        base = Math.random() * 0.4 + 0.6;
      }
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r,
        base,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 0.03 + 0.008,
        depth,
        // sedikit variasi warna: putih, cyan dingin, ungu
        hue: Math.random() < 0.18 ? '198,236,255' : Math.random() < 0.25 ? '205,190,255' : '210,228,255',
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    offset += (targetOffset - offset) * 0.08;

    for (const s of stars) {
      s.tw += s.tws;
      const alpha = reduceMotion ? s.base : s.base + Math.sin(s.tw) * 0.35;
      const y = ((s.y + offset * s.depth) % (h + 40) + h + 40) % (h + 40) - 20;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + s.hue + ',' + Math.max(0.05, alpha).toFixed(2) + ')';
      ctx.fill();
      // bintang lapis dekat dapat glow halus
      if (s.r > 2) {
        ctx.beginPath();
        ctx.arc(s.x, y, s.r * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + s.hue + ',' + (alpha * 0.12).toFixed(2) + ')';
        ctx.fill();
      }
    }
    raf = requestAnimationFrame(draw);
  }

  window.Space = {
    init() {
      build();
      if (!raf) draw();
      window.addEventListener('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); build(); });
    },
    /** Seberapa jauh bintang bergeser ke bawah (efek astronot naik / menjauh). */
    setDrift(px) { targetOffset = px; },
    /** Tambahan dorongan sesaat saat melesat (lalu melandai kembali ke dasar). */
    burstDrift(px) {
      const base = targetOffset;
      targetOffset = base + px;
      setTimeout(() => { targetOffset = base; }, 600);
    },
  };

  window.Space.init();
})();
