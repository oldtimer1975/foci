const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const { generateTips } = require('./okosfoci-algoritmus');

const DATA_ROOT = '/home/kali/Downloads/meccsek'; // állítsd be, ha más
const app = express();
app.use(cors());

// Kérés log
app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.url);
  next();
});

// HH:MM → percek
function hmToMinutes(hm) {
  const [h, m] = String(hm).split(':').map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

// Időablak szűrő
function filterByWindow(rows, windowStr) {
  if (!windowStr) return rows;
  const [fromHM, toHM] = windowStr.split('-'); // "HH:MM-HH:MM"
  const fromMin = hmToMinutes(fromHM);
  const toMin = hmToMinutes(toHM);
  return rows.filter((r) => {
    const t = r.startTzLocal;
    if (!t) return true; // ha nincs idő, ne dobjuk ki
    const mins = hmToMinutes(t);
    return mins >= fromMin && mins <= toMin;
  });
}

// JSON normalizálás
function normalizeJsonRecord(rec) {
  return {
    fixtureId: rec.fixtureId ?? rec.id ?? rec.fixture_id ?? rec.GameId,
    leagueName: rec.leagueName ?? rec.league_name ?? rec.league?.name ?? rec.competition?.name ?? 'Ismeretlen liga',
    home: rec.home ?? rec.teams?.home?.name ?? rec.HomeTeam ?? '-',
    away: rec.away ?? rec.teams?.away?.name ?? rec.AwayTeam ?? '-',
    startUTC: rec.startUTC ?? rec.date ?? rec.fixture?.date ?? null,
    startTzLocal: rec.startTzLocal ?? rec.start_local ?? null,
    score: rec.score ?? null,
    halftime: rec.halftime ?? null,
    pickOutcome: rec.pickOutcome ?? rec.tip ?? rec.recommendation ?? null,
    probability: typeof rec.probability === 'number' ? rec.probability : rec.prob ?? null,
    odds: rec.odds ?? rec.bookmakers?.[0]?.odds ?? undefined,
  };
}

// TXT parser – Football.TXT jellegű fájlokhoz
const DATE_LINE_RE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\/(\d{1,2})\s+(\d{4})/; // pl. "Sat Sep/14 2024"
const TIME_LINE_RE = /^(\d{1,2})\.(\d{2})\s+(.+?)\s+v\s+(.+?)\s+(\d+-\d+)(?:\s+([a-z\.]+))?\s*(?:\((.+?)\))?/i;
// 1: óra, 2: perc, 3: hazai, 4: vendég, 5: végeredmény "2-6", 6: extra (pl. a.e.t., pen.), 7: zárójelben félidő/részletek

function parseTxt(content, leagueNameGuess) {
  const lines = content.split(/\r?\n/);
  let currentDateStr = null;
  const out = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const dMatch = t.match(DATE_LINE_RE);
    if (dMatch) {
      const [, , monStr, dayStr, yearStr] = dMatch;
      currentDateStr = `${yearStr}-${monStr}-${dayStr}`; // információs célra megőrizzük
      continue;
    }

    const m = t.match(TIME_LINE_RE);
    if (m) {
      const [, hh, mm, home, away, fullScore, extra, bracket] = m;
      let halftime = null;
      if (bracket) {
        const first = bracket.split(',')[0].trim();
        if (/^\d+-\d+$/.test(first)) halftime = first;
      }
      const startHM = `${hh.padStart(2, '0')}:${mm}`;
      out.push({
        fixtureId: `${currentDateStr || ''} ${startHM} ${home} v ${away}`,
        leagueName: leagueNameGuess || 'Ismeretlen liga',
        home,
        away,
        startUTC: null,
        startTzLocal: startHM,
        score: fullScore + (extra ? ` ${extra}` : ''),
        halftime,
        pickOutcome: null,
        probability: null,
        odds: undefined,
      });
      continue;
    }

    // egyéb sorokat (fejlécek, "» Round 3" stb.) kihagyjuk
  }

  return out;
}

// /files – abszolút és relatív utak
app.get('/files', async (req, res) => {
  const pattern = path.join(DATA_ROOT, '**/*.{json,txt}');
  const absFiles = await fg(pattern, { dot: false });
  const relFiles = absFiles.map((abs) => path.relative(DATA_ROOT, abs)); // europe/hungary/2024-25_hu_cup.txt
  res.json({ ok: true, files_abs: absFiles, files: relFiles });
});

// /browse – JSON/TXT, liga és időablak szűréssel, lapozva
app.get('/browse', async (req, res) => {
  const file = req.query.file; // RELATÍV (DATA_ROOT-hoz) vagy ABSZOLÚT
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const window = req.query.window || null;
  const league = req.query.league || null;

  if (!file) return res.status(400).json({ ok: false, error: 'file query param required' });

  const fullPath = path.isAbsolute(file) ? file : path.join(DATA_ROOT, file);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ ok: false, error: 'file not found', file: fullPath });

  // Liga név tipp a könyvtárból (pl. europe/france/2025-26_fr1.txt -> "france")
  const parts = fullPath.split(path.sep);
  const idxEurope = parts.indexOf('europe');
  const countryGuess = idxEurope >= 0 ? parts[idxEurope + 1] : null;
  const leagueNameGuess = countryGuess ? countryGuess.replace(/-/g, ' ') : 'Ismeretlen liga';

  if (fullPath.endsWith('.json')) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'json parse failed', details: String(e) });
    }

    const rows = Array.isArray(raw)
      ? raw.map(normalizeJsonRecord)
      : Array.isArray(raw?.picks)
      ? raw.picks.map(normalizeJsonRecord)
      : Array.isArray(raw?.matches)
      ? raw.matches.map(normalizeJsonRecord)
      : [];

    let filtered = filterByWindow(rows, window);
    if (league) {
      const q = String(league).toLowerCase();
      filtered = filtered.filter((r) => String(r.leagueName || '').toLowerCase().includes(q));
    }

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return res.json({ ok: true, page, limit, total: filtered.length, data });
  }

  if (fullPath.endsWith('.txt')) {
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'txt read failed', details: String(e) });
    }

    const rows = parseTxt(content, leagueNameGuess);
    let filtered = filterByWindow(rows, window);
    if (league) {
      const q = String(league).toLowerCase();
      filtered = filtered.filter((r) => String(r.leagueName || '').toLowerCase().includes(q));
    }

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return res.json({ ok: true, page, limit, total: filtered.length, data });
  }

  return res.status(400).json({ ok: false, error: 'unsupported file type' });
});

// /tippek - Generate tips using okosfoci-algoritmus
// Query parameters:
//   - date: YYYY-MM-DD format (default: today)
//   - timeWindow: all|0-8|8-16|16-24 (default: all)
//   - limit: maximum number of matches (default: from config)
app.get('/tippek', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const timeWindow = req.query.timeWindow || 'all';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    // Validate time window
    const validWindows = ['all', '0-8', '8-16', '16-24'];
    if (!validWindows.includes(timeWindow)) {
      return res.status(400).json({ 
        ok: false, 
        error: `Invalid timeWindow. Use one of: ${validWindows.join(', ')}` 
      });
    }

    // Validate limit
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid limit. Must be a number between 1 and 100' 
      });
    }

    console.log(`[/tippek] Generating tips for ${date}, window: ${timeWindow}, limit: ${limit || 'default'}`);

    const options = {
      date,
      timeWindow,
      maxMatches: limit
    };

    const tips = await generateTips(options);

    return res.json({
      ok: true,
      date,
      timeWindow,
      count: tips.length,
      tips
    });

  } catch (error) {
    console.error('[/tippek] Error:', error);
    
    // Always return JSON, never HTML
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', () => console.log(`Okosfoci API on http://0.0.0.0:${PORT} (DATA_ROOT=${DATA_ROOT})`));
