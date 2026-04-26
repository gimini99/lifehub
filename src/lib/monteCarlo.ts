import type { AssetClass, CashFlow, IncomeStream, PathYear, ScheduledStress, SimInputs, SimResult, SpendingPhases, WithdrawalStrategy } from "../types";
import { CMA, CORR, ASSET_CLASSES } from "./cma";
import { sampleBootstrapYear } from "./historicalReturns";

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

function gbmYearReturn(): number[] {
  const n = ASSET_CLASSES.length;
  const z: number[] = new Array(n);
  for (let i = 0; i < n; i++) z[i] = gaussian();
  const corr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k <= i; k++) corr[i] += L_CHOL[i][k] * z[k];
  }
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const c = ASSET_CLASSES[i];
    const mu = CMA[c].mu;
    const sigma = CMA[c].sigma;
    out[i] = Math.exp(mu - 0.5 * sigma * sigma + sigma * corr[i]) - 1;
  }
  return out;
}

/**
 * Annual-step simulation. Per path:
 *   1. Generate per-asset-class returns (GBM or historical bootstrap).
 *   2. Portfolio return = sum(weight_i * r_i)  (rebalanced annually)
 *   3. Compute net spending under the chosen withdrawal strategy.
 *   4. Gross-up by retirementTaxRate, subtract from balance.
 *   5. Track real spending (year-0 dollars) for variable-spending stats.
 */
export function runMonteCarlo(input: SimInputs): SimResult {
  const {
    startingBalance, weights, annualWithdrawal, inflation, horizonYears,
    paths, withdrawalStrategy, simulationModel, retirementTaxRate,
    incomeStreams, cashFlows, spendingPhases, scheduledStress,
  } = input;
  const n = ASSET_CLASSES.length;
  const streams = incomeStreams ?? [];
  const flows = cashFlows ?? [];
  const stressEvents = scheduledStress ?? [];

  // Pre-bucket stress events by year for O(1) lookup inside the inner loop.
  const stressByYear = new Map<number, ScheduledStress[]>();
  for (const ev of stressEvents) {
    if (!stressByYear.has(ev.year)) stressByYear.set(ev.year, []);
    stressByYear.get(ev.year)!.push(ev);
  }

  const wArr = ASSET_CLASSES.map((c) => weights[c] ?? 0);
  const taxGrossUp = retirementTaxRate > 0 ? 1 / (1 - Math.min(retirementTaxRate, 0.95)) : 1;

  const balances: number[][] = Array.from({ length: paths }, () => new Array(horizonYears + 1));
  // Per-path per-year detail kept so we can pull a representative path's columns post-hoc.
  const detailPortRet: number[][] = Array.from({ length: paths }, () => new Array(horizonYears).fill(0));
  const detailNetTarget: number[][] = Array.from({ length: paths }, () => new Array(horizonYears).fill(0));
  const detailIncome: number[][] = Array.from({ length: paths }, () => new Array(horizonYears).fill(0));
  const detailGross: number[][] = Array.from({ length: paths }, () => new Array(horizonYears).fill(0));
  const detailFlow: number[][] = Array.from({ length: paths }, () => new Array(horizonYears).fill(0));

  let successes = 0;
  let totalDepletionYears = 0;
  let depletionCount = 0;

  const realSpendSums: number[] = new Array(paths).fill(0);
  const realSpendCounts: number[] = new Array(paths).fill(0);

  for (let p = 0; p < paths; p++) {
    let bal = startingBalance;
    balances[p][0] = bal;
    let depletedAt: number | null = null;
    const initialWR = startingBalance > 0 ? annualWithdrawal / startingBalance : 0;
    // prevNominalNet tracks the most recent year's nominal NET spending. Initialize so year 1 lands on annualWithdrawal.
    let prevNominalNet = annualWithdrawal;
    let lastReturn = 0;

    // Bootstrap: pick a random starting year-index per path so consecutive years stay correlated.
    const bootstrapStart = simulationModel === "bootstrap" ? Math.floor(Math.random() * 1_000_000) : 0;

    for (let t = 1; t <= horizonYears; t++) {
      const yearReturns =
        simulationModel === "bootstrap"
          ? sampleBootstrapYear(bootstrapStart + t - 1, () => gbmYearReturn())
          : gbmYearReturn();

      // Compound any scheduled stress shocks into this year's per-class returns.
      const eventsThisYear = stressByYear.get(t);
      if (eventsThisYear && eventsThisYear.length > 0) {
        for (let i = 0; i < n; i++) {
          let r = yearReturns[i];
          for (const ev of eventsThisYear) {
            const s = ev.shock[ASSET_CLASSES[i]];
            if (s != null) r = (1 + r) * (1 + s) - 1;
          }
          yearReturns[i] = r;
        }
      }

      let portRet = 0;
      for (let i = 0; i < n; i++) {
        if (wArr[i] === 0) continue;
        portRet += wArr[i] * yearReturns[i];
      }
      bal = bal * (1 + portRet);

      const cpi = Math.pow(1 + inflation, t - 1);

      // Apply lump-sum cash flows after returns, before withdrawal.
      const flowNominal = cashFlowForYear(flows, t, inflation);
      bal += flowNominal;

      const phaseMult = phaseMultiplier(spendingPhases, t);
      const { netNominal: rawNetNominal, newPrev } = nextWithdrawal(
        withdrawalStrategy,
        prevNominalNet,
        bal,
        inflation,
        initialWR,
        lastReturn,
        cpi,
        annualWithdrawal,
        t,
      );
      const netNominal = rawNetNominal * phaseMult;
      // newPrev tracks the strategy's pre-phase-multiplier baseline so phase changes don't
      // interact with Guyton-Klinger guardrail state.
      prevNominalNet = newPrev;

      const incomeNominal = incomeForYear(streams, t, inflation);
      // Income covers part of net spending need; only the residual gets pulled (and grossed up) from the portfolio.
      const portfolioNetNeeded = Math.max(0, netNominal - incomeNominal);
      const grossSpendNominal = portfolioNetNeeded * taxGrossUp;
      bal -= grossSpendNominal;

      realSpendSums[p] += netNominal / cpi;
      realSpendCounts[p] += 1;
      lastReturn = portRet;

      detailPortRet[p][t - 1] = portRet;
      detailNetTarget[p][t - 1] = netNominal;
      detailIncome[p][t - 1] = incomeNominal;
      detailGross[p][t - 1] = grossSpendNominal;
      detailFlow[p][t - 1] = flowNominal;

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
  const avgRealSpends = realSpendSums
    .map((s, i) => (realSpendCounts[i] > 0 ? s / realSpendCounts[i] : 0))
    .sort((a, b) => a - b);
  const pick = (q: number) => avgRealSpends[Math.min(avgRealSpends.length - 1, Math.floor(q * avgRealSpends.length))];

  // Pick a representative path: ending balance closest to median.
  const indexed = balances.map((row, idx) => ({ idx, end: row[horizonYears] }));
  indexed.sort((a, b) => a.end - b.end);
  const repIdx = indexed[Math.floor(indexed.length / 2)]?.idx ?? 0;
  const representativePath: PathYear[] = [];
  for (let t = 1; t <= horizonYears; t++) {
    const portRet = detailPortRet[repIdx][t - 1];
    const startBal = balances[repIdx][t - 1];
    const grossPortfolio = detailGross[repIdx][t - 1];
    const portfolioNet = taxGrossUp > 0 ? grossPortfolio / taxGrossUp : grossPortfolio;
    representativePath.push({
      year: t,
      startBal,
      returnPct: portRet,
      returnDollars: startBal * portRet,
      income: detailIncome[repIdx][t - 1],
      netSpendTarget: detailNetTarget[repIdx][t - 1],
      portfolioGross: grossPortfolio,
      taxes: grossPortfolio - portfolioNet,
      cashFlow: detailFlow[repIdx][t - 1],
      endBal: balances[repIdx][t],
    });
  }

  // Sample worst-case trajectories for sequence-of-returns viz: take the bottom ~5% by ending balance.
  const worstCount = Math.min(20, Math.max(5, Math.floor(paths * 0.05)));
  const worstPaths: number[][] = [];
  for (let i = 0; i < worstCount; i++) {
    const pIdx = indexed[i]?.idx;
    if (pIdx != null) worstPaths.push(balances[pIdx].slice());
  }

  return {
    successProbability: successes / paths,
    percentiles: pcts,
    medianEnding: pcts.p50[horizonYears],
    yearsToDepletion: depletionCount > 0 ? totalDepletionYears / depletionCount : null,
    spendStats: {
      medianAvgRealSpend: pick(0.50),
      p10AvgRealSpend: pick(0.10),
      p90AvgRealSpend: pick(0.90),
    },
    worstPaths,
    representativePath,
  };
}

/**
 * Returns the net (post-tax) nominal withdrawal for the year and the new "prev nominal"
 * baseline to use next year. State machine differs by strategy:
 *   - fixedReal: prev * (1+inflation), no guardrails.
 *   - fixedPercent: ignore prev; spend rate * current_balance. Updated prev kept in sync.
 *   - guytonKlinger: candidate = prev * (1+inflation); guardrails adjust both candidate and the
 *     persistent prev; inflation skipped after a negative portfolio year.
 */
function nextWithdrawal(
  strat: WithdrawalStrategy,
  prevNominal: number,
  currentBalance: number,
  inflation: number,
  initialWR: number,
  lastReturn: number,
  cpi: number,
  initialAnnualNet: number,
  yearIdx: number,
): { netNominal: number; newPrev: number } {
  switch (strat.kind) {
    case "fixedReal": {
      const v = initialAnnualNet * cpi;
      return { netNominal: v, newPrev: v };
    }
    case "fixedPercent": {
      const v = Math.max(currentBalance, 0) * strat.rate;
      return { netNominal: v, newPrev: v };
    }
    case "guytonKlinger": {
      // Year 1: spend the initial amount; no CPI growth, no guardrails (currentWR == initialWR by construction).
      if (yearIdx === 1) return { netNominal: initialAnnualNet, newPrev: initialAnnualNet };

      let candidate = prevNominal * (1 + inflation);
      if (strat.skipCpiAfterNegative && lastReturn < 0) {
        candidate = prevNominal; // freeze nominal — skip the CPI bump after a down year
      }
      if (currentBalance > 0 && initialWR > 0) {
        const wr = candidate / currentBalance;
        if (wr > initialWR * (1 + strat.preservationTrigger)) {
          candidate *= 1 - strat.preservationCut;
        } else if (wr < initialWR * (1 - strat.prosperityTrigger)) {
          candidate *= 1 + strat.prosperityRaise;
        }
      }
      return { netNominal: candidate, newPrev: candidate };
    }
  }
}

/** Sum of all lump-sum cash events landing in simulation year `t` (1-indexed). */
function cashFlowForYear(flows: CashFlow[], t: number, inflation: number): number {
  if (flows.length === 0) return 0;
  let total = 0;
  for (const f of flows) {
    if (f.year !== t) continue;
    total += f.inflationAdjusted ? f.amount * Math.pow(1 + inflation, t - 1) : f.amount;
  }
  return total;
}

/** Phase multiplier for year `t` (1-indexed). Returns 1.0 if phases not configured. */
function phaseMultiplier(phases: SpendingPhases | undefined, t: number): number {
  if (!phases) return 1.0;
  if (t >= phases.phase3Year) return phases.phase3Mult;
  if (t >= phases.phase2Year) return phases.phase2Mult;
  return 1.0;
}

/** Sum of all active streams' nominal payouts for simulation year `t` (1-indexed). */
function incomeForYear(streams: IncomeStream[], t: number, inflation: number): number {
  if (streams.length === 0) return 0;
  let total = 0;
  for (const s of streams) {
    if (t < s.startYear) continue;
    if (s.endYear != null && t > s.endYear) continue;
    if (s.inflationAdjusted) {
      total += s.annualAmount * Math.pow(1 + inflation, t - 1);
    } else {
      total += s.annualAmount;
    }
  }
  return total;
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

export const DEFAULT_GK: Extract<WithdrawalStrategy, { kind: "guytonKlinger" }> = {
  kind: "guytonKlinger",
  preservationCut: 0.10,
  prosperityRaise: 0.10,
  preservationTrigger: 0.20,
  prosperityTrigger: 0.20,
  skipCpiAfterNegative: true,
};

/**
 * Binary-search the largest annualWithdrawal (or fixedPercent rate) that achieves
 * `targetSuccess` survivability. Returns the dollar amount that funds year-1 spending.
 *
 * For `fixedReal` and `guytonKlinger` strategies we solve for the dollar amount.
 * For `fixedPercent` we solve for the rate and return the implied dollar amount.
 */
export function findMaxSafeWithdrawal(
  base: Omit<SimInputs, "weights" | "annualWithdrawal" | "withdrawalStrategy" | "paths"> & {
    weights: Record<AssetClass, number>;
    withdrawalStrategy: WithdrawalStrategy;
  },
  targetSuccess = 0.95,
  iterations = 12,
  paths = 2000,
): { amount: number; rate: number; success: number } {
  const balance = base.startingBalance;
  if (base.withdrawalStrategy.kind === "fixedPercent") {
    let lo = 0.005, hi = 0.15, success = 0;
    for (let i = 0; i < iterations; i++) {
      const mid = (lo + hi) / 2;
      const r = runMonteCarlo({
        ...base, paths,
        annualWithdrawal: balance * mid,
        withdrawalStrategy: { kind: "fixedPercent", rate: mid },
      });
      success = r.successProbability;
      if (success >= targetSuccess) lo = mid; else hi = mid;
    }
    return { amount: balance * lo, rate: lo, success };
  }
  let lo = 0, hi = balance * 0.15, success = 0;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const r = runMonteCarlo({
      ...base, paths,
      annualWithdrawal: mid,
    });
    success = r.successProbability;
    if (success >= targetSuccess) lo = mid; else hi = mid;
  }
  return { amount: lo, rate: balance > 0 ? lo / balance : 0, success };
}
