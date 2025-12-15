#!/usr/bin/env node

/**
 * validate-teams.js
 * 
 * Utility script to validate team names from API fixtures against the local team database.
 * Reports unmatched teams so the database can be expanded.
 * 
 * Usage:
 *   node scripts/validate-teams.js [--date YYYY-MM-DD]
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load team database
function loadTeamDatabase() {
  const teamDb = new Set();
  const jsonPath = path.join(__dirname, '..', 'data', 'teams.json');
  const txtPath = path.join(__dirname, '..', 'data', 'teams.txt');

  // Load JSON
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (data.teams && Array.isArray(data.teams)) {
        data.teams.forEach(team => {
          if (team.name) {
            teamDb.add(team.name.toLowerCase());
          }
        });
      }
    } catch (e) {
      console.warn('⚠️  Failed to load teams.json:', e.message);
    }
  }

  // Load TXT
  if (fs.existsSync(txtPath)) {
    try {
      const content = fs.readFileSync(txtPath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('|');
          if (parts.length >= 1) {
            teamDb.add(parts[0].trim().toLowerCase());
          }
        }
      });
    } catch (e) {
      console.warn('⚠️  Failed to load teams.txt:', e.message);
    }
  }

  return teamDb;
}

// Load config
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'api', 'config.json');
  const examplePath = path.join(__dirname, '..', 'api', 'config.example.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else if (fs.existsSync(examplePath)) {
    return JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
  }
  
  throw new Error('No config file found');
}

// Load environment
function loadEnv() {
  const envPath = path.join(__dirname, '..', 'api', '.env');
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

// Fetch fixtures
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

// Main validation
async function validateTeams(date) {
  loadEnv();
  
  const config = loadConfig();
  const apiKey = process.env.X_APISPORTS_KEY;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API key not configured. Please set X_APISPORTS_KEY in .env file');
  }

  const teamDb = loadTeamDatabase();
  const unmatchedTeams = new Set();
  const matchedTeams = new Set();
  let totalTeams = 0;

  console.log(`\n🔍 Validating teams for ${date}`);
  console.log(`📚 Team database size: ${teamDb.size} teams\n`);

  for (const league of config.leagues) {
    console.log(`Checking ${league.name}...`);
    
    const fixtures = await fetchFixtures(league.id, league.season, date, apiKey);
    
    for (const fixture of fixtures) {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      
      totalTeams += 2;
      
      if (!teamDb.has(homeTeam.toLowerCase())) {
        unmatchedTeams.add(homeTeam);
      } else {
        matchedTeams.add(homeTeam);
      }
      
      if (!teamDb.has(awayTeam.toLowerCase())) {
        unmatchedTeams.add(awayTeam);
      } else {
        matchedTeams.add(awayTeam);
      }
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Total team references: ${totalTeams}`);
  console.log(`Unique teams found: ${matchedTeams.size + unmatchedTeams.size}`);
  console.log(`✅ Matched in database: ${matchedTeams.size}`);
  console.log(`❌ Unmatched (missing): ${unmatchedTeams.size}`);
  
  if (unmatchedTeams.size > 0) {
    console.log('\n🔴 UNMATCHED TEAMS:');
    console.log('Add these to data/teams.json or data/teams.txt:\n');
    
    const sortedUnmatched = Array.from(unmatchedTeams).sort();
    sortedUnmatched.forEach(team => {
      console.log(`  - ${team}`);
    });
    
    console.log('\nSuggested TXT format:');
    sortedUnmatched.forEach(team => {
      console.log(`${team}|Country|League|Stadium|Year`);
    });
  } else {
    console.log('\n✅ All teams are in the database!');
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  let date = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      date = args[i + 1];
      i++;
    }
  }

  validateTeams(date)
    .then(() => {
      console.log('\n✅ Validation complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { validateTeams, loadTeamDatabase };
