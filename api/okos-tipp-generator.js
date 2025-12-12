const axios = require('axios');
const fs = require('fs');
const API_KEY = '994b489e67a89ab53279084b9bf8199a'; // <- saját pro kulcsod!

// ----- Nagy bajnokságok -----
const LEAGUES = [
  { name: "Premier League", id: 39 },
  { name: "La Liga", id: 140 },
  { name: "Bundesliga", id: 78 },
  { name: "Serie A", id: 135 }
];

// ----- Mai nap dátuma -----
const today = "2024-11-25";

// ----- Időablakok -----
const TIME_WINDOWS = [
  { label: "0-8", start: 0, end: 8 },
  { label: "8-16", start: 8, end: 16 },
  { label: "16-24", start: 16, end: 24 }
];

// ----- Helper: időablak kiválasztás -----
function getTimeWindow(hour) {
  for (const win of TIME_WINDOWS) {
    if (hour >= win.start && hour < win.end) return win.label;
  }
  return "egyéb";
}

// ----- Meccs + odds lekérés egy ligából -----
async function getFixturesAndTips(leagueId) {
  const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&date=${today}`;
  const res = await axios.get(url, {headers: {'x-apisports-key': API_KEY}});
  const fixtures = res.data.response;
  let out = [];

  for (const fix of fixtures) {
    const hour = new Date(fix.fixture.date).getHours();
    const timeWindow = getTimeWindow(hour);

    // ODDS lekérés (Match Winner)
    let tip = "Nincs odds";
    let odds_home, odds_draw, odds_away;

    // Odds endpoint
    try {
      const oddsRes = await axios.get(`https://v3.football.api-sports.io/odds?fixture=${fix.fixture.id}`, {headers: {'x-apisports-key': API_KEY}});
      const mw = oddsRes.data.response?.[0]?.bookmakers?.[0]?.bets?.find(b => b.name === 'Match Winner');
      odds_home = mw?.values?.find(v => v.value === fix.teams.home.name)?.odd;
      odds_draw = mw?.values?.find(v => v.value === "Draw")?.odd;
      odds_away = mw?.values?.find(v => v.value === fix.teams.away.name)?.odd;
      // Tippelés
      if (odds_home && odds_draw && odds_away) {
        const arr = [
          {label: "Hazai", value: Number(odds_home)},
          {label: "Döntetlen", value: Number(odds_draw)},
          {label: "Vendég", value: Number(odds_away)},
        ];
        tip = arr.sort((a,b)=>a.value-b.value)[0].label;
      }
    } catch (e) {
      tip = "Odds hibás vagy nem elérhető";
    }

    out.push({
      liga: leagueId,
      home: fix.teams.home.name,
      away: fix.teams.away.name,
      date: fix.fixture.date,
      timeWindow,
      odds_home,
      odds_draw,
      odds_away,
      tip
    });

    // Kicsit várunk, hogy ne tiltsanak ki API limit miatt:
    await new Promise(r => setTimeout(r, 400));
  }
  return out;
}

// ----- Fő workflow -----
(async () => {
  let allTips = [];
  for (const lg of LEAGUES) {
    console.log(`=== ${lg.name} (${today}) ===`);
    const tips = await getFixturesAndTips(lg.id);
    tips.forEach(tip => {
      console.log(`[${tip.timeWindow}] ${tip.home} vs ${tip.away} -> Tipp: ${tip.tip} (oddsok: H${tip.odds_home} D${tip.odds_draw} V${tip.odds_away})`);
    });
    allTips.push(...tips);
  }
  // JSON-ba mentés:
  fs.writeFileSync("napi-tippek.json", JSON.stringify(allTips, null, 2));
  console.log("\nMentve: napi-tippek.json");
})();
