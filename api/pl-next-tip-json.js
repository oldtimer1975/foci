const axios = require('axios');
const fs = require('fs');
const API_KEY = '994b489e67a89ab53279084b9bf8199a';

(async () => {
  // Következő PL meccs
  const nextRes = await axios.get("https://v3.football.api-sports.io/fixtures?league=39&next=1", {
    headers: { 'x-apisports-key': API_KEY }
  });
  const fixture = nextRes.data.response?.[0];
  const fixtureId = fixture?.fixture?.id;
  const home = fixture?.teams?.home?.name;
  const away = fixture?.teams?.away?.name;
  const date = fixture?.fixture?.date;

  // Odds lekérés
  const oddsRes = await axios.get(`https://v3.football.api-sports.io/odds?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': API_KEY }
  });

  // Match Winner odds keresése
  const bookmaker = oddsRes.data.response?.[0]?.bookmakers?.[0];
  const matchWinner = bookmaker?.bets?.find(b => b.name === "Match Winner");
  const oddsHome = matchWinner?.values?.find(v => v.value === "Home")?.odd;
  const oddsDraw = matchWinner?.values?.find(v => v.value === "Draw")?.odd;
  const oddsAway = matchWinner?.values?.find(v => v.value === "Away")?.odd;

  let tip = "Nem elérhető";
  if (oddsHome && oddsDraw && oddsAway) {
    const arr = [
      { label: "Hazai", value: Number(oddsHome) },
      { label: "Döntetlen", value: Number(oddsDraw) },
      { label: "Vendég", value: Number(oddsAway) },
    ];
    tip = arr.sort((a, b) => a.value - b.value)[0].label;
  }

  // Objektum előkészítése
  const tippObj = {
    date,
    home,
    away,
    odds: {
      home: oddsHome,
      draw: oddsDraw,
      away: oddsAway
    },
    tip
  };

  // Kiírás konzolra
  console.log(tippObj);

  // Mentés json-ba
  fs.writeFileSync("tippet.json", JSON.stringify(tippObj, null, 2));
  console.log("Mentve: tippet.json");
})();
