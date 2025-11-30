/**
 * Nagy football.json fájlból kinyer meccs listát:
 * output/matches-raw.json -> [{date, homeTeam, awayTeam, homeGoals, awayGoals}, ...]
 *
 * Használat:
 *   node scripts/extract-matches-from-football-json.js ../data/football.json output/matches-raw.json
 *
 * Ha nem talál meccseket, futtasd ellenőrző módban:
 *   node scripts/extract-matches-from-football-json.js ../data/football.json output/matches-raw.json --debug
 */

const fs = require("fs");
const path = require("path");

function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }

function tryExtractMatch(obj) {
  if (!isObject(obj)) return null;

  // Lehetséges kulcsok:
  // date / play_at / played_at
  // homeTeam / team1 / home / club1
  // awayTeam / team2 / away / club2
  // homeGoals / score1 / goals1 / home_score
  // awayGoals / score2 / goals2 / away_score

  const date = obj.date || obj.play_at || obj.played_at || obj.matchday || null;

  // Csapatnevek
  const homeTeam = obj.homeTeam || obj.team1 || obj.home || obj.club1 || obj.host || null;
  const awayTeam = obj.awayTeam || obj.team2 || obj.away || obj.club2 || obj.guest || null;

  // Gólszámok
  const homeGoalsRaw = obj.homeGoals ?? obj.score1 ?? obj.goals1 ?? obj.home_score ?? obj.hs ?? obj.scoreHome;
  const awayGoalsRaw = obj.awayGoals ?? obj.score2 ?? obj.goals2 ?? obj.away_score ?? obj.as ?? obj.scoreAway;

  // Ellenőrzés: szám-e
  const toNum = (x) => (x === "" || x === null || x === undefined ? null : Number(x));
  const homeGoals = toNum(homeGoalsRaw);
  const awayGoals = toNum(awayGoalsRaw);

  // Legalább ezek kellenek
  if (date && homeTeam && awayTeam && Number.isFinite(homeGoals) && Number.isFinite(awayGoals)) {
    return {
      date: String(date).slice(0, 10), // ha timestamp, levágjuk
      homeTeam: String(homeTeam).trim(),
      awayTeam: String(awayTeam).trim(),
      homeGoals,
      awayGoals,
    };
  }
  return null;
}

function deepScan(value, out, debug) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const m = tryExtractMatch(item);
      if (m) {
        out.push(m);
        continue;
      }
      deepScan(item, out, debug);
    }
  } else if (isObject(value)) {
    const m = tryExtractMatch(value);
    if (m) {
      out.push(m);
    } else {
      // Rekurzív bejárás objektum mezőkön
      for (const k of Object.keys(value)) {
        deepScan(value[k], out, debug);
      }
    }
  }
}

function main() {
  const [,, srcPath, dstPath, ...rest] = process.argv;
  const debug = rest.includes("--debug");
  if (!srcPath || !dstPath) {
    console.error("Használat: node scripts/extract-matches-from-football-json.js <forrás.json> <kimenet.json> [--debug]");
    process.exit(1);
  }
  if (!fs.existsSync(srcPath)) {
    console.error("Nincs ilyen forrás fájl:", srcPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(srcPath, "utf8");
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error("JSON parse hiba:", e.message);
    process.exit(1);
  }

  const matches = [];
  deepScan(json, matches, debug);

  // Deduplikálás (azonos date+teams+gólok esetén)
  const seen = new Set();
  const dedup = [];
  for (const m of matches) {
    const key = `${m.date}|${m.homeTeam}|${m.awayTeam}|${m.homeGoals}|${m.awayGoals}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(m);
    }
  }

  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.writeFileSync(dstPath, JSON.stringify(dedup, null, 2));
  console.log(`[OK] Meccsek: ${dedup.length} -> ${dstPath}`);

  if (debug) {
    // Gyors statisztika
    const byYear = {};
    for (const m of dedup) {
      const year = m.date.slice(0,4);
      byYear[year] = (byYear[year] || 0) + 1;
    }
    console.log("Éves bontás:", byYear);
    // Csapatok száma
    const teams = new Set();
    dedup.forEach(m => { teams.add(m.homeTeam); teams.add(m.awayTeam); });
    console.log("Csapatok száma:", teams.size);
  }
}

main();
