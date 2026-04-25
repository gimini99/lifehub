import type { AssetClass, SimInputs, SimResult } from "../types";
import { CMA, CORR, ASSET_CLASSES } from "./cma";

// Box-Muller standard normal
function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Cholesky decomposition (lower-triangular L such that L*L^T = A)
function cholesky(a: number[][]): number[][] {
  const n = a.length;
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const v = a[i][i] - sum;
        L[i][j] = Math.sqrt(Math.max(v, 1e-12));
      } else {
        L[i][j] = (a[i][j] - sum) / (L[j][j] || 1e-12);
      }
    }
  }
  return L;
}

const L_CHOL = cholesky(CORR);

/**
 * Annual-step Monte Carlo. For each path:
 *   1. Generate correlated standard normals via Cholesky.
 *   2. Compute asset-class returns under GBM: r_i = mu_i - 0.5*sigma_i^2 + sigma_i * z_i
 *   3. Portfolio return = sum(weight_i * r_i)  (rebalanced annually)
 *   4. Apply return then withdraw inflation-adjusted spending.
 *   5. If balance hits 0 → path failed.
 */
export function runMonteCarlo(input: SimInputs): SimResult {
  const { startingBalance, weights, annualWithdrawal, inflation, horizonYears, paths } = input;
  const n = ASSET_CLASSES.length;

  const wArr = ASSET_CLASSES.map((c) => weights[c] ?? 0);
  const muArr = ASSET_CLASSES.map((c) => CMA[c].mu);
  const sigArr = ASSET_CLASSES.map((c) => CMA[c].sigma);

  const balances: number[][] = Array.from({ length: paths }, () => new Array(horizonYears + 1));
  let successes = 0;
  let totalDepletionYears = 0;
  let depletionCount = 0;

  for (let p = 0; p < paths; p++) {
    let bal = startingBalance;
    balances[p][0] = bal;
    let depletedAt: number | null = null;

    for (let t = 1; t <= horizonYears; t++) {
      const z: number[] = new Array(n);
      for (let i = 0; i < n; i++) z[i] = gaussian();
      const corr: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k <= i; k++) corr[i] += L_CHOL[i][k] * z[k];
      }

      let portRet = 0;
      for (let i = 0; i < n; i++) {
        if (wArr[i] === 0) continue;
        const r = muArr[i] - 0.5 * sigArr[i] * sigArr[i] + sigArr[i] * corr[i];
        portRet += wArr[i] * (Math.exp(r) - 1);
      }

      bal = bal * (1 + portRet);
      const spend = annualWithdrawal * Math.pow(1 + inflation, t - 1);
      bal -= spend;

      if (bal <= 0) {
        bal = 0;
        if (depletedAt === null) depletedAt = t;
      }
      balances[p][t] = bal;
    }

    if (balances[p][horizonYears] > 0) successes++;
    if (depletedAt !== null) {
      totalDepletionYears += depletedAt;
      depletionCount++;
    }
  }

  const pcts = computePercentiles(balances, horizonYears);
  return {
    successProbability: successes / paths,
    percentiles: pcts,
    medianEnding: pcts.p50[horizonYears],
    yearsToDepletion: depletionCount > 0 ? totalDepletionYears / depletionCount : null,
  };
}

function computePercentiles(balances: number[][], horizon: number): SimResult["percentiles"] {
  const p5: number[] = [], p25: number[] = [], p50: number[] = [], p75: number[] = [], p95: number[] = [];
  for (let t = 0; t <= horizon; t++) {
    const col = balances.map((row) => row[t]).sort((a, b) => a - b);
    const pct = (q: number) => col[Math.min(col.length - 1, Math.floor(q * col.length))];
    p5.push(pct(0.05));
    p25.push(pct(0.25));
    p50.push(pct(0.50));
    p75.push(pct(0.75));
    p95.push(pct(0.95));
  }
  return { p5, p25, p50, p75, p95 };
}

export const ALL_ASSET_CLASSES = ASSET_CLASSES;
export function emptyWeights(): Record<AssetClass, number> {
  return Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
}
