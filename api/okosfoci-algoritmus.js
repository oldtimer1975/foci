const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ======= Load Configuration =======
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const examplePath = path.join(__dirname, 'config.example.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else if (fs.existsSync(examplePath)) {
    console.warn('⚠️  config.json not found, using config.example.json');
    return JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
  } else {
    throw new Error('No config file found. Please create config.json from config.example.json');
  }
}

// ======= Load Environment Variables =======
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
}

// ======= Load Team Database =======
function loadTeamDatabase() {
  const teamDb = new Map();
  const jsonPath = path.join(__dirname, '..', 'data', 'teams.json');
  const txtPath = path.join(__dirname, '..', 'data', 'teams.txt');

  // Load JSON
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (data.teams && Array.isArray(data.teams)) {
        data.teams.forEach(team => {
          if (team.name) {
            teamDb.set(team.name.toLowerCase(), team);
          }
        });
      }
    } catch (e) {
      console.warn('⚠️  Failed to load teams.json:', e.message);
    }
  }

  // Load TXT (pipe-separated format)
  if (fs.existsSync(txtPath)) {
    try {
      const content = fs.readFileSync(txtPath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('|').map(p => p.trim());
          if (parts.length >= 5) {
            const [name, country, league, stadium, founded] = parts;
            // Only add if not already in DB (JSON takes precedence)
            if (!teamDb.has(name.toLowerCase())) {
              teamDb.set(name.toLowerCase(), {
                name,
                country,
                league,
                stadium,
                founded: parseInt(founded, 10)
              });
            }
          }
        }
      });
    } catch (e) {
      console.warn('⚠️  Failed to load teams.txt:', e.message);
    }
  }

  return teamDb;
}

// ======= Time Window Functions =======
function getTimeWindowLabel(hour) {
  if (hour >= 0 && hour < 8) return '0-8';
  if (hour >= 8 && hour < 16) return '8-16';
  if (hour >= 16 && hour < 24) return '16-24';
  return 'other';
}

function matchesTimeWindow(hour, timeWindow) {
  if (timeWindow === 'all') return true;
  const label = getTimeWindowLabel(hour);
  return label === timeWindow;
}

// ======= Strongest Tip Selection =======
// Prioritized bet types in order of preference
function findStrongestTip(bookmakers, tippTypes) {
  if (!bookmakers || bookmakers.length === 0) {
    return { tip: null, odds: null, betType: null };
  }

  let bestTip = null;
  let lowestOdds = Infinity;
  let bestBetType = null;

  // Iterate through each bet type in priority order
  for (const tippType of tippTypes) {
    for (const bookmaker of bookmakers) {
      const bet = bookmaker.bets?.find(b => b.name === tippType);
      if (!bet || !bet.values) continue;

      // Find the lowest odds value in this bet
      for (const value of bet.values) {
        const odds = parseFloat(value.odd);
        if (!isNaN(odds) && odds < lowestOdds) {
          lowestOdds = odds;
          bestTip = value.value;
          bestBetType = tippType;
        }
      }
    }

    // If we found a tip for this bet type, use it (prioritize by tippTypes order)
    if (bestTip) break;
  }

  return {
    tip: bestTip,
    odds: lowestOdds !== Infinity ? lowestOdds : null,
    betType: bestBetType
  };
}

// ======= API Functions =======
async function fetchFixtures(leagueId, season, date, apiKey) {
  try {
    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&date=${date}`;
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': apiKey }
    });
    
    return response.data.response || [];
  } catch (error) {
    console.error(`Error fetching fixtures for league ${leagueId}:`, error.message);
    return [];
  }
}

async function fetchOdds(fixtureId, apiKey) {
  try {
    const url = `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`;
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': apiKey }
    });
    
    return response.data.response?.[0]?.bookmakers || [];
  } catch (error) {
    console.error(`Error fetching odds for fixture ${fixtureId}:`, error.message);
    return [];
  }
}

// ======= Main Algorithm =======
async function generateTips(options = {}) {
  loadEnv();
  
  const config = loadConfig();
  const apiKey = process.env.X_APISPORTS_KEY || options.apiKey;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API key not configured. Please set X_APISPORTS_KEY in .env file');
  }

  const leagues = options.leagues || config.leagues;
  const date = options.date || new Date().toISOString().slice(0, 10);
  const timeWindow = options.timeWindow || config.default_time_window;
  const maxMatches = options.maxMatches || config.max_matches;
  const tippTypes = options.tippTypes || config.tipp_types;
  const apiDelay = options.apiDelay || config.api_delay_ms || 300;

  const teamDb = loadTeamDatabase();
  const allTips = [];

  console.log(`🔍 Generating tips for ${date}`);
  console.log(`📊 Time window: ${timeWindow}`);
  console.log(`🎯 Max matches: ${maxMatches}`);
  console.log(`🎲 Tip types: ${tippTypes.join(', ')}`);
  console.log('');

  for (const league of leagues) {
    console.log(`\n=== ${league.name} (League ID: ${league.id}, Season: ${league.season}) ===`);
    
    const fixtures = await fetchFixtures(league.id, league.season, date, apiKey);
    
    if (fixtures.length === 0) {
      console.log(`  ℹ️  No fixtures found for ${date}`);
      continue;
    }

    console.log(`  Found ${fixtures.length} fixture(s)`);

    for (const fixture of fixtures) {
      // Check max matches limit
      if (allTips.length >= maxMatches) {
        console.log(`\n✅ Reached maximum of ${maxMatches} matches`);
        break;
      }

      const fixtureDate = new Date(fixture.fixture.date);
      const hour = fixtureDate.getUTCHours();
      
      // Time window filtering
      if (!matchesTimeWindow(hour, timeWindow)) {
        continue;
      }

      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;

      console.log(`  ⚽ ${homeTeam} vs ${awayTeam}`);

      // Fetch odds
      const bookmakers = await fetchOdds(fixture.fixture.id, apiKey);
      
      // Find strongest tip
      const { tip, odds, betType } = findStrongestTip(bookmakers, tippTypes);

      // Lookup team metadata
      const homeDb = teamDb.get(homeTeam.toLowerCase()) || null;
      const awayDb = teamDb.get(awayTeam.toLowerCase()) || null;

      const tipData = {
        fixtureId: fixture.fixture.id,
        league: league.name,
        leagueId: league.id,
        date: fixture.fixture.date,
        timestamp: fixture.fixture.timestamp,
        hour: hour,
        timeWindow: getTimeWindowLabel(hour),
        home: homeTeam,
        away: awayTeam,
        home_db: homeDb,
        away_db: awayDb,
        venue: fixture.fixture.venue?.name || null,
        status: fixture.fixture.status.short,
        tip: tip,
        odds: odds,
        betType: betType
      };

      allTips.push(tipData);
      
      if (tip) {
        console.log(`     💡 Tip: ${tip} (${betType}) @ ${odds}`);
      } else {
        console.log(`     ⚠️  No odds available`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, apiDelay));
    }

    if (allTips.length >= maxMatches) break;
  }

  console.log(`\n\n📝 Generated ${allTips.length} tip(s)`);
  
  return allTips;
}

// ======= CLI Execution =======
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      options.date = args[i + 1];
      i++;
    } else if (args[i] === '--timeWindow' && args[i + 1]) {
      options.timeWindow = args[i + 1];
      i++;
    } else if (args[i] === '--maxMatches' && args[i + 1]) {
      options.maxMatches = parseInt(args[i + 1], 10);
      i++;
    }
  }

  generateTips(options)
    .then(tips => {
      const outputPath = path.join(__dirname, 'tippek_OKOSFOCI.json');
      fs.writeFileSync(outputPath, JSON.stringify(tips, null, 2));
      console.log(`\n✅ Saved to ${outputPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

// Export for use in server.js
module.exports = { generateTips, loadTeamDatabase };
