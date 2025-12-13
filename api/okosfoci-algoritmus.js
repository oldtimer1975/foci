const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Okosfoci Algorithm - Enhanced Tip Generator
 * 
 * Features:
 * - Time-window filtering (0-8, 8-16, 16-24, all)
 * - Maximum match limits
 * - Strongest tip selection (lowest odds across multiple bet types)
 * - Team database integration
 * - Configurable leagues and bet types
 */

// ======= LOAD CONFIGURATION =======
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const exampleConfigPath = path.join(__dirname, 'config.example.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else if (fs.existsSync(exampleConfigPath)) {
    console.warn('⚠️  config.json not found, using config.example.json');
    return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf-8'));
  } else {
    throw new Error('No configuration file found. Please create config.json from config.example.json');
  }
}

// ======= LOAD TEAM DATABASE =======
function loadTeamDatabase() {
  const teamDbPath = process.env.TEAM_DB_PATH || path.join(__dirname, '..', 'data', 'teams.json');
  const teamDbTxtPath = path.join(__dirname, '..', 'data', 'teams.txt');
  
  let teams = [];
  
  // Try JSON first
  if (fs.existsSync(teamDbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(teamDbPath, 'utf-8'));
      teams = data.teams || data;
      console.log(`✓ Loaded ${teams.length} teams from JSON database`);
    } catch (e) {
      console.warn('⚠️  Failed to load teams.json:', e.message);
    }
  }
  
  // Also try TXT format
  if (fs.existsSync(teamDbTxtPath)) {
    try {
      const content = fs.readFileSync(teamDbTxtPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      
      lines.forEach(line => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 6) {
          const [name, country, league, founded, venue, capacity] = parts;
          // Only add if not already in teams array
          if (!teams.find(t => t.name === name)) {
            teams.push({
              name,
              country,
              league,
              founded: parseInt(founded) || null,
              venue,
              capacity: parseInt(capacity) || null
            });
          }
        }
      });
      console.log(`✓ Total ${teams.length} teams in database (JSON + TXT)`);
    } catch (e) {
      console.warn('⚠️  Failed to load teams.txt:', e.message);
    }
  }
  
  return teams;
}

// ======= TEAM LOOKUP =======
function findTeamInDb(teamName, teamDb) {
  if (!teamName || !teamDb || teamDb.length === 0) return null;
  
  // Exact match
  let match = teamDb.find(t => t.name === teamName);
  if (match) return match;
  
  // Case-insensitive match
  const lowerName = teamName.toLowerCase();
  match = teamDb.find(t => t.name.toLowerCase() === lowerName);
  if (match) return match;
  
  // Partial match
  match = teamDb.find(t => t.name.toLowerCase().includes(lowerName) || lowerName.includes(t.name.toLowerCase()));
  return match || null;
}

// ======= TIME WINDOW HELPERS =======
const TIME_WINDOWS = {
  '0-8': { start: 0, end: 8 },
  '8-16': { start: 8, end: 16 },
  '16-24': { start: 16, end: 24 },
  'all': { start: 0, end: 24 }
};

function getTimeWindowLabel(hour) {
  if (hour >= 0 && hour < 8) return '0-8';
  if (hour >= 8 && hour < 16) return '8-16';
  if (hour >= 16 && hour < 24) return '16-24';
  return 'other';
}

function matchesTimeWindow(hour, timeWindow) {
  if (timeWindow === 'all') return true;
  const window = TIME_WINDOWS[timeWindow];
  if (!window) return true;
  return hour >= window.start && hour < window.end;
}

// ======= FETCH FIXTURES =======
async function fetchFixtures(league, date, apiKey, config) {
  const url = `${config.apiBaseUrl}/fixtures?league=${league.id}&season=${league.season}&date=${date}`;
  
  try {
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });
    
    if (!response.data || !response.data.response) {
      console.warn(`⚠️  No fixtures data for ${league.name}`);
      return [];
    }
    
    return response.data.response;
  } catch (error) {
    console.error(`❌ Error fetching fixtures for ${league.name}:`, error.message);
    return [];
  }
}

// ======= FETCH ODDS =======
async function fetchOdds(fixtureId, apiKey, config) {
  const url = `${config.apiBaseUrl}/odds?fixture=${fixtureId}`;
  
  try {
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });
    
    if (!response.data || !response.data.response || response.data.response.length === 0) {
      return null;
    }
    
    return response.data.response[0];
  } catch (error) {
    console.error(`❌ Error fetching odds for fixture ${fixtureId}:`, error.message);
    return null;
  }
}

// ======= EXTRACT STRONGEST TIP =======
function extractStrongestTip(oddsData, tippTypes) {
  if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
    return { tip: 'No odds available', odds: null, betType: null };
  }
  
  const bookmaker = oddsData.bookmakers[0];
  let bestTip = null;
  let lowestOdds = Infinity;
  let bestBetType = null;
  
  // Iterate through prioritized bet types
  for (const betType of tippTypes) {
    const bet = bookmaker.bets?.find(b => b.name === betType);
    if (!bet || !bet.values) continue;
    
    // Find the lowest odds in this bet type
    for (const value of bet.values) {
      const odd = parseFloat(value.odd);
      if (!isNaN(odd) && odd < lowestOdds) {
        lowestOdds = odd;
        bestTip = value.value;
        bestBetType = betType;
      }
    }
  }
  
  if (!bestTip) {
    return { tip: 'No valid odds found', odds: null, betType: null };
  }
  
  return {
    tip: bestTip,
    odds: lowestOdds,
    betType: bestBetType
  };
}

// ======= MAIN ALGORITHM =======
async function generateTips(options = {}) {
  const config = loadConfig();
  const teamDb = loadTeamDatabase();
  
  // Extract options
  const apiKey = options.apiKey || process.env.X_APISPORTS_KEY;
  if (!apiKey) {
    throw new Error('API key not provided. Set X_APISPORTS_KEY environment variable or pass apiKey option.');
  }
  
  const date = options.date || new Date().toISOString().slice(0, 10);
  const timeWindow = options.timeWindow || config.defaultTimeWindow || 'all';
  const maxMatches = options.maxMatches || config.maxMatches || 20;
  const leagues = options.leagues || config.leagues;
  const tippTypes = options.tippTypes || config.tippTypes;
  
  console.log('🎯 Okosfoci Algorithm Started');
  console.log(`📅 Date: ${date}`);
  console.log(`⏰ Time Window: ${timeWindow}`);
  console.log(`🔢 Max Matches: ${maxMatches}`);
  console.log(`🏆 Leagues: ${leagues.map(l => l.name).join(', ')}`);
  console.log(`📊 Bet Types: ${tippTypes.join(', ')}`);
  console.log('');
  
  const allTips = [];
  let processedCount = 0;
  
  for (const league of leagues) {
    if (processedCount >= maxMatches) {
      console.log(`✓ Reached maximum of ${maxMatches} matches, stopping.`);
      break;
    }
    
    console.log(`\n=== ${league.name} ===`);
    const fixtures = await fetchFixtures(league, date, apiKey, config);
    
    if (fixtures.length === 0) {
      console.log(`  No fixtures found for ${date}`);
      continue;
    }
    
    console.log(`  Found ${fixtures.length} fixtures`);
    
    for (const fixture of fixtures) {
      if (processedCount >= maxMatches) break;
      
      // Extract fixture time
      const fixtureDate = new Date(fixture.fixture.date);
      const hour = fixtureDate.getUTCHours();
      const timeWindowLabel = getTimeWindowLabel(hour);
      
      // Check time window filter
      if (!matchesTimeWindow(hour, timeWindow)) {
        continue;
      }
      
      console.log(`  ⚽ ${fixture.teams.home.name} vs ${fixture.teams.away.name} (${hour}:00 UTC)`);
      
      // Fetch odds for this fixture
      const oddsData = await fetchOdds(fixture.fixture.id, apiKey, config);
      
      // Extract strongest tip
      const strongestTip = extractStrongestTip(oddsData, tippTypes);
      
      // Lookup teams in database
      const homeTeamDb = findTeamInDb(fixture.teams.home.name, teamDb);
      const awayTeamDb = findTeamInDb(fixture.teams.away.name, teamDb);
      
      // Build tip object
      const tip = {
        fixtureId: fixture.fixture.id,
        league: league.name,
        date: fixture.fixture.date,
        timeWindow: timeWindowLabel,
        home: fixture.teams.home.name,
        away: fixture.teams.away.name,
        venue: fixture.fixture.venue?.name || null,
        tip: strongestTip.tip,
        odds: strongestTip.odds,
        betType: strongestTip.betType,
        home_db: homeTeamDb,
        away_db: awayTeamDb
      };
      
      allTips.push(tip);
      processedCount++;
      
      console.log(`    → Tip: ${strongestTip.tip} (${strongestTip.betType}, odds: ${strongestTip.odds})`);
      
      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
  
  console.log(`\n✅ Generated ${allTips.length} tips`);
  return allTips;
}

// ======= SAVE TO FILE =======
function saveTips(tips, filename = 'tippek_OKOSFOCI.json') {
  const outputPath = path.join(__dirname, filename);
  fs.writeFileSync(outputPath, JSON.stringify(tips, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
  return outputPath;
}

// ======= CLI EXECUTION =======
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    
    // Check if value exists
    if (i + 1 >= args.length) break;
    const value = args[i + 1];
    
    if (key === 'date') options.date = value;
    if (key === 'timeWindow') options.timeWindow = value;
    if (key === 'maxMatches') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) options.maxMatches = parsed;
    }
  }
  
  // Load API key from environment
  require('dotenv').config();
  
  generateTips(options)
    .then(tips => {
      if (tips.length === 0) {
        console.warn('\n⚠️  No tips generated. Check if there are fixtures for the selected date and time window.');
        process.exit(0);
      }
      saveTips(tips);
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

// ======= EXPORT FOR SERVER USE =======
module.exports = {
  generateTips,
  saveTips,
  loadConfig,
  loadTeamDatabase,
  findTeamInDb
};
