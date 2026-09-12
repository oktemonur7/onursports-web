/**
 * player.js — Onur Sports Web
 * - ← Geri (ana menüye dön)
 * - 📡 Kaynak Seç (popup'ı yeniden aç)
 * - Tam ekran (Fullscreen API)
 * - Topbar mouse hareketinde göster, 4 sn sonra gizle
 */

const Player = (() => {
  let topbarTimer = null;
  let onCloseCallback = null;
  let onSelectSourceCallback = null;

  const overlay      = document.getElementById('player-overlay');
  const topbar       = document.getElementById('player-topbar');
  const titleEl      = document.getElementById('player-match-title');
  const labelEl      = document.getElementById('player-source-label');
  const iframe       = document.getElementById('player-iframe');
  const loading      = document.getElementById('player-loading');
  const closeBtn     = document.getElementById('player-close-btn');
  const sourceSwitchBtn = document.getElementById('player-source-switch-btn');
  const fsBtn        = document.getElementById('player-fullscreen-btn');

  function _showTopbar() {
    topbar.classList.remove('player-topbar--hidden');
    clearTimeout(topbarTimer);
    topbarTimer = setTimeout(() => {
      topbar.classList.add('player-topbar--hidden');
    }, 4000);
  }

  function _toggleFullscreen() {
    const el = document.getElementById('player-frame-wrap');
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  // matchTitle, source, onClose, onSelectSource (opsiyonel — çok kaynak varsa gösterilir)
  function open(matchTitle, source, onClose, onSelectSource) {
    onCloseCallback = onClose;
    onSelectSourceCallback = onSelectSource || null;

    titleEl.textContent = matchTitle;
    labelEl.textContent = source.label;

    // "Kaynak Seç" butonu — sadece birden fazla kaynak varsa göster
    if (sourceSwitchBtn) {
      sourceSwitchBtn.style.display = onSelectSource ? 'inline-flex' : 'none';
    }

    loading.style.display = 'flex';
    iframe.src = '';

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => { iframe.src = source.url; }, 100);
    iframe.onload = () => { loading.style.display = 'none'; };

    _showTopbar();
  }

  function close() {
    clearTimeout(topbarTimer);
    if (document.fullscreenElement) document.exitFullscreen?.();
    iframe.src = 'about:blank';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    const cb = onCloseCallback;
    onCloseCallback = null;
    onSelectSourceCallback = null;
    cb?.();
  }

  function isOpen() { return overlay.style.display === 'flex'; }

  // ── Butonlar ──
  closeBtn?.addEventListener('click', close);

  sourceSwitchBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Yayından çıkmadan (iframe'i bozmadan) üstüne popup aç
    onSelectSourceCallback?.();
  });

  fsBtn?.addEventListener('click', _toggleFullscreen);

  // Mouse hareketi veya üst alana gelme → topbar göster
  const sensor = document.getElementById('player-topbar-sensor');
  sensor?.addEventListener('mouseenter', _showTopbar);
  topbar?.addEventListener('mouseenter', _showTopbar);
  overlay?.addEventListener('mousemove', _showTopbar);

  // Fare ekranın üst kısmına geldiğinde (iframe üzerinde olsa bile document üzerinden yakalama)
  document.addEventListener('mousemove', (e) => {
    if (isOpen() && e.clientY < 90) {
      _showTopbar();
    }
  });

  // ESC tuşu
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    // Eğer popup açıksa ESC tuşunu popup kapatsın, player kalmaya devam etsin
    if (document.getElementById('source-popup-overlay')?.classList.contains('popup-overlay--visible')) {
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  // Fullscreen değiştiğinde ikonu güncelle
  document.addEventListener('fullscreenchange', () => {
    if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '⊡' : '⛶';
  });

  function changeSource(newSource) {
    labelEl.textContent = newSource.label;
    loading.style.display = 'flex';
    iframe.src = '';
    setTimeout(() => { iframe.src = newSource.url; }, 100);
    _showTopbar();
  }

  return { open, close, isOpen, changeSource };
})();

window.Player = Player;
