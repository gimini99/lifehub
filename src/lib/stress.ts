import type { AssetClass, StressResult } from "../types";

interface Scenario {
  name: string;
  description: string;
  shock: Partial<Record<AssetClass, number>>; // one-shot return per class (e.g., -0.50 = -50%)
  recoveryYearsBaseline: number;
}

const SCENARIOS: Scenario[] = [
  {
    name: "2008 Global Financial Crisis",
    description: "Equities -50%, real estate / sectors crushed, bonds rally, gold flat-to-up. Roughly Oct-2007 → Mar-2009.",
    shock: {
      USStock: -0.50, IntlDeveloped: -0.55, IntlEmerging: -0.60,
      Sector: -0.55, HighYieldBond: -0.30,
      Bond: 0.05, ShortBond: 0.02, Cash: 0.01,
      Gold: 0.10, Other: -0.30,
    },
    recoveryYearsBaseline: 4,
  },
  {
    name: "1973-74 Stagflation",
    description: "Stocks -45% nominal, bonds nearly flat in nominal terms but punished by inflation, gold +150%.",
    shock: {
      USStock: -0.45, IntlDeveloped: -0.40, IntlEmerging: -0.45,
      Sector: -0.45, HighYieldBond: -0.25,
      Bond: -0.05, ShortBond: 0.00, Cash: 0.00,
      Gold: 0.80, Other: -0.20,
    },
    recoveryYearsBaseline: 7,
  },
  {
    name: "Lost Decade (2000-2010)",
    description: "Two equity bear markets compounded; ~0% nominal stock return for the decade. Bonds and gold the relative winners.",
    shock: {
      USStock: -0.10, IntlDeveloped: -0.05, IntlEmerging: 1.00,
      Sector: -0.20, HighYieldBond: 0.60,
      Bond: 0.85, ShortBond: 0.40, Cash: 0.25,
      Gold: 2.80, Other: 0.20,
    },
    recoveryYearsBaseline: 0, // already a 10-year window
  },
  {
    name: "1987 Black Monday",
    description: "Sudden one-day -22% crash, equities -30% peak-to-trough, bonds rally modestly.",
    shock: {
      USStock: -0.30, IntlDeveloped: -0.25, IntlEmerging: -0.35,
      Sector: -0.32, HighYieldBond: -0.10,
      Bond: 0.05, ShortBond: 0.02, Cash: 0.01,
      Gold: 0.05, Other: -0.15,
    },
    recoveryYearsBaseline: 2,
  },
  {
    name: "COVID-19 Shock (Q1 2020)",
    description: "Fast -34% equity drawdown over ~5 weeks; rapid recovery. Useful for sequence-risk gut check.",
    shock: {
      USStock: -0.34, IntlDeveloped: -0.32, IntlEmerging: -0.30,
      Sector: -0.40, HighYieldBond: -0.20,
      Bond: 0.03, ShortBond: 0.00, Cash: 0.00,
      Gold: 0.05, Other: -0.20,
    },
    recoveryYearsBaseline: 1,
  },
  {
    name: "Dalio: Changing World Order / Debasement",
    description: "Cumulative ~10-yr impact of late-stage big-debt-cycle dynamics per Ray Dalio's framework: USD reserve status erodes, sustained currency debasement, real losses on bonds and cash even as nominal balances hold, US equity multiples compress. Gold and hard assets the principal hedges; emerging markets (especially the new-pole bloc) outperform on a relative basis. Recovery is a regime shift, not a bounce.",
    shock: {
      USStock: -0.25, IntlDeveloped: -0.20, IntlEmerging: 0.15,
      Sector: -0.10, HighYieldBond: -0.30,
      Bond: -0.30, ShortBond: -0.10, Cash: -0.25,
      Gold: 1.20, Other: -0.10,
    },
    recoveryYearsBaseline: 10,
  },
  {
    name: "Trump MAGA Boom",
    description: "2-4yr cumulative scenario: tariff-led reshoring, extension/expansion of tax cuts, deregulation, fiscal expansion. US equities (especially small caps and domestic-focused) surge. International developed and emerging drag from tariff retaliation. Long-duration bonds suffer from rising yields and deficit pressure; short bonds benefit from elevated rates. Gold modestly higher on inflation/fiscal-deficit worry.",
    shock: {
      USStock: 0.40, IntlDeveloped: -0.05, IntlEmerging: -0.25,
      Sector: 0.25, HighYieldBond: 0.15,
      Bond: -0.15, ShortBond: 0.05, Cash: 0.05,
      Gold: 0.20, Other: 0.20,
    },
    recoveryYearsBaseline: 0, // positive return scenario; "recovery" doesn't apply
  },
  {
    name: "Soft Landing + AI Boom",
    description: "2-3yr cumulative Goldilocks scenario: Fed tames inflation without recession, AI-driven productivity gains compress timelines and expand margins. US equities surge (semis, AI infra, software dominate); intl participates but lags. Bonds rally on rate cuts. Gold modestly higher on continued central-bank demand. The 2023-2024 actual market is a partial historical reference.",
    shock: {
      USStock: 0.50, IntlDeveloped: 0.20, IntlEmerging: 0.25,
      Sector: 0.75, HighYieldBond: 0.20,
      Bond: 0.12, ShortBond: 0.08, Cash: 0.08,
      Gold: 0.10, Other: 0.25,
    },
    recoveryYearsBaseline: 0,
  },
];

export function runStressScenarios(
  startingBalance: number,
  weights: Record<AssetClass, number>,
): StressResult[] {
  return SCENARIOS.map((s) => {
    let weightedReturn = 0;
    for (const [k, w] of Object.entries(weights) as [AssetClass, number][]) {
      const r = s.shock[k] ?? 0;
      weightedReturn += w * r;
    }
    const ending = startingBalance * (1 + weightedReturn);
    return {
      name: s.name,
      description: s.description,
      drawdownPct: weightedReturn,
      endingBalance: ending,
      recoveryYearsEstimate: s.recoveryYearsBaseline,
    };
  });
}
