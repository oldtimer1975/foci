const fs = require("fs");
const path = require("path");

function parseLine(line) {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;
  const m = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
  if (!m) return null;
  return {
    date: m[1],
    homeTeam: m[2].trim(),
    homeGoals: Number(m[3]),
    awayGoals: Number(m[4]),
    awayTeam: m[5].trim(),
    league: "eng.1",
  };
}

function walkTxtFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walkTxtFiles(full));
    else if (stat.isFile() && full.endsWith(".txt")) out.push(full);
  }
  return out;
}

function main() {
  const sourceDir = process.argv[2];
  const outJson = process.argv[3];
  if (!sourceDir || !outJson) {
    console.error("Használat: node scripts/ingest-england.js ../data/england output/england.json");
    process.exit(1);
  }
  const files = walkTxtFiles(sourceDir);
  const matches = [];
  for (const f of files) {
    const content = fs.readFileSync(f, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const rec = parseLine(line);
      if (rec) matches.push(rec);
    }
  }
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(matches, null, 2));
  console.log(`[OK] Mentve: ${outJson} (${matches.length} meccs)`);
}
main();
