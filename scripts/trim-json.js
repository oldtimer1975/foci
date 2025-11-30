const fs = require("fs");

const src = process.argv[2];
const dst = process.argv[3];
const keep = Number(process.argv[4] || 8000);

if (!src || !dst) {
  console.error("Használat: node scripts/trim-json.js <forrás.json> <cél.json> [megtartandó_szám]");
  process.exit(1);
}

const arr = JSON.parse(fs.readFileSync(src, "utf8"));
const trimmed = arr.slice(Math.max(0, arr.length - keep));
fs.writeFileSync(dst, JSON.stringify(trimmed, null, 2));
console.log(`[OK] Trim: ${arr.length} -> ${trimmed.length} (mentve: ${dst})`);
