// Egyszerű Football.TXT meccssor parser (sportdb jellegű formátumokra).
// Ha egy sor nem illeszkedik, később bővíthetjük a regexeket.
//
// Támogatott minták:
// 1) 2024-08-12 Team A 2-1 Team B
// 2) 12 Aug 2024, Team A vs Team B, 2-1
// Sor elején '#' kommentet kihagyjuk.

export type ParsedMatch = {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
};

export function parseFootballTxt(text: string): ParsedMatch[] {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const out: ParsedMatch[] = [];

  for (const s of lines) {
    if (!s || s.startsWith("#")) continue;

    // Minta 1: ISO dátum + eredmény: 2024-08-12 Team A 2-1 Team B
    let m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
    if (m) {
      out.push({
        date: m[1],
        homeTeam: m[2].trim(),
        homeGoals: Number(m[3]),
        awayGoals: Number(m[4]),
        awayTeam: m[5].trim(),
      });
      continue;
    }

    // Minta 2: 12 Aug 2024, Team A vs Team B, 2-1
    m = s.match(/^(\d{1,2}\s+\w+\s+\d{4}).*?,\s*(.+?)\s+vs\s+(.+?),\s*(\d+)\s*-\s*(\d+)$/i);
    if (m) {
      out.push({
        date: m[1],
        homeTeam: m[2].trim(),
        awayTeam: m[3].trim(),
        homeGoals: Number(m[4]),
        awayGoals: Number(m[5]),
      });
      continue;
    }

    // Ha nem illeszkedik egyik mintára sem, később bővítjük.
    // console.log("Ismeretlen sor formátum:", s);
  }

  return out;
}
