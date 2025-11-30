/**
 * Használat:
 *   node scripts/ingest-season-league-json.js ../data/football_seasons output/all-matches-raw.json
 *   SEASON_LIMIT=3 DEBUG=1 node scripts/ingest-season-league-json.js ../data/football_seasons output/all-matches-raw.json
 */
const fs = require("fs");
const path = require("path");

const DEBUG = process.env.DEBUG === "1";

function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }

function parseScoreString(s) {
  if (!s || typeof s !== "string") return null;
  // Engedjük a különböző kötőjeleket: -, –, —
  const m = s.trim().match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (!m) return null;
  return { s1: Number(m[1]), s2: Number(m[2]) };
}

function takeMatch(m, out) {
  if (!isObject(m)) return;

  const date = m.date || m.play_at || m.played_at || null;
  const homeTeam = m.team1 || m.homeTeam || m.home || m.club1 || m.host || null;
  const awayTeam = m.team2 || m.awayTeam || m.away || m.club2 || m.guest || null;

  // Többféle gólfeloldás
  let homeGoals = m.score1 ?? m.homeGoals ?? m.goals1 ?? m.home_score ?? m.hs;
  let awayGoals = m.score2 ?? m.awayGoals ?? m.goals2 ?? m.away_score ?? m.as;

  if (homeGoals == null && awayGoals == null && m.score) {
    const ps = parseScoreString(String(m.score));
    if (ps) { homeGoals = ps.s1; awayGoals = ps.s2; }
  }

  const toNum = (x) => (x === "" || x === null || x === undefined ? null : Number(x));
  const hg = toNum(homeGoals);
  const ag = toNum(awayGoals);

  if (date && homeTeam && awayTeam && Number.isFinite(hg) && Number.isFinite(ag)) {
    out.push({
      date: String(date).slice(0, 10),
      homeTeam: String(homeTeam).trim(),
      awayTeam: String(awayTeam).trim(),
      homeGoals: hg,
      awayGoals: ag,
    });
  }
}

function extractFromRoot(root) {
  const out = [];
  if (!isObject(root)) return out;

  if (Array.isArray(root.matches)) {
    root.matches.forEach(m => takeMatch(m, out));
  }
  if (Array.isArray(root.games)) {
    root.games.forEach(m => takeMatch(m, out));
  }
  if (Array.isArray(root.rounds)) {
    for (const r of root.rounds) {
      if (Array.isArray(r.matches)) r.matches.forEach(m => takeMatch(m, out));
      if (Array.isArray(r.games)) r.games.forEach(m => takeMatch(m, out));
    }
  }
  // Egyes dumpoknál előfordul "matchdays" vagy "fixtures" kulcs
  if (Array.isArray(root.matchdays)) {
    for (const d of root.matchdays) {
      if (Array.isArray(d.matches)) d.matches.forEach(m => takeMatch(m, out));
      if (Array.isArray(d.games)) d.games.forEach(m => takeMatch(m, out));
    }
  }
  if (Array.isArray(root.fixtures)) {
    root.fixtures.forEach(m => takeMatch(m, out));
  }

  return out;
}

function seasonDirs(root) {
  return fs.readdirSync(root)
    .filter(d => /^\d{4}-\d{2}$/.test(d))
    .map(d => path.join(root, d))
    .filter(p => fs.statSync(p).isDirectory());
}

function main() {
  const [,, sourceDir, outFile] = process.argv;
  if (!sourceDir || !outFile) {
    console.error("Használat: node scripts/ingest-season-league-json.js <forrás_könyvtár> <kimenet.json>");
    process.exit(1);
  }
  if (!fs.existsSync(sourceDir)) {
    console.error("Nincs ilyen könyvtár:", sourceDir);
    process.exit(1);
  }

  const limit = process.env.SEASON_LIMIT ? Number(process.env.SEASON_LIMIT) : null;

  let seasons = seasonDirs(sourceDir).sort(); // növekvő
  if (limit && seasons.length > limit) {
    seasons = seasons.slice(-limit);
  }

  const all = [];
  for (const seasonPath of seasons) {
    const seasonName = path.basename(seasonPath);
    const files = fs.readdirSync(seasonPath).filter(f => f.endsWith(".json"));
    let seasonCount = 0;

    for (const file of files) {
      const full = path.join(seasonPath, file);
      try {
        const text = fs.readFileSync(full, "utf8");
        const json = JSON.parse(text);
        const matches = extractFromRoot(json);
        const leagueCode = path.basename(file, ".json");
        const [country, division] = leagueCode.split(".");
        matches.forEach(m => {
          all.push({
            ...m,
            season: seasonName,
            leagueCode,
            country: country || null,
            division: division || null
          });
        });
        seasonCount += matches.length;
        if (DEBUG) console.log(`[DEBUG] ${seasonName}/${leagueCode}: ${matches.length} meccs`);
      } catch (e) {
        console.warn("[WARN] JSON parse vagy feldolgozási hiba:", full, e.message);
      }
    }
    if (DEBUG) console.log(`[DEBUG] Szezon összesen ${seasonName}: ${seasonCount}`);
  }

  // Dedup
  const seen = new Set();
  const dedup = [];
  for (const m of all) {
    const key = `${m.season}|${m.date}|${m.homeTeam}|${m.awayTeam}|${m.homeGoals}|${m.awayGoals}`;
    if (!seen.has(key)) { seen.add(key); dedup.push(m); }
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(dedup, null, 2));
  console.log(`[OK] Összes meccs (dedup): ${dedup.length} -> ${outFile}`);

  // Statisztika
  const bySeason = {};
  for (const m of dedup) bySeason[m.season] = (bySeason[m.season] || 0) + 1;
  console.log("Szezon bontás:", bySeason);
}

main();
