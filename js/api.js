/**
 * api.js — Onur Sports Web
 * Falcon + 91betine.live entegrasyonu.
 * Betine'de eşleşen maç varsa Kaynak 1 olarak öne alınır,
 * Falcon kaynakları Kaynak 2, 3, ... olarak sıralanır.
 */

const API_BASE = 'https://ntv.cx/api/get-matches';

const EXCLUDE_PATTERNS = [
  /\(\s*w\s*\)/i, /\[\s*w\s*\]/i,
  /\bwomen\b/i, /\bwomens\b/i, /\bwoman\b/i,
  /\bfeminine\b/i, /\bfeminin\b/i,
  /\bladies\b/i, /\blady\b/i,
  /\bkadın\b/i, /\bkadin\b/i, /\bfem\b/i,
  /\bu\s*23\b/i, /\bu-23\b/i, /\bu23\b/i,
  /\bu\s*21\b/i, /\bu-21\b/i, /\bu21\b/i,
  /\bu\s*20\b/i, /\bu-20\b/i, /\bu20\b/i,
  /\bu\s*19\b/i, /\bu-19\b/i, /\bu19\b/i,
  /\bu\s*18\b/i, /\bu-18\b/i, /\bu18\b/i,
  /\bu\s*17\b/i, /\bu-17\b/i, /\bu17\b/i,
  /\bu\s*16\b/i, /\bu-16\b/i, /\bu16\b/i,
  /\bu\s*15\b/i, /\bu-15\b/i, /\bu15\b/i,
  /\bbasket\b/i, /\bbasketball\b/i, /\bnba\b/i, /\beuroleague\b/i,
  /\btennis\b/i, /\btenis\b/i, /\batp\b/i, /\bwta\b/i,
  /\bamerican[- ]?football\b/i, /\bnfl\b/i,
  /\bfight\b/i, /\bufc\b/i, /\bmma\b/i, /\bboxing\b/i, /\bboks\b/i,
  /\bmotor[- ]?sports?\b/i, /\bmotorsport\b/i,
  /\bformula[- ]?1\b/i, /\bf1\b/i, /\bmotogp\b/i, /\bgrand prix\b/i, /\bnascar\b/i,
  /\brugby\b/i, /\bafl\b/i, /\bbaseball\b/i, /\bmlb\b/i, /\bcricket\b/i
];

function isExcludedMatch(match) {
  const text = [match.title, match.home, match.away, match.competition, match.category, match.tournament]
    .filter(Boolean).join(' ');
  return EXCLUDE_PATTERNS.some(p => p.test(text));
}

function parseTeamsFromTitle(title) {
  if (!title) return null;
  const parts = title.split(/\s+(?:vs\.?|v\.?|–|-)\s+/i);
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts.slice(1).join(' vs ').trim() };
  }
  return null;
}

// ── Falcon ──────────────────────────────────────────────

async function fetchServer(server) {
  const url = API_BASE + '?server=' + server + '&type=both';
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const rawList = (data.live && data.live.length > 0)
      ? data.live
      : (data.all || data.matches || data.data || []);
    return rawList;
  } catch (err) {
    console.warn('[API] ' + server + ' hatası:', err.message);
    return [];
  }
}

function normalizeMatch(raw) {
  const homeRaw = (raw.teams && raw.teams.home && raw.teams.home.name) || raw.home || raw.home_name || '';
  const awayRaw = (raw.teams && raw.teams.away && raw.teams.away.name) || raw.away || raw.away_name || '';
  const title = raw.title || raw.name || raw.match_title || (homeRaw + ' vs ' + awayRaw);
  let home = homeRaw, away = awayRaw;
  if (!home || !away) {
    const parsed = parseTeamsFromTitle(title);
    if (parsed) { home = parsed.home; away = parsed.away; }
  }
  const time = raw.time || raw.match_time || raw.start_time || '';
  const competition = (raw.competition && raw.competition.name) || (raw.league && raw.league.name) || raw.tournament || raw.league || raw.category || '';
  const rawSources = raw.sources || raw.streams || raw.links || [];
  const sources = [];
  rawSources.forEach(function(src, idx) {
    const url = src.url || src.link || src.stream || null;
    if (url) sources.push({ label: 'Kaynak ' + (idx + 1), url: url, server: 'falcon' });
  });
  return {
    _id: raw.id || raw._id || ('falcon_' + Math.random()),
    title: title, home: home, away: away, competition: competition,
    category: raw.category || raw.tournament || raw.sport || '',
    tournament: raw.tournament || (raw.league && raw.league.name) || '',
    time: time, sources: sources,
  };
}

// ── 91betine.live entegrasyonu ───────────────────────────

var BETINE_URL = 'https://91betine.live/';
var BETINE_PROXY = '/api/betine';

function normStr(s) {
  return (s || '')
    .toLowerCase()
    .replace(/İ/g, 'i').replace(/ı/g, 'i')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamSim(a, b) {
  var na = normStr(a), nb = normStr(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return 0.9;
  var wa = na.split(' ').filter(function(w) { return w.length > 2; });
  var wbArr = nb.split(' ').filter(function(w) { return w.length > 2; });
  var wb = {};
  wbArr.forEach(function(w) { wb[w] = true; });
  if (!wa.length || !wbArr.length) return 0;
  var common = wa.filter(function(w) { return wb[w]; }).length;
  return common / Math.max(wa.length, wbArr.length);
}

function parseBetineMatches(html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');
  var items = [];
  doc.querySelectorAll('a[data-name][data-video]').forEach(function(el) {
    var name = (el.getAttribute('data-name') || '').trim();
    var video = (el.getAttribute('data-video') || '').trim();
    if (!video || !name) return;
    var parts = name.split(/\s{1,3}-\s{1,3}/);
    if (parts.length < 2) return;
    items.push({
      home: parts[0].trim(),
      away: parts.slice(1).join(' - ').trim(),
      url: video,
    });
  });
  console.log('[Betine] ' + items.length + ' maç parse edildi');
  return items;
}

function findBetineMatch(falconMatch, betineList) {
  var best = null, bestScore = 0;
  for (var i = 0; i < betineList.length; i++) {
    var b = betineList[i];
    var s1 = (teamSim(falconMatch.home, b.home) + teamSim(falconMatch.away, b.away)) / 2;
    var s2 = (teamSim(falconMatch.home, b.away) + teamSim(falconMatch.away, b.home)) / 2;
    var score = Math.max(s1, s2);
    if (score > bestScore) { bestScore = score; best = b; }
  }
  return bestScore >= 0.75 ? best : null;
}

async function fetchBetineMatches() {
  try {
    var res = await fetch(BETINE_PROXY, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var html = await res.text();
    return parseBetineMatches(html);
  } catch (err) {
    console.warn('[Betine] Fetch hatası:', err.message);
    return [];
  }
}

function mergeBetineSources(falconMatches, betineList) {
  if (!betineList.length) return falconMatches;
  return falconMatches.map(function(match) {
    var hit = findBetineMatch(match, betineList);
    if (!hit) return match;
    var betineSrc = { label: 'Kaynak 1', url: hit.url, server: 'betine' };
    var falconSources = match.sources.map(function(s, i) {
      return Object.assign({}, s, { label: 'Kaynak ' + (i + 2) });
    });
    console.log('[Betine] Eslesme: ' + match.home + ' vs ' + match.away);
    return Object.assign({}, match, { sources: [betineSrc].concat(falconSources) });
  });
}

// ── Ana fonksiyon ────────────────────────────────────────

async function fetchAllMatches() {
  console.log('[API] Falcon + Betine cekiliyor...');
  var results = await Promise.all([fetchServer('falcon'), fetchBetineMatches()]);
  var falconRaw = results[0];
  var betineList = results[1];

  var result = falconRaw.map(function(m) { return normalizeMatch(m); }).filter(function(m) { return m.sources.length > 0; });
  result = result.filter(function(m) { return !isExcludedMatch(m); });
  result = mergeBetineSources(result, betineList);

  console.log('[API] Toplam mac: ' + result.length);
  return result;
}

window.AppAPI = { fetchAllMatches: fetchAllMatches };
