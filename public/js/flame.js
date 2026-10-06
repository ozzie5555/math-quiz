/* =========================================================================
   flame.js — api jetpack berbasis canvas (kesan bervolume / "3D")
   Partikel berlapis: putih -> kuning -> oranye -> merah, dengan additive
   blending ('lighter') supaya terlihat bercahaya. Tampil tipis saat idle,
   membesar & lebih cepat saat boost.
   ========================================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('flame');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let particles = [];
  let raf = null;
  let boost = 0;        // 0 = idle, 1 = boost penuh
  let last = performance.now();

  // Palet api (dari inti ke tepi)
  const LAYERS = [
    { r: 255, g: 255, b: 240 }, // inti putih
    { r: 255, g: 226, b: 120 }, // kuning
    { r: 255, g: 165, b: 40 },  // oranye
    { r: 255, g: 90, b: 40 },   // oranye-merah
    { r: 220, g: 40, b: 30 },   // merah
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(rate) {
    // spawn partikel sesuai intensitas
    const n = rate;
    for (let i = 0; i < n; i++) {
      const spread = W * 0.30;
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * spread,
        y: H * 0.16 + (Math.random() - 0.5) * H * 0.08,
        vx: (Math.random() - 0.5) * (12 + boost * 30),
        vy: -(30 + Math.random() * 50) * (1 + boost * 1.4),
        life: 0,
        maxLife: 380 + Math.random() * 320,
        r: (1.6 + Math.random() * 2.4) * (0.8 + boost * 0.6),
        layer: Math.random(),
      });
    }
  }

  function colorFor(layer, t) {
    // t: 0 (baru) -> 1 (mati). Pilih layer lalu turunkan kecerahan & alpha.
    const idx = Math.min(LAYERS.length - 1, Math.floor(layer * LAYERS.length));
    const c = LAYERS[idx];
    const bright = 1 - t * 0.85;
    return {
      r: Math.round(c.r * bright),
      g: Math.round(c.g * bright),
      b: Math.round(c.b * bright),
      a: Math.max(0, 1 - t) * 0.9,
    };
  }

  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // Jumlah spawn bergantung intensitas
    const rate = reduceMotion ? 0 : Math.round(2 + boost * 7);
    if (rate > 0) spawn(rate);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      const t = p.life / p.maxLife;
      if (t >= 1) { particles.splice(i, 1); continue; }

      // gerak + goyangan halus
      p.x += (p.vx * dt) / 1000 + Math.sin((p.life + p.x) * 0.02) * 0.4;
      p.y += (p.vy * dt) / 1000;
      p.vy *= 0.985; // melambat saat naik

      const col = colorFor(p.layer, t);
      const radius = p.r * (1 - t * 0.5);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
      grad.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${col.a})`);
      grad.addColorStop(0.4, `rgba(${col.r},${col.g},${col.b},${col.a * 0.5})`);
      grad.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }

  window.Flame = {
    init() {
      resize();
      window.addEventListener('resize', resize);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    setBoost(on) {
      boost = on ? 1 : 0;
      if (on && !reduceMotion) {
        // ledakan awal saat boost
        for (let i = 0; i < 24; i++) {
          particles.push({
            x: W / 2 + (Math.random() - 0.5) * W * 0.36,
            y: H * 0.16,
            vx: (Math.random() - 0.5) * 90,
            vy: -(120 + Math.random() * 120),
            life: 0,
            maxLife: 420 + Math.random() * 300,
            r: 2.4 + Math.random() * 2.6,
            layer: Math.random(),
          });
        }
      }
    },
  };

  window.Flame.init();
})();
