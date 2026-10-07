/* =========================================================================
   admin.js — panel admin (login, tabel, scoreboard, aksi)
   ========================================================================= */
(function () {
  'use strict';

  const els = {
    login: document.getElementById('login'),
    loginForm: document.getElementById('loginForm'),
    password: document.getElementById('password'),
    loginError: document.getElementById('loginError'),
    admin: document.getElementById('admin'),
    adminSub: document.getElementById('adminSub'),
    adminStats: document.getElementById('adminStats'),
    leaderboard: document.getElementById('leaderboard'),
    dataBody: document.querySelector('#dataTable tbody'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    autoRefresh: document.getElementById('autoRefresh'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportBtn: document.getElementById('exportBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    lastUpdated: document.getElementById('lastUpdated'),
    confirmOverlay: document.getElementById('confirmOverlay'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmText: document.getElementById('confirmText'),
    confirmOk: document.getElementById('confirmOk'),
    confirmCancel: document.getElementById('confirmCancel'),
  };

  let password = API.load('mq_admin_pw') || '';
  let data = { attempts: [], scoreboard: [] };
  let refreshTimer = null;
  let knownIds = new Set();
  let pendingAction = null; // { act, id, nama, labels }

  const STATUS_LABEL = { mengerjakan: 'Mengerjakan', selesai: 'Selesai', terkunci: 'Terkunci' };

  function statusBadge(status) {
    return '<span class="status-badge status--' + status + '">' + (STATUS_LABEL[status] || status) + '</span>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function fmtKm(km) { return Number(km || 0).toLocaleString('id-ID') + ' km'; }
  function fmtPoin(n) { return HUD ? HUD.formatFull(n) : Number(n || 0).toLocaleString('id-ID'); }
  function fmtPoinCompact(n) { return HUD ? HUD.formatCompact(n) : String(n || 0); }

  /* ------------------------------ login ------------------------------ */
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = els.password.value;
    const res = await API.post('/api/admin/scores', { password: pw });
    if (!res.ok) {
      els.loginError.textContent = 'Password salah.';
      els.password.value = '';
      return;
    }
    password = pw;
    API.store('mq_admin_pw', pw);
    enterDashboard(res.data);
  });

  function enterDashboard(payload) {
    els.login.classList.add('hidden');
    document.body.classList.remove('is-login');
    els.admin.hidden = false;
    applyData(payload);
    startAutoRefresh();
  }

  els.logoutBtn.addEventListener('click', () => {
    API.clear('mq_admin_pw');
    password = '';
    location.reload();
  });

  /* ------------------------------ data ------------------------------ */
  async function fetchData(silent) {
    const res = await API.post('/api/admin/scores', { password });
    if (!res.ok) {
      if (res.status === 401) {
        API.clear('mq_admin_pw');
        location.reload();
        return;
      }
      if (!silent) API.toast('Gagal memuat data.', 'err');
      return;
    }
    applyData(res.data);
  }

  function applyData(payload) {
    data = payload;

    // statistik
    const attempts = data.attempts || [];
    const total = attempts.length;
    const selesai = attempts.filter((a) => a.status === 'selesai').length;
    const terkunci = attempts.filter((a) => a.status === 'terkunci').length;
    const rata = selesai
      ? Math.round(attempts.filter((a) => a.status === 'selesai').reduce((s, a) => s + a.nilai, 0) / selesai)
      : 0;
    const rataPoin = selesai
      ? Math.round(attempts.filter((a) => a.status === 'selesai').reduce((s, a) => s + (a.score || 0), 0) / selesai)
      : 0;

    els.adminStats.innerHTML =
      statCard(total, 'Total Peserta') +
      statCard(selesai, 'Selesai') +
      statCard(terkunci, 'Terkunci') +
      statCard(fmtPoinCompact(rataPoin), 'Rata-rata Poin') +
      statCard(rata, 'Rata-rata Nilai');

    renderScoreboard();
    renderTable();
    els.lastUpdated.textContent = 'Terakhir diperbarui: ' + new Date().toLocaleTimeString('id-ID');
  }

  function statCard(num, label) {
    return '<div class="mini-stat"><div class="mini-stat__num">' + num +
      '</div><div class="mini-stat__label">' + label + '</div></div>';
  }

  function renderScoreboard() {
    const rows = (data.scoreboard || []).slice(0, 20);
    els.leaderboard.innerHTML = rows.map((a) => {
      const topCls = a.rank <= 3 ? ' lb-row--top' + a.rank : '';
      const nama = escapeHtml(a.nama || 'Tanpa Nama');
      const absen = escapeHtml(String(a.absen ?? '—'));
      const rawName = (a.nama || '').trim();
      const initial = rawName ? rawName.charAt(0).toUpperCase() : '?';
      return '<div class="lb-row' + topCls + '">' +
        '<div class="lb-rank">' + a.rank + '</div>' +
        '<div class="lb-ava" aria-hidden="true">' + escapeHtml(initial) + '</div>' +
        '<div class="lb-main">' +
          '<p class="lb-name">' + nama + '</p>' +
          '<div class="lb-absen">Absen ' + absen + '</div>' +
        '</div>' +
        '<div class="lb-side">' +
          '<div class="lb-score">' + fmtPoin(a.score) + '</div>' +
          '<div class="lb-meta">' + statusBadge(a.status) + '</div>' +
        '</div>' +
      '</div>';
    }).join('') || '<div class="lb-empty">Belum ada data.</div>';
  }

  function renderTable() {
    const q = (els.searchInput.value || '').toLowerCase();
    const status = els.statusFilter.value;

    const rows = (data.attempts || []).filter((a) => {
      const matchQ = !q || a.nama.toLowerCase().includes(q) || String(a.absen).includes(q);
      const matchS = !status || a.status === status;
      return matchQ && matchS;
    });

    rows.sort((a, b) => b.updated_at - a.updated_at);

    els.dataBody.innerHTML = rows.map((a) => {
      const isNew = !knownIds.has(a.id);
      const actions = [];
      if (a.status === 'terkunci') {
        actions.push('<button class="icon-btn icon-btn--ok" data-act="unlock" data-id="' + a.id + '">Izinkan Lanjut</button>');
      }
      if (a.status === 'selesai') {
        actions.push('<button class="icon-btn icon-btn--warn" data-act="reset" data-id="' + a.id + '">Reset</button>');
      }
      actions.push('<button class="icon-btn icon-btn--danger" data-act="delete" data-id="' + a.id + '">Hapus</button>');

      return '<tr class="' + (isNew ? 'row-new' : '') + '">' +
        '<td>' + escapeHtml(a.nama) + '</td>' +
        '<td>' + escapeHtml(a.absen) + '</td>' +
        '<td><strong class="cell-poin">' + fmtPoin(a.score) + '</strong></td>' +
        '<td>' + a.nilai + '</td>' +
        '<td>' + (a.maxStreak || 0) + '</td>' +
        '<td>' + a.benar + '/' + a.total + '</td>' +
        '<td>' + (a.pelanggaran > 0 ? a.pelanggaran : '—') + '</td>' +
        '<td>' + statusBadge(a.status) + '</td>' +
        '<td><div class="row-actions">' + actions.join('') + '</div></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="9" style="text-align:center;color:#a0a3c4">Tidak ada data.</td></tr>';

    // update known ids
    (data.attempts || []).forEach((a) => knownIds.add(a.id));
  }

  /* ------------------------------ aksi ------------------------------ */
  els.dataBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id');
    const item = (data.attempts || []).find((a) => a.id === id);
    if (!item) return;

    openConfirm(act, item);
  });

  function openConfirm(act, item) {
    const labels = {
      unlock: { title: 'Izinkan Melanjutkan', verb: 'mengizinkan', action: 'unlock', cls: '' },
      reset: { title: 'Reset Nilai', verb: 'me-reset', action: 'reset', cls: 'confirm__btn--danger' },
      delete: { title: 'Hapus Data', verb: 'menghapus', action: 'delete', cls: 'confirm__btn--danger' },
    };
    const cfg = labels[act];
    if (!cfg) return;

    pendingAction = { act, id: item.id, nama: item.nama, absen: item.absen, title: cfg.title, okLabel: cfg.okLabel };

    els.confirmTitle.textContent = cfg.title;
    els.confirmText.innerHTML = 'Kamu akan <strong>' + cfg.verb + '</strong> data <strong>' + escapeHtml(item.nama) + '</strong>' +
      (item.absen ? ' (Absen <strong>' + escapeHtml(String(item.absen)) + '</strong>)' : '') + '. Lanjutkan?';

    els.confirmOk.textContent = cfg.action === 'unlock' ? 'Ya, Izinkan' : 'Ya, ' + (act === 'delete' ? 'Hapus' : 'Reset');
    els.confirmOk.classList.toggle('confirm__btn--danger', cfg.action !== 'unlock');

    els.confirmOverlay.classList.add('active');
    els.confirmOk.focus();
  }

  function closeConfirm() {
    els.confirmOverlay.classList.remove('active');
    pendingAction = null;
  }

  async function submitConfirmed() {
    const p = pendingAction;
    if (!p) return;
    closeConfirm();

    const labels = { unlock: 'Izinkan lanjut', reset: 'Reset nilai', delete: 'Hapus' };
    const res = await API.post('/api/admin/' + p.act, { password, id: p.id });

    if (res.ok) {
      API.toast('Berhasil: ' + labels[p.act] + ' (' + p.nama + ')', 'ok');
      await fetchData(true);
    } else {
      API.toast('Gagal: ' + (res.data.message || res.data.error || 'error'), 'err');
    }
  }

  els.confirmOk.addEventListener('click', submitConfirmed);
  els.confirmCancel.addEventListener('click', closeConfirm);
  els.confirmOverlay.addEventListener('click', (e) => {
    if (e.target === els.confirmOverlay) closeConfirm();
  });
  document.addEventListener('keydown', (e) => {
    if (els.confirmOverlay.classList.contains('active')) {
      if (e.key === 'Escape') closeConfirm();
      if (e.key === 'Enter') { e.preventDefault(); submitConfirmed(); }
    }
  });

  els.searchInput.addEventListener('input', renderTable);
  els.statusFilter.addEventListener('change', renderTable);
  els.refreshBtn.addEventListener('click', () => fetchData(false));

  /* ------------------------------ export ------------------------------ */
  els.exportBtn.addEventListener('click', () => {
    const rows = data.attempts || [];
    if (!rows.length) { API.toast('Belum ada data untuk diexport.', 'err'); return; }
    const header = ['Nama', 'No Absen', 'Poin', 'Nilai', 'Streak Maks', 'Benar', 'Total', 'Ketinggian (km)', 'Status', 'Pelanggaran'];
    const lines = [header.join(',')];
    rows.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((a) => {
      lines.push([
        '"' + a.nama.replace(/"/g, '""') + '"',
        '"' + a.absen + '"',
        a.score || 0,
        a.nilai,
        a.maxStreak || 0,
        a.benar,
        a.total,
        a.km,
        a.status,
        a.pelanggaran,
      ].join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spaceman-math-quest_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    API.toast('CSV diunduh.', 'ok');
  });

  /* --------------------------- auto refresh --------------------------- */
  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (els.autoRefresh.checked && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 8000);
  }
  function stopAutoRefresh() { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; } }

  /* ------------------------------ init ------------------------------ */
  (async function init() {
    if (password) {
      const res = await API.post('/api/admin/scores', { password });
      if (res.ok) { enterDashboard(res.data); return; }
      API.clear('mq_admin_pw');
    }
    els.login.classList.remove('hidden');
    document.body.classList.add('is-login');
  })();
})();
