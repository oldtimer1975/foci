const axios = require('axios');
const API_KEY = '994b489e67a89ab53279084b9bf8199a'; // <- IDE írtad be a saját kulcsodat!

// Példa: Premier League ID: 39, Szezon: 2025
async function fetchMatches(leagueId, season) {
  const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`;
  const res = await axios.get(url, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.data.response) throw new Error("Nem kaptunk adatot!");
  return res.data.response.map(fix => ({
    date: fix.fixture.date,
    home: fix.teams.home.name,
    away: fix.teams.away.name,
    // Odds lekérése: ha van odds adat
    odds_home: fix.odds?.[0]?.bookmakers?.[0]?.bets?.find(b => b.name === 'Match Winner')?.values?.find(v => v.value === fix.teams.home.name)?.odd,
    odds_draw: fix.odds?.[0]?.bookmakers?.[0]?.bets?.find(b => b.name === 'Match Winner')?.values?.find(v => v.value === 'Draw')?.odd,
    odds_away: fix.odds?.[0]?.bookmakers?.[0]?.bets?.find(b => b.name === 'Match Winner')?.values?.find(v => v.value === fix.teams.away.name)?.odd
  }));
}

// Algoritmus: A legkisebb odds a legesélyesebb tipp!
function getOddsTip(match) {
  const oddsArr = [
    { label: "Hazai", value: Number(match.odds_home) },
    { label: "Döntetlen", value: Number(match.odds_draw) },
    { label: "Vendég", value: Number(match.odds_away) },
  ].filter(o => o.value); // csak létező odds
  return oddsArr.length > 0 ? oddsArr.sort((a, b) => a.value - b.value)[0].label : "Nincs elérhető odds";
}

(async () => {
  // PL példában Angol Bajnokság
  const matches = await fetchMatches(39, 2025); // (39 = Premier League, 2025 = évad)

  const tippek = matches.map(match => ({
    date: match.date,
    home: match.home,
    away: match.away,
    odds_home: match.odds_home,
    odds_draw: match.odds_draw,
    odds_away: match.odds_away,
    tipp: getOddsTip(match),
  }));

  // Kiírás konzolra
  tippek.forEach(t => {
    console.log(`${t.date}: ${t.home} vs ${t.away} -> Tipp: ${t.tipp} (oddsok: H${t.odds_home} D${t.odds_draw} V${t.odds_away})`);
  });

  // Opció: mentés fájlba
  const fs = require('fs');
  fs.writeFileSync("tippek.json", JSON.stringify(tippek, null, 2));
})();
