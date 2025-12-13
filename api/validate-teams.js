const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Team Database Validation Utility
 * 
 * This script fetches fixtures from API-Football and reports
 * which teams are not in the local team database.
 * Helps identify teams that need to be added to data/teams.json
 */

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const exampleConfigPath = path.join(__dirname, 'config.example.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else if (fs.existsSync(exampleConfigPath)) {
    console.warn('⚠️  config.json not found, using config.example.json');
    return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf-8'));
  } else {
    throw new Error('No configuration file found');
  }
}

// Load team database
function loadTeamDatabase() {
  const teamDbPath = path.join(__dirname, '..', 'data', 'teams.json');
  
  if (!fs.existsSync(teamDbPath)) {
    console.warn('⚠️  teams.json not found, using empty database');
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(teamDbPath, 'utf-8'));
  return data.teams || data;
}

// Fetch fixtures from API
async function fetchFixtures(league, date, apiKey, apiBaseUrl) {
  const url = `${apiBaseUrl}/fixtures?league=${league.id}&season=${league.season}&date=${date}`;
  
  try {
    const response = await axios.get(url, {
      headers: { 'x-apisports-key': apiKey },
      timeout: 10000
    });
    
    if (!response.data || !response.data.response) {
      return [];
    }
    
    return response.data.response;
  } catch (error) {
    console.error(`❌ Error fetching fixtures for ${league.name}:`, error.message);
    return [];
  }
}

// Check if team exists in database
function teamExists(teamName, teamDb) {
  if (!teamName || !teamDb || teamDb.length === 0) return false;
  
  // Exact match
  if (teamDb.find(t => t.name === teamName)) return true;
  
  // Case-insensitive match
  const lowerName = teamName.toLowerCase();
  if (teamDb.find(t => t.name.toLowerCase() === lowerName)) return true;
  
  // Partial match
  return teamDb.some(t => 
    t.name.toLowerCase().includes(lowerName) || 
    lowerName.includes(t.name.toLowerCase())
  );
}

// Main validation function
async function validateTeams(options = {}) {
  console.log('🔍 Team Database Validation Tool\n');
  
  // Load configuration and database
  const config = loadConfig();
  const teamDb = loadTeamDatabase();
  
  const apiKey = options.apiKey || process.env.X_APISPORTS_KEY;
  if (!apiKey) {
    throw new Error('API key not provided. Set X_APISPORTS_KEY environment variable.');
  }
  
  const date = options.date || new Date().toISOString().slice(0, 10);
  const leagues = options.leagues || config.leagues;
  
  console.log(`📅 Date: ${date}`);
  console.log(`📚 Teams in database: ${teamDb.length}`);
  console.log(`🏆 Checking leagues: ${leagues.map(l => l.name).join(', ')}\n`);
  
  const unmatchedTeams = new Set();
  const allTeams = new Set();
  
  for (const league of leagues) {
    console.log(`\n=== ${league.name} ===`);
    const fixtures = await fetchFixtures(league, date, apiKey, config.apiBaseUrl);
    
    if (fixtures.length === 0) {
      console.log(`  No fixtures found for ${date}`);
      continue;
    }
    
    console.log(`  Found ${fixtures.length} fixtures`);
    
    for (const fixture of fixtures) {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      
      allTeams.add(homeTeam);
      allTeams.add(awayTeam);
      
      if (!teamExists(homeTeam, teamDb)) {
        unmatchedTeams.add(homeTeam);
        console.log(`  ❌ Missing: ${homeTeam}`);
      }
      
      if (!teamExists(awayTeam, teamDb)) {
        unmatchedTeams.add(awayTeam);
        console.log(`  ❌ Missing: ${awayTeam}`);
      }
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total teams found: ${allTeams.size}`);
  console.log(`Teams in database: ${teamDb.length}`);
  console.log(`Unmatched teams: ${unmatchedTeams.size}`);
  
  if (unmatchedTeams.size > 0) {
    console.log('\n⚠️  Teams to add to database:');
    console.log('─'.repeat(50));
    Array.from(unmatchedTeams).sort().forEach(team => {
      console.log(`  • ${team}`);
    });
    
    // Generate JSON template
    console.log('\n💡 JSON template for data/teams.json:');
    console.log('─'.repeat(50));
    const template = Array.from(unmatchedTeams).sort().map(team => ({
      name: team,
      country: 'TODO',
      league: 'TODO',
      founded: null,
      venue: 'TODO',
      capacity: null
    }));
    console.log(JSON.stringify(template, null, 2));
  } else {
    console.log('\n✅ All teams are in the database!');
  }
  
  return {
    totalTeams: allTeams.size,
    teamsInDb: teamDb.length,
    unmatchedTeams: Array.from(unmatchedTeams).sort()
  };
}

// CLI execution
if (require.main === module) {
  require('dotenv').config();
  
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    
    // Check if value exists
    if (i + 1 >= args.length) break;
    const value = args[i + 1];
    
    if (key === 'date') options.date = value;
  }
  
  validateTeams(options)
    .then(() => {
      console.log('\n✅ Validation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { validateTeams };
