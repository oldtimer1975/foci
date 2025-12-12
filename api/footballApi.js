// Időablakok a UI-hoz
export const TIME_WINDOWS = [
  { key: "00:00-08:00", label: "0–8 óra", from: "00:00", to: "08:00" },
  { key: "08:00-16:00", label: "8–16 óra", from: "08:00", to: "16:00" },
  { key: "16:00-24:00", label: "16–24 óra", from: "16:00", to: "24:00" },
  { key: "00:00-23:59", label: "Napi", from: "00:00", to: "23:59" },
];

// Segéd: HH:MM → percek
export function hmToMinutes(hm) {
  const [h, m] = String(hm).split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

// Segéd: Date → HH:MM (helyi)
export function dateToHM(d) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Minta adat (fejlesztéshez)
export async function getGamesByDate(dateStr) {
  const baseDate = new Date(`${dateStr}T00:00:00`);
  const mk = (h, home, away, status = "Scheduled") => ({
    GameId: Math.floor(Math.random() * 1e6),
    HomeTeam: home,
    AwayTeam: away,
    Status: status,
    _startDate: new Date(baseDate.getTime() + h * 60 * 60 * 1000),
  });
  return [
    mk(10, "Ferencváros", "Debrecen", "Scheduled"),
    mk(11.5, "Barcelona", "Real Madrid", "Live"),
    mk(18, "Arsenal", "Chelsea", "Scheduled"),
    mk(20.25, "Bayern", "Dortmund", "Scheduled"),
  ];
}

// Általános időablak szűrő Date-alapú meccsobjektumokra
export function filterGamesByWindow(games, windowStr, nowMode = false) {
  if (!Array.isArray(games) || games.length === 0) return [];
  if (nowMode) {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return games.filter((g) => g._startDate >= now && g._startDate <= twoHoursLater);
  }
  const [fromHM, toHM] = String(windowStr).includes("-")
    ? windowStr.split("-")
    : ["00:00", "23:59"];
  const fromMin = hmToMinutes(fromHM);
  const toMin = hmToMinutes(toHM);
  return games.filter((g) => {
    const mins = g._startDate.getHours() * 60 + g._startDate.getMinutes();
    return mins >= fromMin && mins <= toMin;
  });
}

// Normalizáló – nyers rekord → egységes mezők az app UI-hoz
export function normalizeRecord(rec) {
  return {
    fixtureId: rec.fixtureId ?? rec.id ?? rec.fixture_id ?? rec.GameId ?? undefined,
    leagueName:
      rec.leagueName ??
      rec.league_name ??
      rec.league?.name ??
      rec.competition?.name ??
      "Ismeretlen liga",
    home: rec.home ?? rec.HomeTeam ?? rec.teams?.home?.name ?? "-",
    away: rec.away ?? rec.AwayTeam ?? rec.teams?.away?.name ?? "-",
    startUTC: rec.startUTC ?? rec.date ?? rec.fixture?.date ?? null,
    startTzLocal:
      rec.startTzLocal ??
      (rec._startDate instanceof Date ? dateToHM(rec._startDate) : null),
    pickOutcome: rec.pickOutcome ?? rec.tip ?? rec.recommendation ?? null,
    probability: typeof rec.probability === "number" ? rec.probability : rec.prob ?? null,
    odds: rec.odds ?? rec.bookmakers?.[0]?.odds ?? undefined,
  };
}
