// Összefogó függvény: TXT meccsadat -> modell -> előrejelzés -> (opcionális) Kelly.
import { parseFootballTxt } from "../datasources/footballtxt";
import { trainPoissonModel, predict, fairOdds, mostLikelyTip, kelly } from "./poisson";

export type MarketOdds = { home: number; draw: number; away: number };

export function runAlgoritmus(rawTxt: string, homeTeam: string, awayTeam: string, market?: MarketOdds) {
  const matchesRaw = parseFootballTxt(rawTxt);
  const matches = matchesRaw.map(m => ({
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
  }));

  const model = trainPoissonModel(matches);
  const { probs, lambdaHome, lambdaAway } = predict(model, homeTeam, awayTeam);
  const fair = fairOdds(probs);
  const tip = mostLikelyTip(probs);

  let kellyOut: { selection: "home" | "draw" | "away"; fraction: number; prob: number; odds: number }[] = [];
  if (market) {
    kellyOut = [
      { selection: "home", prob: probs.homeWin, odds: market.home, fraction: kelly(probs.homeWin, market.home) * 0.25 },
      { selection: "draw", prob: probs.draw, odds: market.draw, fraction: kelly(probs.draw, market.draw) * 0.25 },
      { selection: "away", prob: probs.awayWin, odds: market.away, fraction: kelly(probs.awayWin, market.away) * 0.25 },
    ].filter(v => v.fraction > 0).sort((a, b) => b.fraction - a.fraction);
  }

  return { probs, fairOdds: fair, tip, lambdaHome, lambdaAway, kelly: kellyOut };
}
