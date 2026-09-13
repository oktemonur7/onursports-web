/**
 * ui.js — Onur Sports Web
 * - Arama Çubuğu (Takım adına göre anlık filtreleme, maç seçince otomatik temizleme)
 * - Maça tıklayınca doğrudan 1. kaynakla açılır
 * - Mouse & Touch & Klavye navigasyonu
 */

const UI = (() => {
  let allMatches = [];
  let displayedMatches = [];
  let activeCardIndex = 0;

  const $ = id => document.getElementById(id);

  // ─── Render ──────────────────────────────────────────────────────────

  function renderMatchList(matchList) {
    displayedMatches = matchList;
    const grid = $('match-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (displayedMatches.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Aradığınız kriterde maç bulunamadı</div></div>`;
      return;
    }

    displayedMatches.forEach((match, idx) => {
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

      // Mouse / Touch ile maça tıklayınca doğrudan 1. kaynakla başlat
      card.addEventListener('click', () => playMatch(idx));
      card.addEventListener('focus', () => { activeCardIndex = idx; });

      grid.appendChild(card);
    });

    if (activeCardIndex >= displayedMatches.length) {
      activeCardIndex = 0;
    }
  }

  function setMatches(list) {
    allMatches = list;
    const searchInput = $('match-search-input');
    const query = (searchInput?.value || '').trim();
    if (query) {
      filterMatches(query);
    } else {
      renderMatchList(allMatches);
    }
  }

  function filterMatches(query) {
    const q = query.toLowerCase();
    const filtered = allMatches.filter(m => {
      const home = (m.home || '').toLowerCase();
      const away = (m.away || '').toLowerCase();
      const title = (m.title || '').toLowerCase();
      const competition = (m.competition || '').toLowerCase();
      return home.includes(q) || away.includes(q) || title.includes(q) || competition.includes(q);
    });
    renderMatchList(filtered);
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

  // ─── Play Match ───────────────────────────────────────────────────────

  function playMatch(idx) {
    const match = displayedMatches[idx];
    if (!match || !match.sources || match.sources.length === 0) return;

    // Arama kutusunu otomatik temizle ve listeyi sıfırla
    const searchInput = $('match-search-input');
    if (searchInput && searchInput.value) {
      searchInput.value = '';
      renderMatchList(allMatches);
    }

    // Doğrudan 1. kaynak (index: 0) ile başlat
    Player.open(match, 0, () => {
      focusCard(activeCardIndex);
    });
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

    // Arama kutusundayken kart navigasyonunu engelle (ok tuşları input içinde çalışabilsin)
    if (document.activeElement === $('match-search-input')) {
      if (key === 'Enter') {
        $('match-search-input').blur();
        focusCard(0);
      }
      return;
    }

    if (Player.isOpen()) {
      if (isBackKey(key)) { e.preventDefault(); Player.close(); }
      return;
    }

    const COLS = _getColCount();
    switch (key) {
      case 'ArrowUp':    case 38: e.preventDefault(); focusCard(activeCardIndex - COLS); break;
      case 'ArrowDown':  case 40: e.preventDefault(); focusCard(activeCardIndex + COLS); break;
      case 'ArrowLeft':  case 37: e.preventDefault(); focusCard(activeCardIndex - 1); break;
      case 'ArrowRight': case 39: e.preventDefault(); focusCard(activeCardIndex + 1); break;
      case 'Enter': case ' ':
        e.preventDefault(); playMatch(activeCardIndex); break;
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

    // Arama kutusu olayları
    const searchInput = $('match-search-input');
    searchInput?.addEventListener('input', (e) => {
      filterMatches(e.target.value);
    });

    // Hata ekranı retry butonu
    $('error-retry-btn')?.addEventListener('click', () => {
      if (window.AppMain?.load) window.AppMain.load();
    });
  }

  return { init, renderMatchList: setMatches, showLoading, hideLoading, showError };
})();

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.UI = UI;
window.escHtml = escHtml;
