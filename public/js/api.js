/* =========================================================================
   api.js — helper fetch + util kecil
   ========================================================================= */
(function () {
  'use strict';

  async function post(path, data) {
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
      let body = {};
      try { body = await res.json(); } catch { /* ignore */ }
      return { ok: res.ok, status: res.status, data: body };
    } catch (err) {
      return { ok: false, status: 0, data: { error: 'network', message: 'Koneksi gagal. Periksa internetmu.' } };
    }
  }

  function query(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function store(key, val) { try { localStorage.setItem(key, val); } catch { /* ignore */ } }
  function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function clear(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }

  function toast(msg, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (type === 'ok' ? ' toast--ok' : type === 'err' ? ' toast--err' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast'; }, 2600);
  }

  window.API = { post, query, store, load, clear, toast };
})();
