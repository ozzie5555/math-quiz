/* =========================================================================
   result.js — nilai + review pembahasan (rumus & langkah)
   ========================================================================= */
(function () {
  'use strict';

  const id = API.load('mq_id');
  if (!id) { location.replace('/'); return; }

  const els = {
    nama: document.getElementById('resNama'),
    scoreValue: document.getElementById('scoreValue'),
    scoreCircle: document.getElementById('scoreCircle'),
    statBenar: document.getElementById('statBenar'),
    statKm: document.getElementById('statKm'),
    statLevel: document.getElementById('statLevel'),
    rumusList: document.getElementById('rumusList'),
    review: document.getElementById('review'),
    confetti: document.getElementById('confetti'),
  };

  function fmtKm(km) { return Number(km).toLocaleString('id-ID'); }

  function keyOf(list, value) {
    const i = list.findIndex((x) => x === value);
    return i >= 0 ? ['A', 'B', 'C', 'D'][i] : '?';
  }

  function renderReview(item) {
    const div = document.createElement('article');
    div.className = 'review-item' + (item.correct ? '' : ' review-item--wrong');

    const chosenKey = keyOf(item.options, item.chosen);
    const answerKey = keyOf(item.options, item.answer);

    const langkah = item.langkah.map((s) => '<li>' + escapeHtml(s) + '</li>').join('');

    div.innerHTML =
      '<div class="review-item__head">' +
        '<span class="review-item__no">Soal ' + item.number + '</span>' +
        '<span class="badge ' + (item.correct ? 'badge--ok' : 'badge--no') + '">' +
          (item.correct ? 'BENAR' : 'SALAH') + '</span>' +
      '</div>' +
      '<p class="review-item__text">' + escapeHtml(item.text) + '</p>' +
      '<div class="review-item__row"><span class="k">Jawabanmu</span>' +
        '<span class="' + (item.correct ? 'v--ok' : 'v--no') + '">' + chosenKey + '. ' + escapeHtml(item.chosen) + '</span></div>' +
      '<div class="review-item__row"><span class="k">Kunci</span>' +
        '<span class="v--ok">' + answerKey + '. ' + escapeHtml(item.answer) + '</span></div>' +
      '<div class="rumus-box">' +
        '<div class="rumus-box__label">Rumus</div>' +
        '<div class="rumus-box__formula">' + escapeHtml(item.rumus) + '</div>' +
        '<div class="rumus-box__label">Cara Pengerjaan</div>' +
        '<ul class="langkah">' + langkah + '</ul>' +
      '</div>';

    return div;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function boot() {
    const res = await API.post('/api/result', { id });
    if (!res.ok || !res.data.result) { location.replace('/'); return; }

    const r = res.data.result;
    const rumusUtama = res.data.rumusUtama || [];

    els.nama.textContent = r.nama + ' · Absen ' + r.absen;
    document.body.setAttribute('data-sky', String(r.level));

    // Nilai count-up + ring
    HUD.countUp(els.scoreValue, 0, r.nilai, 1200);
    const circ = 2 * Math.PI * 52; // ~327
    els.scoreCircle.style.strokeDasharray = circ;
    els.scoreCircle.style.strokeDashoffset = circ;
    requestAnimationFrame(() => {
      els.scoreCircle.style.strokeDashoffset = String(circ * (1 - r.nilai / 100));
      els.scoreCircle.style.stroke = r.nilai >= 70 ? 'var(--benar)' : r.nilai >= 40 ? 'var(--emas)' : 'var(--salah)';
    });

    els.statBenar.textContent = r.benar + '/' + r.total;
    els.statKm.textContent = fmtKm(r.km);
    els.statLevel.textContent = r.label;

    // Rumus utama
    els.rumusList.innerHTML = rumusUtama.map((x) =>
      '<li><span class="r-nama">' + escapeHtml(x.nama) + '</span>' +
      '<span class="r-rumus">' + escapeHtml(x.rumus) + '</span></li>'
    ).join('');

    // Review
    r.review.forEach((item) => els.review.appendChild(renderReview(item)));

    // Efek hujan bintang
    HUD.starConfetti(els.confetti, 36, 4000);

    // Bersihkan sesi agar tidak bisa ulang tanpa izin admin.
    API.clear('mq_id');
    API.clear('mq_nama');
  }

  boot();
})();
