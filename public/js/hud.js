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

  window.HUD = { countUp, starConfetti };
})();
