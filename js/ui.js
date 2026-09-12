/**
 * ui.js — Onur Sports Web
 * - Mouse tıklama + klavye (ok tuşları, Enter)
 * - Touch desteği (dokunmatik ekran)
 * - Responsive grid (1/2/3/4 sütun CSS ile)
 */

const UI = (() => {
  let matches = [];
  let activeCardIndex = 0;
  let popupOpen = false;
  let popupSourceIndex = 0;
  let popupMatch = null;

  const $ = id => document.getElementById(id);

  // ─── Render ──────────────────────────────────────────────────────────

  function renderMatchList(matchList) {
    matches = matchList;
    const grid = $('match-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (matches.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📺</div><div class="empty-text">Şu an canlı maç yok</div></div>`;
      return;
    }

    matches.forEach((match, idx) => {
      const card = document.createElement('div');
      card.className = 'match-card';
      card.dataset.idx = idx;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', match.home && match.away ? `${match.home} vs ${match.away}` : match.title);

      const homeText = escHtml(match.home || match.title || '');
      const awayText = escHtml(match.away || '');
      const titleHtml = awayText
        ? `${homeText}<span class="vs">vs</span>${awayText}`
        : homeText;
      const timeHtml = match.time
        ? `<div class="card-time">${escHtml(match.time)}</div>`
        : '';

      card.innerHTML = `<div class="card-title">${titleHtml}</div>${timeHtml}`;

      // Mouse / Touch
      card.addEventListener('click', () => openPopup(idx));
      card.addEventListener('focus', () => { activeCardIndex = idx; });

      grid.appendChild(card);
    });

    // Klavye odağı için ilk kartı fokusla
    requestAnimationFrame(() => {
      const firstCard = grid.querySelector('.match-card');
      if (firstCard) firstCard.focus({ preventScroll: true });
    });
  }

  function focusCard(idx) {
    const cards = document.querySelectorAll('.match-card');
    if (!cards.length) return;
    if (idx < 0) idx = 0;
    if (idx >= cards.length) idx = cards.length - 1;
    activeCardIndex = idx;
    cards.forEach(c => c.classList.remove('match-card--focused'));
    const target = cards[idx];
    if (target) {
      target.classList.add('match-card--focused');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // ─── Popup ────────────────────────────────────────────────────────────

  function openPopup(matchIdx) {
    popupMatch = matches[matchIdx];
    if (!popupMatch || popupMatch.sources.length === 0) return;

    // Tek kaynak varsa direkt oynat
    if (popupMatch.sources.length === 1) {
      _playSourceDirect(popupMatch.sources[0], popupMatch);
      return;
    }

    popupOpen = true;
    popupSourceIndex = 0;

    const title = popupMatch.home && popupMatch.away
      ? `${popupMatch.home} vs ${popupMatch.away}`
      : popupMatch.title || '';

    $('popup-match-title').textContent = title;

    const sourceList = $('popup-source-list');
    sourceList.innerHTML = '';
    popupMatch.sources.forEach((src, i) => {
      const btn = document.createElement('button');
      btn.className = `source-btn source-btn--${src.server}`;
      btn.dataset.idx = i;
      btn.tabIndex = 0;
      btn.innerHTML = `
        <span class="source-label">${escHtml(src.label)}</span>
        ${src.quality ? `<span class="source-quality source-quality--${src.quality.toLowerCase()}">${src.quality}</span>` : ''}
      `;
      btn.addEventListener('click', () => {
        const matchSnap = popupMatch; // closePopup() null'lar, önce snapshot al
        closePopup();
        _playSourceDirect(src, matchSnap);
      });
      sourceList.appendChild(btn);
    });

    $('source-popup-overlay').classList.add('popup-overlay--visible');
    setTimeout(() => focusSourceBtn(0), 80);
  }

  function _playSourceDirect(src, match) {
    const matchTitle = match.home && match.away
      ? `${match.home} vs ${match.away}`
      : match.title || '';
    const matchIdx = matches.indexOf(match);
    const hasMultipleSources = match.sources && match.sources.length > 1;
    Player.open(
      matchTitle,
      src,
      () => { focusCard(activeCardIndex); },
      hasMultipleSources && matchIdx !== -1 ? () => openPopup(matchIdx) : null
    );
  }

  function closePopup() {
    if (!popupOpen) return;
    popupOpen = false;
    popupMatch = null;
    $('source-popup-overlay').classList.remove('popup-overlay--visible');
    setTimeout(() => focusCard(activeCardIndex), 100);
  }

  function focusSourceBtn(idx) {
    const btns = document.querySelectorAll('.source-btn');
    if (!btns.length) return;
    if (idx < 0) idx = btns.length - 1;
    if (idx >= btns.length) idx = 0;
    popupSourceIndex = idx;
    btns.forEach(b => b.classList.remove('source-btn--focused'));
    btns[idx]?.classList.add('source-btn--focused');
    btns[idx]?.focus({ preventScroll: true });
  }

  // ─── Klavye Navigasyonu ───────────────────────────────────────────────

  function _getColCount() {
    const grid = $('match-grid');
    if (!grid) return 1;
    const style = window.getComputedStyle(grid);
    const cols = style.gridTemplateColumns.split(' ').length;
    return cols || 1;
  }

  function handleKeyDown(e) {
    const key = e.key || e.keyCode;

    if (Player.isOpen()) {
      if (isBackKey(key)) { e.preventDefault(); Player.close(); }
      return;
    }

    if (popupOpen) {
      switch (key) {
        case 'ArrowUp': case 38:
        case 'ArrowLeft': case 37:
          e.preventDefault(); focusSourceBtn(popupSourceIndex - 1); break;
        case 'ArrowDown': case 40:
        case 'ArrowRight': case 39:
          e.preventDefault(); focusSourceBtn(popupSourceIndex + 1); break;
        case 'Enter': case ' ':
          e.preventDefault();
          const srcSnap = popupMatch?.sources[popupSourceIndex];
          const matchSnap = popupMatch;
          closePopup();
          if (srcSnap && matchSnap) _playSourceDirect(srcSnap, matchSnap);
          break;
        case 'Escape': case 'Backspace': case 8: case 27:
          e.preventDefault(); closePopup(); break;
      }
      return;
    }

    const COLS = _getColCount();
    switch (key) {
      case 'ArrowUp':    case 38: e.preventDefault(); focusCard(activeCardIndex - COLS); break;
      case 'ArrowDown':  case 40: e.preventDefault(); focusCard(activeCardIndex + COLS); break;
      case 'ArrowLeft':  case 37: e.preventDefault(); focusCard(activeCardIndex - 1); break;
      case 'ArrowRight': case 39: e.preventDefault(); focusCard(activeCardIndex + 1); break;
      case 'Enter': case ' ':
        e.preventDefault(); openPopup(activeCardIndex); break;
    }
  }

  function isBackKey(key) {
    return key === 'Escape' || key === 'Backspace' || key === 8 || key === 27;
  }

  // ─── Loading / Error ─────────────────────────────────────────────────

  function showLoading() {
    $('loading-screen').style.display = 'flex';
    $('match-grid').style.display = 'none';
    $('error-screen').style.display = 'none';
  }

  function hideLoading() {
    $('loading-screen').style.display = 'none';
    $('match-grid').style.display = 'grid';
  }

  function showError(msg) {
    $('loading-screen').style.display = 'none';
    $('match-grid').style.display = 'none';
    $('error-screen').style.display = 'flex';
    $('error-msg').textContent = msg || 'Bağlantı hatası';
  }

  function init() {
    document.addEventListener('keydown', handleKeyDown);

    // Popup dışına tıklayınca kapat
    $('source-popup-overlay')?.addEventListener('click', e => {
      if (e.target === $('source-popup-overlay')) closePopup();
    });

    // Hata ekranı retry butonu
    $('error-retry-btn')?.addEventListener('click', () => {
      if (window.AppMain?.load) window.AppMain.load();
    });
  }

  return { init, renderMatchList, showLoading, hideLoading, showError };
})();

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.UI = UI;
window.escHtml = escHtml;
