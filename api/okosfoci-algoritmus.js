const axios = require('axios');

/**
 * Okosfoci Algorithm Module
 * Fetches fixtures and odds from football API and generates tips
 */

// Configuration
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const API_RATE_LIMIT_MS = parseInt(process.env.API_RATE_LIMIT_MS || '300', 10);

// Major leagues configuration
const LEAGUES = [
  { name: "Premier League", id: 39, country: "England" },
  { name: "La Liga", id: 140, country: "Spain" },
  { name: "Bundesliga", id: 78, country: "Germany" },
  { name: "Serie A", id: 135, country: "Italy" },
  { name: "Ligue 1", id: 61, country: "France" },
  { name: "Eredivisie", id: 88, country: "Netherlands" },
  { name: "Primeira Liga", id: 94, country: "Portugal" },
  { name: "Championship", id: 40, country: "England" }
];

// Time window definitions
const TIME_WINDOWS = [
  { label: "0-8", start: 0, end: 8 },
  { label: "8-16", start: 8, end: 16 },
  { label: "16-24", start: 16, end: 24 }
];

/**
 * Get time window label for an hour
 */
function getTimeWindow(hour) {
  for (const win of TIME_WINDOWS) {
    if (hour >= win.start && hour < win.end) return win.label;
  }
  return "other";
}

/**
 * Fetch fixtures for a specific date and league
 */
async function fetchFixtures(leagueId, date) {
  try {
    const url = `${API_BASE}/fixtures?league=${leagueId}&date=${date}`;
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': API_KEY },
      timeout: 10000
    });
    return response.data.response || [];
  } catch (error) {
    console.error(`Error fetching fixtures for league ${leagueId}:`, error.message);
    return [];
  }
}

/**
 * Fetch odds for a specific fixture
 */
async function fetchOdds(fixtureId) {
  try {
    const url = `${API_BASE}/odds?fixture=${fixtureId}`;
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': API_KEY },
      timeout: 10000
    });
    return response.data.response || [];
  } catch (error) {
    console.error(`Error fetching odds for fixture ${fixtureId}:`, error.message);
    return [];
  }
}

/**
 * Extract best tip from odds data
 * Checks multiple bet types: Match Winner, Double Chance, Over/Under 2.5, Both Teams to Score
 */
function extractBestTip(oddsData) {
  if (!oddsData || !oddsData.length) {
    return { tip: null, tippText: "No odds available", odds: null, betType: null };
  }

  const bookmaker = oddsData[0]?.bookmakers?.[0];
  if (!bookmaker || !bookmaker.bets) {
    return { tip: null, tippText: "No odds available", odds: null, betType: null };
  }

  let bestTip = { tip: null, tippText: "No odds available", odds: null, betType: null, value: Infinity };

  // Check Match Winner
  const matchWinner = bookmaker.bets.find(b => b.name === 'Match Winner');
  if (matchWinner && matchWinner.values && matchWinner.values.length === 3) {
    const homeOdds = matchWinner.values.find(v => v.value === 'Home')?.odd;
    const drawOdds = matchWinner.values.find(v => v.value === 'Draw')?.odd;
    const awayOdds = matchWinner.values.find(v => v.value === 'Away')?.odd;

    if (homeOdds && drawOdds && awayOdds) {
      const options = [
        { label: 'Home', value: Number(homeOdds), tip: 'Home' },
        { label: 'Draw', value: Number(drawOdds), tip: 'Draw' },
        { label: 'Away', value: Number(awayOdds), tip: 'Away' }
      ];
      const best = options.sort((a, b) => a.value - b.value)[0];
      if (best.value < bestTip.value) {
        bestTip = {
          tip: best.tip,
          tippText: best.label,
          odds: { home: Number(homeOdds), draw: Number(drawOdds), away: Number(awayOdds) },
          betType: 'Match Winner',
          value: best.value
        };
      }
    }
  }

  // Check Double Chance
  const doubleChance = bookmaker.bets.find(b => b.name === 'Double Chance');
  if (doubleChance && doubleChance.values) {
    const options = doubleChance.values.map(v => ({
      label: v.value,
      value: Number(v.odd),
      tip: v.value
    }));
    const best = options.sort((a, b) => a.value - b.value)[0];
    if (best && best.value < bestTip.value) {
      bestTip = {
        tip: best.tip,
        tippText: `Double Chance: ${best.label}`,
        odds: doubleChance.values.reduce((acc, v) => ({ ...acc, [v.value]: Number(v.odd) }), {}),
        betType: 'Double Chance',
        value: best.value
      };
    }
  }

  // Check Over/Under 2.5
  const overUnder = bookmaker.bets.find(b => b.name === 'Goals Over/Under' && b.values.some(v => v.value.includes('2.5')));
  if (overUnder && overUnder.values) {
    const over25 = overUnder.values.find(v => v.value === 'Over 2.5')?.odd;
    const under25 = overUnder.values.find(v => v.value === 'Under 2.5')?.odd;
    if (over25 && under25) {
      const options = [
        { label: 'Over 2.5', value: Number(over25), tip: 'Over 2.5' },
        { label: 'Under 2.5', value: Number(under25), tip: 'Under 2.5' }
      ];
      const best = options.sort((a, b) => a.value - b.value)[0];
      if (best.value < bestTip.value) {
        bestTip = {
          tip: best.tip,
          tippText: best.label,
          odds: { over: Number(over25), under: Number(under25) },
          betType: 'Over/Under 2.5',
          value: best.value
        };
      }
    }
  }

  // Check Both Teams to Score
  const btts = bookmaker.bets.find(b => b.name === 'Both Teams Score');
  if (btts && btts.values) {
    const yes = btts.values.find(v => v.value === 'Yes')?.odd;
    const no = btts.values.find(v => v.value === 'No')?.odd;
    if (yes && no) {
      const options = [
        { label: 'BTTS Yes', value: Number(yes), tip: 'BTTS Yes' },
        { label: 'BTTS No', value: Number(no), tip: 'BTTS No' }
      ];
      const best = options.sort((a, b) => a.value - b.value)[0];
      if (best.value < bestTip.value) {
        bestTip = {
          tip: best.tip,
          tippText: best.label,
          odds: { yes: Number(yes), no: Number(no) },
          betType: 'Both Teams to Score',
          value: best.value
        };
      }
    }
  }

  // Remove the internal value field before returning
  delete bestTip.value;
  return bestTip;
}

/**
 * Generate tips for a specific date, time window, and limit
 */
async function generateTips(date, timeWindow, limit) {
  const results = [];
  
  // Validate inputs
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  const validTimeWindows = ['all', '0-8', '8-16', '16-24'];
  if (!validTimeWindows.includes(timeWindow)) {
    throw new Error(`Invalid time window. Expected one of: ${validTimeWindows.join(', ')}`);
  }
  
  const validLimits = [3, 6, 8, 10];
  if (!validLimits.includes(limit)) {
    throw new Error(`Invalid limit. Expected one of: ${validLimits.join(', ')}`);
  }

  // Fetch fixtures from all leagues
  for (const league of LEAGUES) {
    if (results.length >= limit) break;

    const fixtures = await fetchFixtures(league.id, date);
    
    for (const fixture of fixtures) {
      if (results.length >= limit) break;

      // Check time window
      const fixtureDate = new Date(fixture.fixture.date);
      const hour = fixtureDate.getUTCHours();
      const fixtureWindow = getTimeWindow(hour);

      if (timeWindow !== 'all' && fixtureWindow !== timeWindow) {
        continue;
      }

      // Fetch odds for this fixture
      const oddsData = await fetchOdds(fixture.fixture.id);
      const tipData = extractBestTip(oddsData);

      // Build result object
      results.push({
        fixtureId: fixture.fixture.id,
        league: {
          name: league.name,
          country: league.country,
          id: league.id
        },
        fixture: {
          date: fixture.fixture.date,
          venue: fixture.fixture.venue?.name || 'Unknown',
          status: fixture.fixture.status?.long || 'Scheduled'
        },
        teams: {
          home: fixture.teams.home.name,
          away: fixture.teams.away.name
        },
        timeWindow: fixtureWindow,
        tip: tipData.tip,
        tippText: tipData.tippText,
        odds: tipData.odds,
        betType: tipData.betType
      });

      // Rate limiting - wait between API calls to avoid quota issues
      await new Promise(resolve => setTimeout(resolve, API_RATE_LIMIT_MS));
    }
  }

  return results;
}

/**
 * Check if API is configured correctly
 */
function isConfigured() {
  return {
    apiKeyPresent: !!API_KEY && API_KEY.length > 0,
    leaguesCount: LEAGUES.length,
    timeWindowsCount: TIME_WINDOWS.length
  };
}

module.exports = {
  generateTips,
  isConfigured,
  LEAGUES,
  TIME_WINDOWS
};
