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
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        base: Math.random() * 0.5 + 0.3,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 0.03 + 0.008,
        depth: Math.random() * 0.7 + 0.3,
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
      ctx.fillStyle = 'rgba(210, 228, 255,' + Math.max(0.05, alpha).toFixed(2) + ')';
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }

  window.Space = {
    init() {
      build();
      if (!raf) draw();
      window.addEventListener('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); build(); });
    },
    /** Seberapa cepat bintang bergerak ke bawah (efek astronot naik). */
    setDrift(px) { targetOffset = px; },
    burstDrift(px) {
      targetOffset += px;
      setTimeout(() => { targetOffset -= px * 0.5; }, 700);
    },
  };

  window.Space.init();
})();
