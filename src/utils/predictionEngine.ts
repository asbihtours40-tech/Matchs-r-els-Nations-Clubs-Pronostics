import { ExactScoreProb, MarketOdds, PoissonOutput, ValueOpportunity } from '../types/football';

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/**
 * Dixon-Coles correlation factor for low-scoring football outcomes (0-0, 1-0, 0-1, 1-1).
 * Negative rho slightly increases 0-0 and 1-1 probabilities as observed in empirical football data.
 */
function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho = -0.065
): number {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  return 1;
}

export function computePoissonModel(
  rawHomeLambda: number,
  rawAwayLambda: number,
  odds?: MarketOdds
): PoissonOutput {
  const homeLambda = Math.max(0.25, Math.min(4.2, rawHomeLambda));
  const awayLambda = Math.max(0.2, Math.min(4.0, rawAwayLambda));

  const maxGoals = 7;
  const fullGrid: number[][] = [];
  let totalMass = 0;

  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      const base = poissonPmf(h, homeLambda) * poissonPmf(a, awayLambda);
      const tau = Math.max(0.2, dixonColesTau(h, a, homeLambda, awayLambda));
      const prob = base * tau;
      row.push(prob);
      totalMass += prob;
    }
    fullGrid.push(row);
  }

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  let over15Prob = 0;
  let over25Prob = 0;
  let over35Prob = 0;
  let bttsYesProb = 0;

  const allScores: ExactScoreProb[] = [];

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = fullGrid[h][a] / totalMass;
      fullGrid[h][a] = p;

      if (h > a) homeWinProb += p;
      else if (h === a) drawProb += p;
      else awayWinProb += p;

      const totalGoals = h + a;
      if (totalGoals >= 2) over15Prob += p;
      if (totalGoals >= 3) over25Prob += p;
      if (totalGoals >= 4) over35Prob += p;
      if (h >= 1 && a >= 1) bttsYesProb += p;

      allScores.push({
        home: h,
        away: a,
        probability: p,
        fairOdd: p > 0.001 ? Number((1 / p).toFixed(2)) : 999,
      });
    }
  }

  allScores.sort((a, b) => b.probability - a.probability);

  const matrix: number[][] = [];
  for (let h = 0; h < 5; h++) {
    const row: number[] = [];
    for (let a = 0; a < 5; a++) {
      row.push(fullGrid[h][a]);
    }
    matrix.push(row);
  }

  const under25Prob = Math.max(0, 1 - over25Prob);
  const bttsNoProb = Math.max(0, 1 - bttsYesProb);

  const valueOpportunities: ValueOpportunity[] = [];
  if (odds) {
    const candidates: Array<{
      market: string;
      selection: string;
      modelProb: number;
      marketOdd: number;
    }> = [
      { market: '1N2', selection: 'Victoire Domicile (1)', modelProb: homeWinProb, marketOdd: odds.home },
      { market: '1N2', selection: 'Match Nul (N)', modelProb: drawProb, marketOdd: odds.draw },
      { market: '1N2', selection: 'Victoire Extérieur (2)', modelProb: awayWinProb, marketOdd: odds.away },
      { market: 'Total Buts', selection: 'Plus de 2,5 buts', modelProb: over25Prob, marketOdd: odds.over25 },
      { market: 'Total Buts', selection: 'Moins de 2,5 buts', modelProb: under25Prob, marketOdd: odds.under25 },
      { market: 'BTTS', selection: 'Les deux marquent — Oui', modelProb: bttsYesProb, marketOdd: odds.bttsYes },
      { market: 'BTTS', selection: 'Les deux marquent — Non', modelProb: bttsNoProb, marketOdd: odds.bttsNo },
    ];

    for (const item of candidates) {
      const impliedProb = 1 / item.marketOdd;
      const edgePct = (item.marketOdd * item.modelProb - 1) * 100;
      valueOpportunities.push({
        market: item.market,
        selection: item.selection,
        modelProb: item.modelProb,
        impliedProb,
        marketOdd: item.marketOdd,
        edgePct,
      });
    }

    valueOpportunities.sort((a, b) => b.edgePct - a.edgePct);
  }

  return {
    homeLambda,
    awayLambda,
    homeWinProb,
    drawProb,
    awayWinProb,
    over15Prob,
    over25Prob,
    under25Prob,
    over35Prob,
    bttsYesProb,
    bttsNoProb,
    doubleChance1N: homeWinProb + drawProb,
    doubleChanceN2: awayWinProb + drawProb,
    doubleChance12: homeWinProb + awayWinProb,
    matrix,
    topScores: allScores.slice(0, 6),
    valueOpportunities,
  };
}

export function formatPct(prob: number, decimals = 1): string {
  return `${(prob * 100).toFixed(decimals)}%`;
}

export function formatOdd(odd: number): string {
  return odd.toFixed(2);
}
