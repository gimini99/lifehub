import type { AssetClass } from "../types";

/**
 * Long-run capital market assumptions (real expected return, volatility) per asset class.
 * Numbers are illustrative annual figures based on long-horizon historical/forward-looking ranges.
 * Editable in one place — keep them conservative.
 */
export const CMA: Record<AssetClass, { mu: number; sigma: number }> = {
  USStock:        { mu: 0.065, sigma: 0.165 },
  IntlDeveloped:  { mu: 0.060, sigma: 0.180 },
  IntlEmerging:   { mu: 0.070, sigma: 0.230 },
  Bond:           { mu: 0.020, sigma: 0.060 },
  ShortBond:      { mu: 0.010, sigma: 0.020 },
  HighYieldBond:  { mu: 0.040, sigma: 0.100 },
  Cash:           { mu: 0.005, sigma: 0.005 },
  Gold:           { mu: 0.020, sigma: 0.160 },
  Sector:         { mu: 0.060, sigma: 0.220 },
  Other:          { mu: 0.040, sigma: 0.150 },
};

export const ASSET_CLASSES: AssetClass[] = [
  "USStock", "IntlDeveloped", "IntlEmerging",
  "Bond", "ShortBond", "HighYieldBond",
  "Cash", "Gold", "Sector", "Other",
];

/**
 * Correlation matrix in the order of ASSET_CLASSES above.
 * Symmetric, 1.0 on diagonal. Approximate long-run correlations.
 */
export const CORR: number[][] = (() => {
  const idx = Object.fromEntries(ASSET_CLASSES.map((c, i) => [c, i])) as Record<AssetClass, number>;
  const n = ASSET_CLASSES.length;
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = 1;

  const set = (a: AssetClass, b: AssetClass, v: number) => {
    m[idx[a]][idx[b]] = v;
    m[idx[b]][idx[a]] = v;
  };

  set("USStock", "IntlDeveloped", 0.85);
  set("USStock", "IntlEmerging", 0.75);
  set("USStock", "Sector", 0.85);
  set("USStock", "Bond", 0.10);
  set("USStock", "ShortBond", 0.00);
  set("USStock", "HighYieldBond", 0.65);
  set("USStock", "Cash", 0.00);
  set("USStock", "Gold", 0.05);
  set("USStock", "Other", 0.50);

  set("IntlDeveloped", "IntlEmerging", 0.80);
  set("IntlDeveloped", "Sector", 0.75);
  set("IntlDeveloped", "Bond", 0.15);
  set("IntlDeveloped", "ShortBond", 0.00);
  set("IntlDeveloped", "HighYieldBond", 0.60);
  set("IntlDeveloped", "Gold", 0.10);
  set("IntlDeveloped", "Other", 0.45);

  set("IntlEmerging", "Sector", 0.65);
  set("IntlEmerging", "Bond", 0.10);
  set("IntlEmerging", "HighYieldBond", 0.65);
  set("IntlEmerging", "Gold", 0.20);
  set("IntlEmerging", "Other", 0.45);

  set("Bond", "ShortBond", 0.50);
  set("Bond", "HighYieldBond", 0.40);
  set("Bond", "Cash", 0.10);
  set("Bond", "Gold", 0.10);
  set("Bond", "Other", 0.20);

  set("ShortBond", "HighYieldBond", 0.10);
  set("ShortBond", "Cash", 0.30);
  set("ShortBond", "Other", 0.05);

  set("HighYieldBond", "Sector", 0.55);
  set("HighYieldBond", "Gold", 0.05);
  set("HighYieldBond", "Other", 0.40);

  set("Sector", "Other", 0.55);
  set("Sector", "Gold", 0.10);

  set("Gold", "Cash", 0.00);
  set("Gold", "Other", 0.10);

  return m;
})();
