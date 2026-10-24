/* Penghubung tampilan GitHub Pages ke Apps Script (pengganti google.script.run). */
(function () {
  function panggilApi(fn, args) {
    if (!window.API_URL || /GANTI_DENGAN/.test(window.API_URL)) return Promise.reject(new Error('API_URL di config.js belum diisi.'));
    return fetch(window.API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // tanpa preflight CORS
      body: JSON.stringify({ fn: fn, args: args })
    }).then(function (r) {
      if (!r.ok) throw new Error('Server tidak merespons (' + r.status + ').');
      return r.text();
    }).then(function (t) {
      var j; try { j = JSON.parse(t); } catch (e) { throw new Error('Jawaban server tidak dikenali. Pastikan Apps Script sudah di-deploy versi terbaru dengan akses "Anyone".'); }
      if (!j.ok) throw new Error(j.error || 'Terjadi kesalahan.');
      return j.data;
    }, function (e) {
      if (e && /Failed to fetch|NetworkError|Load failed/i.test(e.message)) throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.');
      throw e;
    });
  }
  function pemanggil(ok, gagal) {
    return new Proxy({}, {
      get: function (_, nama) {
        if (nama === 'withSuccessHandler') return function (f) { return pemanggil(f, gagal); };
        if (nama === 'withFailureHandler') return function (f) { return pemanggil(ok, f); };
        if (nama === 'withUserObject') return function () { return pemanggil(ok, gagal); };
        return function () {
          panggilApi(String(nama), Array.prototype.slice.call(arguments))
            .then(function (d) { ok && ok(d); }, function (e) { if (gagal) gagal(e); else console.error(e); });
        };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = { run: pemanggil(null, null) };
  window.panggilApi = panggilApi;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tampilGalat(pesan) {
    var main = document.querySelector('main') || document.body;
    main.innerHTML = '<section class="kartu"><h2>Halaman tidak dapat dibuka</h2><p style="color:var(--ink-2)">' + esc(pesan) +
      '</p><p><a class="tombol kedua" href="status.html">Cek status permohonan</a> <a class="tombol kedua" href="javascript:location.reload()">Coba lagi</a></p></section>';
    main.style.display = '';
  }
  /** Mengambil data awal halaman lalu menjalankan skrip halaman. */
  window.muatHalaman = function (page) {
    var q = new URLSearchParams(location.search), p = {};
    q.forEach(function (v, k) { p[k] = v.slice(0, 200); });
    var nama = page === 'pemohon' ? (p.mode || '') : page;
    var main = document.querySelector('main');
    var tanda = document.createElement('div');
    tanda.id = 'memuatHalaman';
    tanda.setAttribute('role', 'status');
    tanda.style.cssText = 'padding:48px 16px;text-align:center;color:#5b6472;font:15px system-ui,sans-serif';
    tanda.textContent = 'Memuat…';
    if (main) { main.style.display = 'none'; main.parentNode.insertBefore(tanda, main); }
    panggilApi('halaman', [nama, p]).then(function (data) {
      window.__DATA__ = data;
      tanda.remove(); if (main) main.style.display = '';
      Array.prototype.forEach.call(document.querySelectorAll('script[type="text/x-tunda"]'), function (s) {
        var b = document.createElement('script'); b.text = s.textContent; s.parentNode.replaceChild(b, s);
      });
      if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
    }, function (e) { tanda.remove(); tampilGalat(e.message); });
  };
})();
