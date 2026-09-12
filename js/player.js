/**
 * player.js — Onur Sports Web
 * - Geri Dön (ana menüye dön)
 * - Kaynak Seç (popup'ı yayın üstünde aç)
 * - Tam ekran (Fullscreen API)
 * - Sabit kalıcı üst bar (kaybolma/zamanlayıcı derdi yok)
 */

const Player = (() => {
  let onCloseCallback = null;
  let onSelectSourceCallback = null;

  const overlay         = document.getElementById('player-overlay');
  const titleEl         = document.getElementById('player-match-title');
  const labelEl         = document.getElementById('player-source-label');
  const iframe          = document.getElementById('player-iframe');
  const loading         = document.getElementById('player-loading');
  const closeBtn        = document.getElementById('player-close-btn');
  const sourceSwitchBtn = document.getElementById('player-source-switch-btn');
  const fsBtn           = document.getElementById('player-fullscreen-btn');

  function _toggleFullscreen() {
    const el = document.getElementById('player-frame-wrap');
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  function open(matchTitle, source, onClose, onSelectSource) {
    onCloseCallback = onClose;
    onSelectSourceCallback = onSelectSource || null;

    titleEl.textContent = matchTitle;
    labelEl.textContent = source.label;

    if (sourceSwitchBtn) {
      sourceSwitchBtn.style.display = onSelectSource ? 'inline-flex' : 'none';
    }

    loading.style.display = 'flex';
    iframe.src = '';

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => { iframe.src = source.url; }, 100);
    iframe.onload = () => { loading.style.display = 'none'; };
  }

  function close() {
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
    onSelectSourceCallback?.();
  });

  fsBtn?.addEventListener('click', _toggleFullscreen);

  // ESC tuşu
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (document.getElementById('source-popup-overlay')?.classList.contains('popup-overlay--visible')) {
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  // Fullscreen ikon güncelleme
  document.addEventListener('fullscreenchange', () => {
    if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '⊡' : '⛶';
  });

  function changeSource(newSource) {
    labelEl.textContent = newSource.label;
    loading.style.display = 'flex';
    iframe.src = '';
    setTimeout(() => { iframe.src = newSource.url; }, 100);
  }

  return { open, close, isOpen, changeSource };
})();

window.Player = Player;
