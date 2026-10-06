/* =========================================================================
   app.js — halaman landing (input nama & absen)
   ========================================================================= */
(function () {
  'use strict';

  const form = document.getElementById('startForm');
  const namaEl = document.getElementById('nama');
  const absenEl = document.getElementById('absen');
  const btn = document.getElementById('startBtn');
  const errorEl = document.getElementById('formError');

  // Jika sudah ada sesi aktif di perangkat ini, tawarkan lanjut.
  const savedId = API.load('mq_id');
  const savedName = API.load('mq_nama');
  if (savedId && savedName && namaEl) {
    namaEl.value = savedName;
    const hint = document.createElement('p');
    hint.className = 'notice';
    hint.innerHTML = 'Kamu punya misi yang belum selesai. Isi nama & absen yang sama untuk melanjutkan.';
    form.insertBefore(hint, form.firstChild);
  }

  function setError(msg) {
    errorEl.textContent = msg || '';
  }

  // Hanya angka untuk absen
  absenEl.addEventListener('input', () => {
    absenEl.value = absenEl.value.replace(/[^0-9]/g, '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const nama = namaEl.value.trim().replace(/\s+/g, ' ');
    const absen = absenEl.value.trim();

    if (nama.length < 3) { setError('Nama lengkap minimal 3 karakter.'); namaEl.focus(); return; }
    if (!absen) { setError('Nomor absen wajib diisi.'); absenEl.focus(); return; }

    btn.disabled = true;
    const oldLabel = btn.querySelector('span').textContent;
    btn.querySelector('span').textContent = 'Menyiapkan…';

    const res = await API.post('/api/start', { nama, absen });

    if (res.ok) {
      API.store('mq_id', res.data.id);
      API.store('mq_nama', res.data.nama);
      // Warp transition lalu pindah ke kuis.
      playWarp(() => { location.href = '/quiz'; });
      return;
    }

    // Nama sudah ada -> coba pakai sesi lama bila cocok (nama sama).
    if (res.status === 409 && savedId && savedName &&
        savedName.toLowerCase() === nama.toLowerCase()) {
      // Lanjutkan sesi lama.
      playWarp(() => { location.href = '/quiz'; });
      return;
    }

    setError(res.data.message || 'Gagal memulai misi. Coba lagi.');
    btn.disabled = false;
    btn.querySelector('span').textContent = oldLabel;
  });

  function playWarp(done) {
    const warp = document.createElement('div');
    warp.className = 'warp active';
    for (let i = 0; i < 5; i++) {
      const line = document.createElement('i');
      line.style.setProperty('--r', (i * 72) + 'deg');
      warp.appendChild(line);
    }
    document.body.appendChild(warp);
    setTimeout(done, 520);
  }
})();
