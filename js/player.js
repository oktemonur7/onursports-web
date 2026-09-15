/**
 * player.js — Onur Sports Web
 * - iframe (Falcon kaynakları) + HLS video (Betine .m3u8 kaynakları)
 * - Geri Dön, kaynak sekmeleri, tam ekran
 */

const Player = (() => {
  let currentMatch = null;
  let currentSourceIndex = 0;
  let onCloseCallback = null;
  let hlsInstance = null;

  const overlay      = document.getElementById('player-overlay');
  const titleEl      = document.getElementById('player-match-title');
  const sourcesGroup = document.getElementById('player-sources-group');
  const iframe       = document.getElementById('player-iframe');
  const videoEl      = document.getElementById('player-video');
  const loading      = document.getElementById('player-loading');
  const closeBtn     = document.getElementById('player-close-btn');
  const fsBtn        = document.getElementById('player-fullscreen-btn');

  function _toggleFullscreen() {
    if (!document.fullscreenElement) {
      overlay.requestFullscreen?.() || overlay.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  const topbar  = document.getElementById('player-topbar');
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
    if (sources.length <= 1) {
      if (divider) divider.style.display = 'none';
      return;
    }
    if (divider) divider.style.display = 'block';
    sources.forEach((src, idx) => {
      const btn = document.createElement('button');
      btn.className = 'player-source-tab' + (idx === currentSourceIndex ? ' player-source-tab--active' : '');
      btn.textContent = src.label || ('Kaynak ' + (idx + 1));
      btn.title = 'Kaynak ' + (idx + 1) + "'e geç";
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (idx === currentSourceIndex) return;
        changeSource(idx);
      });
      sourcesGroup.appendChild(btn);
    });
  }

  /** HLS.js ile .m3u8 oynat */
  function _playHLS(url) {
    // Önceki HLS instance'ı temizle
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    iframe.style.display = 'none';
    videoEl.style.display = 'block';
    videoEl.src = '';

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: false });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoEl);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        loading.style.display = 'none';
        videoEl.play().catch(() => {});
      });
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('[HLS] Fatal hata:', data);
          loading.style.display = 'none';
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      videoEl.src = url;
      videoEl.addEventListener('loadedmetadata', () => {
        loading.style.display = 'none';
        videoEl.play().catch(() => {});
      }, { once: true });
    } else {
      console.warn('[Player] HLS desteklenmiyor');
      loading.style.display = 'none';
    }
  }

  /** iframe ile oynat */
  function _playIframe(url) {
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    videoEl.style.display = 'none';
    videoEl.src = '';
    iframe.style.display = 'block';
    iframe.src = '';
    setTimeout(() => { iframe.src = url; }, 100);
    iframe.onload = () => { loading.style.display = 'none'; };
  }

  function _loadSource(source) {
    loading.style.display = 'flex';
    if (!source || !source.url) { loading.style.display = 'none'; return; }
    const url = source.url;
    // .m3u8 veya betine sunucusu → HLS player
    if (url.includes('.m3u8') || source.server === 'betine') {
      _playHLS(url);
    } else {
      _playIframe(url);
    }
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

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    _loadSource(match.sources?.[currentSourceIndex]);
  }

  function close() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    // HLS temizle
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    videoEl.src = '';
    videoEl.style.display = 'none';
    iframe.src = 'about:blank';
    iframe.style.display = 'block';
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
    _loadSource(currentMatch.sources[newIndex]);
  }

  return { open, close, isOpen, changeSource };
})();

window.Player = Player;
