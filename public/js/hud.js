/* =========================================================================
   hud.js — count-up angka & hujan bintang
   ========================================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(el, from, to, duration, format) {
    if (!el) return;
    if (reduceMotion) { el.textContent = format ? format(to) : to; return; }
    const start = performance.now();
    const dur = duration || 700;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      el.textContent = format ? format(val) : val;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /** Format angka ringkas: 800 -> "800", 45000 -> "45 rb", 1023000 -> "1,02 jt". */
  function formatCompact(n) {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    if (abs < 1000) return String(v);
    if (abs < 1000000) {
      const rb = v / 1000;
      const rounded = Math.round(rb * 10) / 10;
      const s = (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1).replace('.', ','));
      return s + ' rb';
    }
    const jt = v / 1000000;
    const s = (Math.round(jt * 100) / 100).toFixed(2).replace('.', ',');
    return s + ' jt';
  }

  /** Format angka penuh dengan pemisah ribuan gaya Indonesia. */
  function formatFull(n) {
    return Number(n || 0).toLocaleString('id-ID');
  }

  function starConfetti(container, count, duration) {
    if (!container || reduceMotion) return;
    const n = window.innerWidth < 480 ? Math.min(count, 22) : count;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'confetti__star';
      const size = (Math.random() * 9 + 5).toFixed(1);
      s.style.left = Math.random() * 100 + '%';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.animationDuration = (Math.random() * (duration || 3000) / 1000 + 2.2) + 's';
      s.style.animationDelay = (Math.random() * 1.5) + 's';
      container.appendChild(s);
      setTimeout(() => s.remove(), (duration || 3000) + 4000);
    }
  }

  window.HUD = { countUp, starConfetti, formatCompact, formatFull };
})();
