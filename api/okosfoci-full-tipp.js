const axios = require('axios');
const fs = require('fs');

// ======= KONFIGURÁLHATÓ PARAMÉTEREK =======
const API_KEY = '994b489e67a89ab53279084b9bf8199a';
const LEAGUES = [
  { name: "Premier League", id: 39 },
  { name: "La Liga", id: 140 },
  { name: "Bundesliga", id: 78 },
  { name: "Serie A", id: 135 }
];
const TODAY = new Date().toISOString().slice(0, 10); // vagy pl. '2025-12-13'
const TIME_WINDOW = "all"; // "all" vagy "0-8", "8-16", "16-24"
const TIPP_TYPE = "Match Winner"; // "Match Winner", "Over/Under 2.5", "Double Chance" stb.
const MAX_MATCHES = 20; // mennyi meccset tippeljen ki (pl. 3,6,8,10...)
// ======= VÉGE =======

// ---- Időablakok ----
const TIME_WINDOWS = [
  { label: "0-8", start: 0, end: 8 },
  { label: "8-16", start: 8, end: 16 },
  { label: "16-24", start: 16, end: 24 }
];
function getTimeWindow(hour) {
  for (const win of TIME_WINDOWS) if (hour >= win.start && hour < win.end) return win.label;
  return "egyéb";
}

// ---- Meccs + odds lekérés egy ligából ----
async function getFixturesAndTips(league, date, timeWin, tippType, maxMatches) {
  let url = `https://v3.football.api-sports.io/fixtures?league=${league.id}&date=${date}`;
  let res = await axios.get(url, { headers: { 'x-apisports-key': API_KEY } });

  // DEBUG: FIXTURES kiíratás
  console.log(`DEBUG: FIXTURES for ${league.name} on ${date}:`);
  console.log(JSON.stringify(res.data, null, 2));

  let fixtures = res.data.response;
  if (!fixtures.length) return [];

  let out = [];
  for (const fix of fixtures) {
    const hour = new Date(fix.fixture.date).getHours();
    const actualTimeWindow = getTimeWindow(hour);

    if (timeWin !== "all" && actualTimeWindow !== timeWin) continue;

    // ODDS lekérés
    let oddsHome, oddsDraw, oddsAway, tippVal, tippText = "Nincs odds";
    try {
      const oddsRes = await axios.get(
        `https://v3.football.api-sports.io/odds?fixture=${fix.fixture.id}`,
        { headers: { 'x-apisports-key': API_KEY } }
      );
      const bookmaker = oddsRes.data.response?.[0]?.bookmakers?.[0];
      const bet = bookmaker?.bets?.find(b => b.name === tippType);

      if (tippType === "Match Winner") {
        oddsHome = bet?.values?.find(v => v.value === "Home")?.odd;
        oddsDraw = bet?.values?.find(v => v.value === "Draw")?.odd;
        oddsAway = bet?.values?.find(v => v.value === "Away")?.odd;

        if (oddsHome && oddsDraw && oddsAway) {
          let arr = [
            { label: "Hazai", value: Number(oddsHome) },
            { label: "Döntetlen", value: Number(oddsDraw) },
            { label: "Vendég", value: Number(oddsAway) },
          ];
          arr = arr.sort((a, b) => a.value - b.value);
          tippVal = arr[0].value;
          tippText = arr[0].label;
        }
      } else if (tippType === "Over/Under 2.5") {
        const ou25 = bet?.values;
        const over = ou25?.find(v => v.value === "Over 2.5")?.odd;
        const under = ou25?.find(v => v.value === "Under 2.5")?.odd;
        if (over && under) {
          let arr = [
            { label: "Over 2.5", value: Number(over) },
            { label: "Under 2.5", value: Number(under) }
          ];
          arr = arr.sort((a, b) => a.value - b.value);
          tippVal = arr[0].value;
          tippText = arr[0].label;
        }
      } else {
        // Egyéb: kiírjuk az összeset
        if (bet?.values?.length) {
          tippText = bet.values.map(v => `${v.value}(${v.odd})`).join(" | ");
          tippVal = null;
        }
      }
    } catch (e) {
      tippText = "Odds nem elérhető vagy hiba";
    }

    out.push({
      liga: league.name,
      home: fix.teams.home.name,
      away: fix.teams.away.name,
      date: fix.fixture.date,
      hour,
      timeWindow: actualTimeWindow,
      odds_home: oddsHome,
      odds_draw: oddsDraw,
      odds_away: oddsAway,
      tipp: tippText,
      tippVal
    });

    if (out.length === maxMatches) break;
    await new Promise(r => setTimeout(r, 300));
  }
  return out;
}

// ==== Fő workflow ====
(async () => {
  let allTips = [];
  for (const lg of LEAGUES) {
    console.log(`=== ${lg.name} | ${TODAY} ===`);
    const tips = await getFixturesAndTips(lg, TODAY, TIME_WINDOW, TIPP_TYPE, MAX_MATCHES);
    tips.forEach(tip => {
      console.log(
        `[${tip.timeWindow}] ${tip.home} vs ${tip.away} -> Tipp: ${tip.tipp} (H${tip.odds_home} D${tip.odds_draw} V${tip.odds_away})`
      );
    });
    allTips.push(...tips);
  }
  if (!allTips.length) {
    console.log("\nNincs egy tip sem - nincsenek meccsek, vagy egyiknél sincs odds.");
  }
  fs.writeFileSync("tippek_FULL.json", JSON.stringify(allTips, null, 2));
  console.log("\nMentve: tippek_FULL.json");
})();
