/**
 * player.js — Onur Sports Web
 * - Geri Dön (ana menüye dön)
 * - Maçın kaynak butonları doğrudan üst barda (Kaynak 1, Kaynak 2 vb.)
 * - 1. kaynakla otomatik başlar
 * - Tam ekran desteği
 */

const Player = (() => {
  let currentMatch = null;
  let currentSourceIndex = 0;
  let onCloseCallback = null;

  const overlay         = document.getElementById('player-overlay');
  const titleEl         = document.getElementById('player-match-title');
  const sourcesGroup    = document.getElementById('player-sources-group');
  const iframe          = document.getElementById('player-iframe');
  const loading         = document.getElementById('player-loading');
  const closeBtn        = document.getElementById('player-close-btn');
  const fsBtn           = document.getElementById('player-fullscreen-btn');

  function _toggleFullscreen() {
    const el = overlay;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  const topbar = document.getElementById('player-topbar');
  const trigger = document.getElementById('player-top-trigger');
  let fsHideTimeout = null;

  function _revealTopbar() {
    if (!document.fullscreenElement) return;
    clearTimeout(fsHideTimeout);
    topbar?.classList.add('player-topbar--visible');
  }

  function _scheduleHideTopbar() {
    if (!document.fullscreenElement) return;
    clearTimeout(fsHideTimeout);
    fsHideTimeout = setTimeout(() => {
      topbar?.classList.remove('player-topbar--visible');
    }, 1500);
  }

  trigger?.addEventListener('mouseenter', _revealTopbar);
  topbar?.addEventListener('mouseenter', _revealTopbar);
  topbar?.addEventListener('mouseleave', _scheduleHideTopbar);
  trigger?.addEventListener('mouseleave', _scheduleHideTopbar);

  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    if (fsBtn) fsBtn.textContent = isFs ? '⊡' : '⛶';

    if (isFs) {
      overlay.classList.add('player-overlay--fullscreen');
      _revealTopbar();
      _scheduleHideTopbar();
    } else {
      overlay.classList.remove('player-overlay--fullscreen');
      topbar?.classList.remove('player-topbar--visible');
      clearTimeout(fsHideTimeout);
    }
  });

  function _renderSourceButtons() {
    const divider = document.getElementById('player-btn-divider');
    if (!sourcesGroup) return;
    sourcesGroup.innerHTML = '';

    const sources = currentMatch?.sources || [];
    // Yalnızca 1'den fazla kaynak varsa kaynak butonları ve ayırıcı gösterilir
    if (sources.length <= 1) {
      if (divider) divider.style.display = 'none';
      return;
    }

    if (divider) divider.style.display = 'block';

    sources.forEach((src, idx) => {
      const btn = document.createElement('button');
      btn.className = `player-source-tab ${idx === currentSourceIndex ? 'player-source-tab--active' : ''}`;
      btn.textContent = `Kaynak ${idx + 1}`;
      btn.title = `Kaynak ${idx + 1}'e geç`;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx === currentSourceIndex) return;
        changeSource(idx);
      });

      sourcesGroup.appendChild(btn);
    });
  }

  function open(match, initialSourceIndex = 0, onClose) {
    currentMatch = match;
    currentSourceIndex = initialSourceIndex;
    onCloseCallback = onClose;

    const matchTitle = match.home && match.away
      ? `${match.home} vs ${match.away}`
      : match.title || '';

    titleEl.textContent = matchTitle;

    _renderSourceButtons();

    loading.style.display = 'flex';
    iframe.src = '';

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const activeSrc = match.sources?.[currentSourceIndex];
    if (activeSrc && activeSrc.url) {
      setTimeout(() => { iframe.src = activeSrc.url; }, 100);
    }
    iframe.onload = () => { loading.style.display = 'none'; };
  }

  function close() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    iframe.src = 'about:blank';
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    const cb = onCloseCallback;
    onCloseCallback = null;
    currentMatch = null;
    currentSourceIndex = 0;
    cb?.();
  }

  function isOpen() { return overlay.style.display === 'flex'; }

  closeBtn?.addEventListener('click', close);
  fsBtn?.addEventListener('click', _toggleFullscreen);

  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  function changeSource(newIndex) {
    if (!currentMatch || !currentMatch.sources?.[newIndex]) return;
    currentSourceIndex = newIndex;
    _renderSourceButtons();

    const newSource = currentMatch.sources[newIndex];
    loading.style.display = 'flex';
    iframe.src = '';
    setTimeout(() => { iframe.src = newSource.url; }, 100);
  }

  return { open, close, isOpen, changeSource };
})();

window.Player = Player;
