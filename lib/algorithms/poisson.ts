// Egyszerű Poisson-modell + odds kalkuláció + "legvalószínűbb tipp" + Kelly.

export type Match = { homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number };

export type OutcomeProbs = { homeWin: number; draw: number; awayWin: number };
export type Odds = { home: number; draw: number; away: number };

export type PoissonModel = {
  leagueAvgHome: number;
  leagueAvgAway: number;
  teamAttackHome: Record<string, number>;
  teamDefenseHome: Record<string, number>;
  teamAttackAway: Record<string, number>;
  teamDefenseAway: Record<string, number>;
  maxGoals: number;
};

export function trainPoissonModel(matches: Match[], maxGoals = 10): PoissonModel {
  if (!matches.length) throw new Error("Nincs meccsadat a modellhez.");
  let totalHome = 0, totalAway = 0;
  for (const m of matches) {
    totalHome += m.homeGoals;
    totalAway += m.awayGoals;
  }
  const leagueAvgHome = totalHome / matches.length;
  const leagueAvgAway = totalAway / matches.length;

  const stats: Record<string, { hF: number; hC: number; hG: number; aF: number; aC: number; aG: number }> = {};
  for (const m of matches) {
    stats[m.homeTeam] ||= { hF: 0, hC: 0, hG: 0, aF: 0, aC: 0, aG: 0 };
    stats[m.awayTeam] ||= { hF: 0, hC: 0, hG: 0, aF: 0, aC: 0, aG: 0 };
    stats[m.homeTeam].hF += m.homeGoals;
    stats[m.homeTeam].hC += m.awayGoals;
    stats[m.homeTeam].hG++;
    stats[m.awayTeam].aF += m.awayGoals;
    stats[m.awayTeam].aC += m.homeGoals;
    stats[m.awayTeam].aG++;
  }

  const teamAttackHome: Record<string, number> = {};
  const teamDefenseHome: Record<string, number> = {};
  const teamAttackAway: Record<string, number> = {};
  const teamDefenseAway: Record<string, number> = {};

  for (const [team, s] of Object.entries(stats)) {
    const avgHF = s.hG ? s.hF / s.hG : leagueAvgHome;
    const avgHC = s.hG ? s.hC / s.hG : leagueAvgAway;
    const avgAF = s.aG ? s.aF / s.aG : leagueAvgAway;
    const avgAC = s.aG ? s.aC / s.aG : leagueAvgHome;
    teamAttackHome[team] = Math.max(avgHF / (leagueAvgHome || 1), 0.2);
    teamDefenseHome[team] = Math.max(avgHC / (leagueAvgAway || 1), 0.2);
    teamAttackAway[team] = Math.max(avgAF / (leagueAvgAway || 1), 0.2);
    teamDefenseAway[team] = Math.max(avgAC / (leagueAvgHome || 1), 0.2);
  }

  return { leagueAvgHome, leagueAvgAway, teamAttackHome, teamDefenseHome, teamAttackAway, teamDefenseAway, maxGoals };
}

function poisson(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

export function predict(model: PoissonModel, homeTeam: string, awayTeam: string): {
  probs: OutcomeProbs; lambdaHome: number; lambdaAway: number;
} {
  const aH = model.teamAttackHome[homeTeam] ?? 1;
  const dH = model.teamDefenseHome[homeTeam] ?? 1;
  const aA = model.teamAttackAway[awayTeam] ?? 1;
  const dA = model.teamDefenseAway[awayTeam] ?? 1;

  const lambdaHome = Math.max(model.leagueAvgHome * aH * dA, 0.01);
  const lambdaAway = Math.max(model.leagueAvgAway * aA * dH, 0.01);

  let pH = 0, pD = 0, pA = 0;
  for (let hg = 0; hg <= model.maxGoals; hg++) {
    const ph = poisson(lambdaHome, hg);
    for (let ag = 0; ag <= model.maxGoals; ag++) {
      const pa = poisson(lambdaAway, ag);
      const p = ph * pa;
      if (hg > ag) pH += p;
      else if (hg === ag) pD += p;
      else pA += p;
    }
  }
  const sum = pH + pD + pA || 1;
  return {
    probs: { homeWin: pH / sum, draw: pD / sum, awayWin: pA / sum },
    lambdaHome, lambdaAway
  };
}

export function fairOdds(probs: OutcomeProbs): Odds {
  return {
    home: probs.homeWin ? 1 / probs.homeWin : Infinity,
    draw: probs.draw ? 1 / probs.draw : Infinity,
    away: probs.awayWin ? 1 / probs.awayWin : Infinity,
  };
}

export function mostLikelyTip(probs: OutcomeProbs): { tip: "home" | "draw" | "away"; prob: number } {
  const entries: [("home" | "draw" | "away"), number][] = [["home", probs.homeWin], ["draw", probs.draw], ["away", probs.awayWin]];
  entries.sort((a, b) => b[1] - a[1]);
  return { tip: entries[0][0], prob: entries[0][1] };
}

export function kelly(prob: number, odds: number): number {
  const b = odds - 1;
  if (b <= 0) return 0;
  const p = Math.min(Math.max(prob, 0), 1);
  const q = 1 - p;
  const f = (b * p - q) / b;
  return Math.max(f, 0);
}
