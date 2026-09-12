/**
 * player.js — Onur Sports Web
 * - Tam ekran (Fullscreen API)
 * - Topbar mouse hareketinde göster, 4 sn sonra gizle
 * - ESC / Kapat butonu ile çıkış
 */

const Player = (() => {
  let topbarTimer = null;
  let onCloseCallback = null;

  const overlay  = document.getElementById('player-overlay');
  const topbar   = document.getElementById('player-topbar');
  const titleEl  = document.getElementById('player-match-title');
  const labelEl  = document.getElementById('player-source-label');
  const iframe   = document.getElementById('player-iframe');
  const loading  = document.getElementById('player-loading');
  const closeBtn = document.getElementById('player-close-btn');
  const fsBtn    = document.getElementById('player-fullscreen-btn');

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
      fsBtn.textContent = '⛶';
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  function open(matchTitle, source, onClose) {
    onCloseCallback = onClose;
    titleEl.textContent = matchTitle;
    labelEl.textContent = source.label;

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
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    iframe.src = 'about:blank';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    onCloseCallback?.();
    onCloseCallback = null;
  }

  function isOpen() { return overlay.style.display === 'flex'; }

  // Buton event'leri
  closeBtn?.addEventListener('click', close);
  fsBtn?.addEventListener('click', _toggleFullscreen);

  // Mouse hareketi → topbar'ı göster
  overlay?.addEventListener('mousemove', _showTopbar);

  // ESC tuşu
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      close();
    }
  });

  // Fullscreen değiştiğinde butonu güncelle
  document.addEventListener('fullscreenchange', () => {
    if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '⊡' : '⛶';
  });

  return { open, close, isOpen };
})();

window.Player = Player;
