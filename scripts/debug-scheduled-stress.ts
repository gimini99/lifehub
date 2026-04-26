// Confirm that scheduling a stress event inside the horizon actually drags down survivability.

import { runMonteCarlo } from "../src/lib/monteCarlo";
import { SCENARIOS } from "../src/lib/stress";
import type { SimInputs, AssetClass } from "../src/types";
import { ASSET_CLASSES } from "../src/types";

const w = (partial: Partial<Record<AssetClass, number>>): Record<AssetClass, number> => {
  const out = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
  for (const [k, v] of Object.entries(partial) as [AssetClass, number][]) out[k] = v;
  const total = Object.values(out).reduce((s, x) => s + x, 0);
  if (total > 0) for (const k of ASSET_CLASSES) out[k] = out[k] / total;
  return out;
};

const weights = w({ USStock: 0.50, IntlDeveloped: 0.10, Bond: 0.30, ShortBond: 0.10 });

const base: Omit<SimInputs, "scheduledStress"> = {
  startingBalance: 1_000_000,
  weights,
  annualWithdrawal: 55_000,
  inflation: 0.025,
  horizonYears: 30,
  paths: 4000,
  withdrawalStrategy: { kind: "fixedReal" },
  // override: also try with $50k/yr fixed-real spending so survivability has teeth
  simulationModel: "gbm",
  retirementTaxRate: 0,
  incomeStreams: [],
  cashFlows: [],
  spendingPhases: undefined,
};

const gfc = SCENARIOS.find((s) => s.name.includes("2008"))!;
const stagflation = SCENARIOS.find((s) => s.name.includes("Stagflation"))!;
const aiBoom = SCENARIOS.find((s) => s.name.includes("AI Boom"))!;

console.log("Baseline (no scheduled stress):");
const baseline = runMonteCarlo(base);
console.log(`  success: ${(baseline.successProbability * 100).toFixed(1)}%   median ending: $${(baseline.medianEnding / 1e6).toFixed(2)}M\n`);

console.log("Scheduled 2008 GFC at year 3:");
const withGfcY3 = runMonteCarlo({ ...base, scheduledStress: [{ id: "1", scenarioName: gfc.name, year: 3, shock: gfc.shock }] });
console.log(`  success: ${(withGfcY3.successProbability * 100).toFixed(1)}%   median ending: $${(withGfcY3.medianEnding / 1e6).toFixed(2)}M`);
console.log(`  Δ success vs baseline: ${((withGfcY3.successProbability - baseline.successProbability) * 100).toFixed(1)}pp\n`);

console.log("Scheduled 2008 GFC at year 25 (late):");
const withGfcY25 = runMonteCarlo({ ...base, scheduledStress: [{ id: "1", scenarioName: gfc.name, year: 25, shock: gfc.shock }] });
console.log(`  success: ${(withGfcY25.successProbability * 100).toFixed(1)}%   median ending: $${(withGfcY25.medianEnding / 1e6).toFixed(2)}M`);
console.log(`  Δ success vs baseline: ${((withGfcY25.successProbability - baseline.successProbability) * 100).toFixed(1)}pp\n`);

console.log("Scheduled stagflation at year 5:");
const withStag = runMonteCarlo({ ...base, scheduledStress: [{ id: "1", scenarioName: stagflation.name, year: 5, shock: stagflation.shock }] });
console.log(`  success: ${(withStag.successProbability * 100).toFixed(1)}%   median ending: $${(withStag.medianEnding / 1e6).toFixed(2)}M`);
console.log(`  Δ success vs baseline: ${((withStag.successProbability - baseline.successProbability) * 100).toFixed(1)}pp\n`);

console.log("Scheduled AI Boom at year 2 (positive shock):");
const withAi = runMonteCarlo({ ...base, scheduledStress: [{ id: "1", scenarioName: aiBoom.name, year: 2, shock: aiBoom.shock }] });
console.log(`  success: ${(withAi.successProbability * 100).toFixed(1)}%   median ending: $${(withAi.medianEnding / 1e6).toFixed(2)}M`);
console.log(`  Δ success vs baseline: ${((withAi.successProbability - baseline.successProbability) * 100).toFixed(1)}pp\n`);

console.log("Stacked: GFC at year 3 + Stagflation at year 8:");
const withStack = runMonteCarlo({
  ...base,
  scheduledStress: [
    { id: "1", scenarioName: gfc.name, year: 3, shock: gfc.shock },
    { id: "2", scenarioName: stagflation.name, year: 8, shock: stagflation.shock },
  ],
});
console.log(`  success: ${(withStack.successProbability * 100).toFixed(1)}%   median ending: $${(withStack.medianEnding / 1e6).toFixed(2)}M`);
console.log(`  Δ success vs baseline: ${((withStack.successProbability - baseline.successProbability) * 100).toFixed(1)}pp`);
