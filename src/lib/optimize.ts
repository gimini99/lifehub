import type { AssetClass, SimInputs, SimResult } from "../types";
import { runMonteCarlo } from "./monteCarlo";
import { ASSET_CLASSES, CMA } from "./cma";

export interface Candidate {
  name: string;
  source: "current" | "template" | "random" | "perturbation";
  weights: Record<AssetClass, number>;
}

export interface OptResult {
  candidate: Candidate;
  successProbability: number;
  medianEnding: number;
  fullSim?: SimResult; // populated only when explicitly previewed
}

function w(partial: Partial<Record<AssetClass, number>>): Record<AssetClass, number> {
  const out = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
  for (const [k, v] of Object.entries(partial) as [AssetClass, number][]) out[k] = v;
  const total = Object.values(out).reduce((s, x) => s + x, 0);
  if (total > 0) for (const k of ASSET_CLASSES) out[k] = out[k] / total;
  return out;
}

const TEMPLATES: { name: string; weights: Record<AssetClass, number> }[] = [
  { name: "60/40 Classic",            weights: w({ USStock: 0.40, IntlDeveloped: 0.15, IntlEmerging: 0.05, Bond: 0.30, ShortBond: 0.05, Cash: 0.05 }) },
  { name: "80/20 Aggressive",         weights: w({ USStock: 0.55, IntlDeveloped: 0.18, IntlEmerging: 0.07, Bond: 0.15, ShortBond: 0.03, Cash: 0.02 }) },
  { name: "30/70 Conservative",       weights: w({ USStock: 0.20, IntlDeveloped: 0.07, IntlEmerging: 0.03, Bond: 0.45, ShortBond: 0.15, Cash: 0.10 }) },
  { name: "Permanent Portfolio",      weights: w({ USStock: 0.25, Bond: 0.25, Cash: 0.25, Gold: 0.25 }) },
  { name: "All-Weather (Bridgewater-ish)", weights: w({ USStock: 0.30, IntlDeveloped: 0.10, Bond: 0.40, ShortBond: 0.05, Gold: 0.075, Sector: 0.075 }) },
  { name: "Golden Butterfly",         weights: w({ USStock: 0.20, IntlDeveloped: 0.05, Bond: 0.20, ShortBond: 0.20, Cash: 0.05, Gold: 0.20, Sector: 0.10 }) },
  { name: "Risk-Parity-ish (inverse-vol)", weights: inverseVolWeights() },
  { name: "Equity 100%",              weights: w({ USStock: 0.65, IntlDeveloped: 0.20, IntlEmerging: 0.10, Sector: 0.05 }) },
  { name: "Inflation-Hedged",         weights: w({ USStock: 0.30, IntlDeveloped: 0.10, IntlEmerging: 0.05, ShortBond: 0.20, Gold: 0.20, Sector: 0.10, HighYieldBond: 0.05 }) },
];

function inverseVolWeights(): Record<AssetClass, number> {
  const raw = Object.fromEntries(
    ASSET_CLASSES.map((c) => [c, c === "Other" ? 0 : 1 / Math.max(CMA[c].sigma, 0.01)])
  ) as Record<AssetClass, number>;
  const sum = Object.values(raw).reduce((s, x) => s + x, 0);
  return Object.fromEntries(ASSET_CLASSES.map((c) => [c, raw[c] / sum])) as Record<AssetClass, number>;
}

interface BoundsByClass { min: number; max: number; }
const DEFAULT_BOUNDS: Partial<Record<AssetClass, BoundsByClass>> = {
  USStock:        { min: 0.05, max: 0.70 },
  IntlDeveloped:  { min: 0.00, max: 0.35 },
  IntlEmerging:   { min: 0.00, max: 0.20 },
  Bond:           { min: 0.00, max: 0.50 },
  ShortBond:      { min: 0.00, max: 0.40 },
  HighYieldBond:  { min: 0.00, max: 0.15 },
  Cash:           { min: 0.00, max: 0.30 },
  Gold:           { min: 0.00, max: 0.25 },
  Sector:         { min: 0.00, max: 0.15 },
  Other:          { min: 0.00, max: 0.05 },
};

function randomCandidate(rng: () => number): Record<AssetClass, number> {
  // Sample from Dirichlet-like distribution then clip to bounds and renormalize.
  const raw: Record<AssetClass, number> = Object.fromEntries(
    ASSET_CLASSES.map((c) => {
      const u = rng();
      // exponential transform → simplex sample
      const e = -Math.log(Math.max(u, 1e-9));
      return [c, e];
    })
  ) as Record<AssetClass, number>;
  const sum = Object.values(raw).reduce((s, x) => s + x, 0);
  for (const c of ASSET_CLASSES) raw[c] = raw[c] / sum;

  // Clip to bounds, then renormalize across classes that aren't pinned.
  const b = DEFAULT_BOUNDS;
  for (const c of ASSET_CLASSES) {
    const bnd = b[c];
    if (!bnd) continue;
    if (raw[c] < bnd.min) raw[c] = bnd.min;
    if (raw[c] > bnd.max) raw[c] = bnd.max;
  }
  const s2 = Object.values(raw).reduce((s, x) => s + x, 0);
  for (const c of ASSET_CLASSES) raw[c] = raw[c] / s2;
  return raw;
}

function perturb(base: Record<AssetClass, number>, rng: () => number, magnitude = 0.10): Record<AssetClass, number> {
  // Move random mass between two classes.
  const out = { ...base };
  const nonzero = ASSET_CLASSES.filter((c) => out[c] > 0.005);
  const all = ASSET_CLASSES.filter((c) => (DEFAULT_BOUNDS[c]?.max ?? 0) > 0);
  if (nonzero.length === 0 || all.length < 2) return out;
  const from = nonzero[Math.floor(rng() * nonzero.length)];
  const to = all[Math.floor(rng() * all.length)];
  if (from === to) return out;
  const move = Math.min(out[from], magnitude * rng());
  out[from] -= move;
  out[to] += move;
  // clip to upper bound
  const maxTo = DEFAULT_BOUNDS[to]?.max ?? 1;
  if (out[to] > maxTo) {
    const overflow = out[to] - maxTo;
    out[to] = maxTo;
    out[from] += overflow;
  }
  return out;
}

export function generateCandidates(
  current: Record<AssetClass, number>,
  opts: { randomCount?: number; perturbCount?: number; seed?: number } = {},
): Candidate[] {
  const randomCount = opts.randomCount ?? 30;
  const perturbCount = opts.perturbCount ?? 20;
  const rng = seededRng(opts.seed ?? 1);

  const list: Candidate[] = [];
  list.push({ name: "Current", source: "current", weights: { ...current } });
  for (const t of TEMPLATES) list.push({ name: t.name, source: "template", weights: t.weights });
  for (let i = 0; i < perturbCount; i++) {
    list.push({ name: `Perturbation #${i + 1}`, source: "perturbation", weights: perturb(current, rng) });
  }
  for (let i = 0; i < randomCount; i++) {
    list.push({ name: `Random #${i + 1}`, source: "random", weights: randomCandidate(rng) });
  }
  return list;
}

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function evaluateCandidates(
  candidates: Candidate[],
  base: Omit<SimInputs, "weights">,
  paths = 800,
  onProgress?: (done: number, total: number) => void,
): OptResult[] {
  const results: OptResult[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const sim = runMonteCarlo({ ...base, weights: c.weights, paths });
    results.push({ candidate: c, successProbability: sim.successProbability, medianEnding: sim.medianEnding });
    onProgress?.(i + 1, candidates.length);
  }
  results.sort((a, b) =>
    b.successProbability - a.successProbability ||
    b.medianEnding - a.medianEnding
  );
  return results;
}

/**
 * L1 distance between two weight vectors — useful for "how different is this from current?".
 * Returns a value in [0, 2]; divide by 2 for a 0..1 "turnover" metric.
 */
export function weightDistance(a: Record<AssetClass, number>, b: Record<AssetClass, number>): number {
  let d = 0;
  for (const c of ASSET_CLASSES) d += Math.abs((a[c] ?? 0) - (b[c] ?? 0));
  return d;
}
