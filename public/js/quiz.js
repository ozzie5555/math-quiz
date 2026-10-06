/* =========================================================================
   quiz.js — alur pengerjaan + anti-cheat + animasi astronot
   ========================================================================= */
(function () {
  'use strict';

  const id = API.load('mq_id');
  if (!id) { location.replace('/'); return; }

  const els = {
    stage: document.getElementById('stage'),
    astro: document.getElementById('astro'),
    astroScore: document.getElementById('astroScore'),
    comboBadge: document.getElementById('comboBadge'),
    impact: document.getElementById('impact'),
    moon: document.getElementById('moon'),
    hudName: document.getElementById('hudName'),
    hudAbsen: document.getElementById('hudAbsen'),
    hudKm: document.getElementById('hudKm'),
    progressFill: document.getElementById('progressFill'),
    progressLabel: document.getElementById('progressLabel'),
    qNumber: document.getElementById('qNumber'),
    qLevel: document.getElementById('qLevel'),
    qText: document.getElementById('qText'),
    options: document.getElementById('options'),
    feedback: document.getElementById('feedback'),
    answerbar: document.getElementById('answerbar'),
    answerbarRow: document.getElementById('answerbarRow'),
    answerbarHint: document.getElementById('answerbarHint'),
    dangerFlash: document.getElementById('dangerFlash'),
    violationOverlay: document.getElementById('violationOverlay'),
    lockedOverlay: document.getElementById('lockedOverlay'),
    doneOverlay: document.getElementById('doneOverlay'),
    doneScore: document.getElementById('doneScore'),
    checkAccessBtn: document.getElementById('checkAccessBtn'),
    lockedHint: document.getElementById('lockedHint'),
    confetti: document.getElementById('confetti'),
    pointsLayer: document.getElementById('pointsLayer'),
  };

  let current = null;
  let locked = false;
  let finished = false;
  let answering = false;
  let pollTimer = null;
  let lastKm = 0;
  let lastScore = 0;
  let armed = false; // anti-cheat baru aktif setelah konfirmasi

  const KEY_LABELS = ['A', 'B', 'C', 'D'];

  /* ----------------------------- render ----------------------------- */
  function fmtKm(km) {
    return km.toLocaleString('id-ID') + ' km';
  }

  function applySky(level) {
    document.body.setAttribute('data-sky', String(level));
  }

  /**
   * Tinggi dasar (px dari bawah panggung) tempat astronot mulai.
   * Mengikuti puncak bola bulan (bulan diletakkan di top:80% via CSS),
   * dengan sedikit margin agar kaki tampak mendarat di permukaan bulan.
   */
  function baseBottom() {
    const stageH = els.stage.clientHeight;
    const moon = els.moon.getBoundingClientRect();
    const stageRect = els.stage.getBoundingClientRect();
    const moonDome = (moon.top - stageRect.top) + moon.height * 0.08;
    return Math.max(stageH * 0.12, stageH - moonDome + 2);
  }

  /** Hitung posisi astronot berdasarkan tingkat (0..10). */
  function astroBottomFor(level) {
    const stageH = els.stage.clientHeight;
    const astroH = els.astro.offsetHeight || 110;
    const base = baseBottom();
    const topLimit = 40; // ruang untuk label angka di atas astronot
    const maxBottom = Math.max(base + 90, stageH - astroH - topLimit);
    const t = Math.max(0, Math.min(10, level)) / 10;
    // linear: tiap jawaban benar naik dengan jarak yang terasa konsisten
    return base + t * (maxBottom - base);
  }

  function moveAstro(level, animate) {
    els.astro.style.transition = animate === false ? 'none' : '';
    els.astro.style.bottom = astroBottomFor(level) + 'px';
  }

  function setProgress(answered, total) {
    const pct = Math.round((answered / total) * 100);
    els.progressFill.style.width = pct + '%';
    els.progressLabel.textContent = 'Soal ' + answered + ' / ' + total;
  }

  function renderState(state) {
    current = state;
    els.hudName.textContent = state.nama;
    els.hudAbsen.textContent = 'Absen ' + state.absen;

    lastKm = state.km;
    HUD.countUp(els.hudKm, 0, state.km, 700, fmtKm);

    const fromScore = lastScore;
    lastScore = state.score || 0;
    HUD.countUp(els.astroScore, fromScore, lastScore, 700, HUD.formatFull);
    setCombo(state.streak || 0, false);

    applySky(state.level);
    moveAstro(state.level, true);
    setProgress(state.answeredCount, state.total);
    els.qLevel.textContent = state.label;

    if (state.status === 'terkunci') { lockNow(); return; }
    if (state.status === 'selesai' || !state.question) {
      if (state.answeredCount >= state.total) { showDone(state); return; }
    }

    if (state.question) renderQuestion(state.question);
  }

  /** Tampilkan badge COMBO ×N (streak >= 2). */
  function setCombo(streak, animate) {
    const badge = els.comboBadge;
    if (!badge) return;
    if (!streak || streak < 2) {
      badge.textContent = '';
      badge.classList.remove('show');
      return;
    }
    const mult = Math.pow(2, streak - 1);
    badge.textContent = 'COMBO ×' + mult;
    badge.classList.add('show');
    if (animate) {
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
    }
  }

  function renderQuestion(q) {
    answering = false;
    els.qNumber.textContent = 'Soal ' + q.number;
    els.qText.textContent = q.text;
    els.feedback.textContent = '';
    els.feedback.className = 'feedback';
    els.options.innerHTML = '';
    hideAnswerbar();

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.dataset.value = opt;
      btn.innerHTML = '<span class="option__key">' + KEY_LABELS[i] + '</span><span class="option__txt"></span>';
      btn.querySelector('.option__txt').textContent = opt;
      btn.addEventListener('click', () => onChoose(btn, opt));
      els.options.appendChild(btn);
    });
  }

  function keyOf(options, value) {
    const i = options.findIndex((o) => String(o) === String(value));
    return i >= 0 ? KEY_LABELS[i] : '?';
  }

  /** Tampilkan kunci jawaban setelah menjawab. */
  function showAnswerbar(options, chosen, answer, correct) {
    const mineKey = keyOf(options, chosen);
    const ansKey = keyOf(options, answer);
    els.answerbarRow.innerHTML =
      '<div class="answerchip ' + (correct ? 'answerchip--ok' : 'answerchip--no') + ' answerchip--mine">' +
        '<span class="answerchip__label">Jawabanmu</span>' +
        '<span class="answerchip__val"><span class="answerchip__key">' + mineKey + '</span>' + escapeHtml(chosen) + '</span>' +
      '</div>' +
      '<div class="answerchip answerchip--ok">' +
        '<span class="answerchip__label">Kunci Jawaban</span>' +
        '<span class="answerchip__val"><span class="answerchip__key">' + ansKey + '</span>' + escapeHtml(answer) + '</span>' +
      '</div>';
    els.answerbarHint.textContent = correct
      ? 'Tepat! Astronot melanjutkan pendakian.'
      : 'Jawaban benar adalah ' + ansKey + '. Astronot tetap di posisinya.';
    els.answerbar.classList.remove('answerbar--ok', 'answerbar--no');
    els.answerbar.classList.add(correct ? 'answerbar--ok' : 'answerbar--no');
    els.answerbar.hidden = false;
  }

  function hideAnswerbar() {
    els.answerbar.hidden = true;
    els.answerbar.classList.remove('answerbar--ok', 'answerbar--no');
    els.answerbarRow.innerHTML = '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* --------------------------- jawab soal --------------------------- */
  async function onChoose(btn, option) {
    if (answering || locked || finished || !current || !current.question) return;
    answering = true;

    const buttons = Array.from(els.options.querySelectorAll('.option'));
    buttons.forEach((b) => (b.disabled = true));

    const res = await API.post('/api/answer', {
      id, questionId: current.question.id, option,
    });

    if (!res.ok) {
      if (res.data && res.data.error === 'locked') { lockNow(); return; }
      // out-of-sync -> reload state
      answering = false;
      await refreshState();
      return;
    }

    const r = res.data.result;
    const correctBtn = buttons.find((b) => b.dataset.value === option);

    if (r.correct) {
      if (correctBtn) correctBtn.classList.add('option--correct');
      els.feedback.textContent = 'BENAR';
      els.feedback.className = 'feedback feedback--ok';
      boostAstro(r.level, r.km, r.points, r.streak);
      setCombo(r.streak || 0, true);
    } else {
      if (correctBtn) correctBtn.classList.add('option--wrong');
      els.feedback.textContent = 'SALAH';
      els.feedback.className = 'feedback feedback--no';
      wrongFlash();
      setCombo(0, false);
    }

    // tampilkan kunci jawaban
    if (current.question && current.question.options) {
      showAnswerbar(current.question.options, option, r.correctAnswer, r.correct);
    }

    // update HUD angka & progress
    HUD.countUp(els.hudKm, lastKm, r.km, 700, fmtKm);
    lastKm = r.km;
    applySky(r.level);
    setProgress(r.answeredCount, r.total);
    els.qLevel.textContent = r.label;

    setTimeout(async () => {
      if (r.finished) { showDone({ score: r.score, km: r.km }); return; }
      answering = false;
      await refreshState();
    }, r.correct ? 1500 : 1500);
  }

  /* --------------------------- animasi --------------------------- */
  function boostAstro(level, km, points, streak) {
    // restart animasi dorong
    els.astro.classList.remove('astro--boost');
    void els.astro.offsetWidth;
    els.astro.classList.add('astro--boost', 'astro--pulse');
    window.Space.burstDrift(-80 * level);

    // Naik halus ke ketinggian baru (transisi CSS pada `bottom`).
    const target = astroBottomFor(level);
    els.astro.style.bottom = target + 'px';

    // Atur arah miring agar tiap tingkat bergantian (terasa hidup).
    const dir = (level % 2 === 0) ? 1 : -1;
    els.astro.style.setProperty('--dir', dir);

    launchDust();

    // popup "+poin" melayang dari astronot
    if (points > 0) popPoints(points, streak);

    setTimeout(() => {
      els.astro.classList.remove('astro--boost');
    }, 1000);
    setTimeout(() => els.astro.classList.remove('astro--pulse'), 680);
  }

  /** Popup angka poin melayang di atas astronot. */
  function popPoints(points, streak) {
    if (!els.pointsLayer) return;
    const layer = els.pointsLayer;
    const ar = els.astro.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'pts-pop';
    el.textContent = '+' + HUD.formatFull(points);
    if (streak >= 2) el.classList.add('pts-pop--hot');
    el.style.left = (ar.left + ar.width / 2) + 'px';
    el.style.top = (ar.top - 6) + 'px';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  /** Percikan debu di permukaan bulan saat astronot lepas landas. */
  function launchDust() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const n = window.innerWidth < 480 ? 8 : 14;
    const mr = els.moon.getBoundingClientRect();
    const sr = els.stage.getBoundingClientRect();
    const cx = mr.left - sr.left + mr.width / 2;
    const cy = mr.top - sr.top + mr.height * 0.06;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('span');
      d.className = 'stage__dust';
      d.style.left = cx + 'px';
      d.style.top = cy + 'px';
      const dx = (Math.random() * 2 - 1) * 60;
      const dy = -(Math.random() * 26 + 8);
      d.style.setProperty('--dx', dx.toFixed(0) + 'px');
      d.style.setProperty('--dy', dy.toFixed(0) + 'px');
      d.style.animationDelay = (Math.random() * 0.12) + 's';
      els.stage.appendChild(d);
      setTimeout(() => d.remove(), 900);
    }
  }

  /** Efek salah: layar kedip merah, tanpa animasi jatuh. */
  function wrongFlash() {
    document.body.classList.add('is-danger');
    els.dangerFlash.classList.remove('on');
    void els.dangerFlash.offsetWidth;
    els.dangerFlash.classList.add('on');
    if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch { /* ignore */ } }

    // astronot hanya bergoyang ringan (tetap di posisinya)
    els.astro.classList.add('astro--shake');
    setTimeout(() => els.astro.classList.remove('astro--shake'), 500);

    setTimeout(() => {
      els.dangerFlash.classList.remove('on');
      document.body.classList.remove('is-danger');
    }, 1200);
  }

  /* --------------------------- selesai --------------------------- */
  function showDone(state) {
    if (finished) return;
    finished = true;
    disarm();
    const total = (state && typeof state.score === 'number') ? state.score : lastScore;
    els.doneScore.textContent = HUD.formatFull(total);
    els.doneOverlay.classList.add('active');
    HUD.starConfetti(els.confetti, 40, 3500);
    setTimeout(() => { location.href = '/result'; }, 2600);
  }

  /* --------------------------- anti-cheat --------------------------- */
  function arm() {
    armed = true;
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);
    // Blokir klik kanan & shortcut menyalin / DevTools.
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.addEventListener('keydown', onKey);
  }

  function disarm() {
    armed = false;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pagehide', onPageHide);
  }

  function block(e) { e.preventDefault(); }

  function onKey(e) {
    const k = e.key || '';
    // Ctrl/Cmd + (U, C, X, V, A, P, S) dan F12
    if (e.key === 'F12') { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && /^[ucxvap s]/i.test(k)) { e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && /^[ijc]$/i.test(k)) { e.preventDefault(); }
  }

  function onVisibility() {
    if (document.hidden) triggerViolation();
  }
  function onBlur() {
    // Blur window sering dianggap keluar; sesuai Opsi 1 (ketat).
    triggerViolation();
  }
  function onPageHide() { triggerViolation(true); }

  let violationSent = false;
  function triggerViolation(beacon) {
    if (!armed || locked || finished || violationSent) return;
    violationSent = true;
    locked = true;
    disarm();

    const payload = JSON.stringify({ id, reason: 'left_page' });
    if (beacon && navigator.sendBeacon) {
      try { navigator.sendBeacon('/api/violation', new Blob([payload], { type: 'application/json' })); } catch { /* ignore */ }
    } else {
      fetch('/api/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => { /* ignore */ });
    }

    els.violationOverlay.classList.add('active');
    showPopupThenLock();
  }

  function showPopupThenLock() {
    setTimeout(() => {
      els.violationOverlay.classList.remove('active');
      lockNow();
    }, 2200);
  }

  function lockNow() {
    locked = true;
    disarm();
    els.lockedOverlay.classList.add('active');
    startPolling();
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(checkAccess, 5000);
  }

  async function checkAccess() {
    const res = await API.post('/api/state', { id });
    if (res.ok && res.data.state.status === 'mengerjakan') {
      clearInterval(pollTimer); pollTimer = null;
      els.lockedHint.textContent = 'Akses diberikan! Melanjutkan misi…';
      location.reload();
    } else {
      els.lockedHint.textContent = 'Masih menunggu izin admin…';
    }
  }

  els.checkAccessBtn.addEventListener('click', checkAccess);

  /* --------------------------- init --------------------------- */
  async function refreshState() {
    const res = await API.post('/api/state', { id });
    if (!res.ok) {
      if (res.status === 404) { location.replace('/'); return; }
      return;
    }
    renderState(res.data.state);
  }

  function showGate(done) {
    const gate = document.createElement('div');
    gate.className = 'overlay overlay--locked active';
    gate.innerHTML =
      '<div class="locked card glass">' +
      '<div class="locked__lock"></div>' +
      '<h2 class="locked__title" style="color:#ffd166">SEBELUM MULAI</h2>' +
      '<p class="locked__text">Kerjakan dengan jujur. <strong>Jangan keluar</strong> dari halaman ini, ' +
      'membuka aplikasi lain, atau membiarkan layar mati. Jika kamu keluar, misi <strong>langsung terkunci</strong> ' +
      'dan hanya admin yang bisa membukanya.</p>' +
      '<button class="btn btn--primary" type="button" id="gateBtn" style="margin-top:16px">Saya Siap, Mulai</button>' +
      '</div>';
    document.body.appendChild(gate);
    gate.querySelector('#gateBtn').addEventListener('click', () => {
      gate.remove();
      done();
    });
  }

  window.addEventListener('resize', () => { if (current) moveAstro(current.level, false); });

  async function boot() {
    await refreshState();
    // Tampilkan gerbang peringatan hanya jika misi masih berjalan.
    if (!locked && !finished && current && current.status === 'mengerjakan') {
      showGate(() => { arm(); });
    } else {
      arm();
    }
  }

  boot();
})();
