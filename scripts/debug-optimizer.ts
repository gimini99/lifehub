// Reproduces the optimizer worker pipeline: generateCandidates → evaluateCandidates,
// using the same inputs the user likely has (mid-sized 60/40 portfolio + SS + an extra asset).

import { generateCandidates, evaluateCandidates } from "../src/lib/optimize";
import type { SimInputs, AssetClass } from "../src/types";
import { ASSET_CLASSES } from "../src/types";

const w = (partial: Partial<Record<AssetClass, number>>): Record<AssetClass, number> => {
  const out = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
  for (const [k, v] of Object.entries(partial) as [AssetClass, number][]) out[k] = v;
  const total = Object.values(out).reduce((s, x) => s + x, 0);
  if (total > 0) for (const k of ASSET_CLASSES) out[k] = out[k] / total;
  return out;
};

const current = w({ USStock: 0.50, IntlDeveloped: 0.10, Bond: 0.30, ShortBond: 0.10 });

const base: Omit<SimInputs, "weights"> = {
  startingBalance: 1_500_000,
  annualWithdrawal: 80_000,
  inflation: 0.025,
  horizonYears: 30,
  paths: 4000,
  withdrawalStrategy: { kind: "fixedReal" },
  simulationModel: "gbm",
  retirementTaxRate: 0.20,
  incomeStreams: [
    { id: "ss", label: "Social Security", annualAmount: 42_000, startYear: 11, inflationAdjusted: true },
  ],
  cashFlows: [
    { id: "inh", label: "Inheritance", year: 8, amount: 250_000, inflationAdjusted: false },
    { id: "roof", label: "Roof", year: 4, amount: -40_000, inflationAdjusted: false },
  ],
  spendingPhases: { phase2Year: 16, phase2Mult: 0.75, phase3Year: 26, phase3Mult: 0.90 },
};

const candidates = generateCandidates(current, { randomCount: 30, perturbCount: 20, seed: 7 });
console.log(`generated ${candidates.length} candidates`);

const t0 = Date.now();
let lastReport = t0;
const results = evaluateCandidates(candidates, base, 800, (done, total) => {
  const now = Date.now();
  if (done === 1 || done === total || now - lastReport > 1000) {
    console.log(`  ${done}/${total}  (${((now - t0) / 1000).toFixed(1)}s elapsed)`);
    lastReport = now;
  }
});
const t1 = Date.now();

console.log(`\nfinished in ${((t1 - t0) / 1000).toFixed(1)}s`);
console.log("\ntop 8:");
for (const r of results.slice(0, 8)) {
  const s = (r.successProbability * 100).toFixed(1) + "%";
  const m = (r.medianEnding / 1e6).toFixed(2) + "M";
  console.log(`  ${s.padStart(6)}  ${m.padStart(7)}  ${r.candidate.name}  [${r.candidate.source}]`);
}
