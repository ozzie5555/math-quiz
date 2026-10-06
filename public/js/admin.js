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
    scoreBody: document.querySelector('#scoreTable tbody'),
    dataBody: document.querySelector('#dataTable tbody'),
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    autoRefresh: document.getElementById('autoRefresh'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportBtn: document.getElementById('exportBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    lastUpdated: document.getElementById('lastUpdated'),
  };

  let password = API.load('mq_admin_pw') || '';
  let data = { attempts: [], scoreboard: [] };
  let refreshTimer = null;
  let knownIds = new Set();

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

  function medal(rank) {
    return rank;
  }

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

    els.adminStats.innerHTML =
      statCard(total, 'Total Peserta') +
      statCard(selesai, 'Selesai') +
      statCard(terkunci, 'Terkunci') +
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
    els.scoreBody.innerHTML = rows.map((a) => {
      const rankCls = a.rank <= 3 ? ' rank--' + a.rank : '';
      return '<tr>' +
        '<td class="rank' + rankCls + '">' + medal(a.rank) + '</td>' +
        '<td>' + escapeHtml(a.nama) + '</td>' +
        '<td>' + escapeHtml(a.absen) + '</td>' +
        '<td><strong>' + a.nilai + '</strong></td>' +
        '<td>' + a.benar + '/' + a.total + '</td>' +
        '<td>' + fmtKm(a.km) + '</td>' +
        '<td>' + statusBadge(a.status) + '</td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:#a0a3c4">Belum ada data.</td></tr>';
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
        '<td><strong>' + a.nilai + '</strong></td>' +
        '<td>' + a.benar + '/' + a.total + '</td>' +
        '<td>' + (a.pelanggaran > 0 ? a.pelanggaran : '—') + '</td>' +
        '<td>' + statusBadge(a.status) + '</td>' +
        '<td><div class="row-actions">' + actions.join('') + '</div></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:#a0a3c4">Tidak ada data.</td></tr>';

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
    const nama = item ? item.nama : '';

    const labels = { unlock: 'Izinkan lanjut', reset: 'Reset nilai', delete: 'Hapus' };
    if (!confirm(labels[act] + ' untuk "' + nama + '"?')) return;

    btn.disabled = true;
    const res = await API.post('/api/admin/' + act, { password, id });
    btn.disabled = false;

    if (res.ok) {
      API.toast('Berhasil: ' + labels[act] + ' (' + nama + ')', 'ok');
      await fetchData(true);
    } else {
      API.toast('Gagal: ' + (res.data.message || res.data.error || 'error'), 'err');
    }
  });

  els.searchInput.addEventListener('input', renderTable);
  els.statusFilter.addEventListener('change', renderTable);
  els.refreshBtn.addEventListener('click', () => fetchData(false));

  /* ------------------------------ export ------------------------------ */
  els.exportBtn.addEventListener('click', () => {
    const rows = data.attempts || [];
    if (!rows.length) { API.toast('Belum ada data untuk diexport.', 'err'); return; }
    const header = ['Nama', 'No Absen', 'Nilai', 'Benar', 'Total', 'Ketinggian (km)', 'Status', 'Pelanggaran'];
    const lines = [header.join(',')];
    rows.slice().sort((a, b) => b.nilai - a.nilai).forEach((a) => {
      lines.push([
        '"' + a.nama.replace(/"/g, '""') + '"',
        '"' + a.absen + '"',
        a.nilai,
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
  })();
})();
