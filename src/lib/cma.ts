import type { AssetClass } from "../types";
import { ASSET_CLASSES } from "../types";
import { HISTORICAL_ROWS } from "./historicalReturns";

/**
 * Capital market assumptions: mu (drift of log returns) and sigma (stdev of log returns)
 * per asset class, derived empirically from the embedded annual return history.
 *
 * Under GBM with these parameters, expected nominal annual return = exp(mu) - 1.
 * Hardcoded fallbacks are used for any asset class with too few data points.
 */

interface MuSigma { mu: number; sigma: number }

// Conservative fallbacks (used only when a class has fewer than MIN_OBS years of data
// OR for the synthetic "Other" / "Sector" buckets where history is just a proxy series).
const FALLBACK_CMA: Record<AssetClass, MuSigma> = {
  USStock:        { mu: 0.063, sigma: 0.165 },
  IntlDeveloped:  { mu: 0.058, sigma: 0.180 },
  IntlEmerging:   { mu: 0.068, sigma: 0.230 },
  Bond:           { mu: 0.020, sigma: 0.060 },
  ShortBond:      { mu: 0.010, sigma: 0.020 },
  HighYieldBond:  { mu: 0.039, sigma: 0.100 },
  Cash:           { mu: 0.005, sigma: 0.005 },
  Gold:           { mu: 0.020, sigma: 0.160 },
  Sector:         { mu: 0.058, sigma: 0.220 },
  Other:          { mu: 0.040, sigma: 0.150 },
};

const MIN_OBS = 15;

function logReturnsForClass(c: AssetClass): number[] {
  const out: number[] = [];
  for (const row of HISTORICAL_ROWS) {
    const r = row[c as keyof typeof row] as number | null;
    if (r == null) continue;
    out.push(Math.log(1 + r));
  }
  return out;
}

function meanStdev(xs: number[]): { mean: number; stdev: number } {
  const n = xs.length;
  if (n === 0) return { mean: 0, stdev: 0 };
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return { mean, stdev: 0 };
  let v = 0;
  for (const x of xs) v += (x - mean) * (x - mean);
  return { mean, stdev: Math.sqrt(v / (n - 1)) };
}

function pairCorrelation(a: AssetClass, b: AssetClass): number | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of HISTORICAL_ROWS) {
    const ra = row[a as keyof typeof row] as number | null;
    const rb = row[b as keyof typeof row] as number | null;
    if (ra == null || rb == null) continue;
    xs.push(Math.log(1 + ra));
    ys.push(Math.log(1 + rb));
  }
  if (xs.length < MIN_OBS) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let num = 0, dxs = 0, dys = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dxs += dx * dx; dys += dy * dy;
  }
  const denom = Math.sqrt(dxs * dys);
  return denom > 0 ? num / denom : null;
}

/** Per-class empirical mu/sigma. Falls back to FALLBACK_CMA when too few observations. */
function buildEmpiricalCMA(): Record<AssetClass, MuSigma & { source: "empirical" | "fallback"; obs: number }> {
  const out = {} as Record<AssetClass, MuSigma & { source: "empirical" | "fallback"; obs: number }>;
  for (const c of ASSET_CLASSES) {
    const lrs = logReturnsForClass(c);
    if (lrs.length < MIN_OBS) {
      out[c] = { ...FALLBACK_CMA[c], source: "fallback", obs: lrs.length };
      continue;
    }
    const { mean, stdev } = meanStdev(lrs);
    out[c] = { mu: mean, sigma: stdev, source: "empirical", obs: lrs.length };
  }
  return out;
}

/** Pairwise correlation matrix from overlapping years. Falls back to a sensible default
 *  when overlap is too short. Then nudged to be positive-definite via small diagonal load. */
function buildEmpiricalCorr(): number[][] {
  const n = ASSET_CLASSES.length;
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = 1;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const r = pairCorrelation(ASSET_CLASSES[i], ASSET_CLASSES[j]);
      const v = r == null ? FALLBACK_CORR[i][j] : r;
      m[i][j] = v;
      m[j][i] = v;
    }
  }

  // Tiny ridge for numerical stability before Cholesky.
  for (let i = 0; i < n; i++) m[i][i] += 1e-6;
  return m;
}

// Hand-picked fallbacks used only where pairwise data is too sparse (< MIN_OBS overlap).
const FALLBACK_CORR: number[][] = (() => {
  const idx = Object.fromEntries(ASSET_CLASSES.map((c, i) => [c, i])) as Record<AssetClass, number>;
  const n = ASSET_CLASSES.length;
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = 1;
  const set = (a: AssetClass, b: AssetClass, v: number) => { m[idx[a]][idx[b]] = v; m[idx[b]][idx[a]] = v; };
  set("USStock", "IntlDeveloped", 0.85);
  set("USStock", "IntlEmerging", 0.75);
  set("USStock", "Sector", 0.95);
  set("USStock", "HighYieldBond", 0.65);
  set("USStock", "Bond", 0.10);
  set("USStock", "Other", 0.50);
  set("IntlDeveloped", "IntlEmerging", 0.80);
  set("IntlDeveloped", "HighYieldBond", 0.60);
  set("IntlEmerging", "HighYieldBond", 0.65);
  set("Bond", "ShortBond", 0.50);
  set("Bond", "HighYieldBond", 0.40);
  set("Bond", "Cash", 0.10);
  set("ShortBond", "Cash", 0.30);
  set("Sector", "IntlDeveloped", 0.80);
  set("Sector", "HighYieldBond", 0.60);
  return m;
})();

const _empirical = buildEmpiricalCMA();
const _corr = buildEmpiricalCorr();

/** Final CMA used by the GBM engine. Read-only. */
export const CMA: Record<AssetClass, MuSigma> = Object.fromEntries(
  ASSET_CLASSES.map((c) => [c, { mu: _empirical[c].mu, sigma: _empirical[c].sigma }])
) as Record<AssetClass, MuSigma>;

/** Diagnostic info — which classes are empirical, which fell back, and how many observations. */
export const CMA_DIAGNOSTICS = _empirical;

/** Final correlation matrix in ASSET_CLASSES order. */
export const CORR = _corr;

/** Convenience: expected annual nominal return implied by the GBM parameters. */
export function expectedReturn(c: AssetClass): number { return Math.exp(CMA[c].mu) - 1; }

/** Re-export ASSET_CLASSES so existing modules keep working without changing their import path. */
export { ASSET_CLASSES };
