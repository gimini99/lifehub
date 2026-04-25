export type AssetClass =
  | "USStock"
  | "IntlDeveloped"
  | "IntlEmerging"
  | "Bond"
  | "ShortBond"
  | "HighYieldBond"
  | "Cash"
  | "Gold"
  | "Sector"
  | "Other";

export const ASSET_CLASSES: AssetClass[] = [
  "USStock", "IntlDeveloped", "IntlEmerging",
  "Bond", "ShortBond", "HighYieldBond",
  "Cash", "Gold", "Sector", "Other",
];

export type TaxStatus = "Taxable" | "TaxDeferred" | "TaxFree" | "HSA" | "Unknown";

export interface Holding {
  accountNumber: string;
  accountName: string;
  symbol: string | null;
  description: string;
  quantity: number | null;
  lastPrice: number | null;
  currentValue: number;
  costBasis: number | null;
  totalGainLoss: number | null;
  assetClass: AssetClass;
  taxStatus: TaxStatus;
  /** True for synthetic "what-if" holdings the user added via the Extras panel. */
  isExtra?: boolean;
}

export interface ExtraAsset {
  id: string;
  assetClass: AssetClass;
  taxStatus: TaxStatus;
  amount: number;
  label?: string;
}

/**
 * A recurring after-tax income stream (Social Security, pension, rental income, etc.).
 * Income offsets the portfolio's spending need before gross-up:
 *   portfolio_draw = max(0, target_net_spend - income_for_year) * tax_grossup
 *
 * `annualAmount` is in year-1 dollars. If `inflationAdjusted` is true, the amount is
 * scaled by (1 + inflation)^(t-1) each subsequent year.
 *
 * `startYear` is 1-indexed: 1 = first year of the simulation. `endYear` is inclusive;
 * leave undefined for a lifelong stream.
 */
export interface IncomeStream {
  id: string;
  label: string;
  annualAmount: number;
  startYear: number;
  endYear?: number;
  inflationAdjusted: boolean;
}

export interface Allocation {
  byClass: Record<AssetClass, number>;
  byAccount: Record<string, number>;
  byTaxStatus: Record<TaxStatus, number>;
  total: number;
}

export type WithdrawalStrategy =
  | { kind: "fixedReal" }
  | { kind: "fixedPercent"; rate: number }    // e.g., 0.04 for 4%
  | {
      kind: "guytonKlinger";
      preservationCut: number;       // e.g., 0.10 → cut 10%
      prosperityRaise: number;       // e.g., 0.10 → raise 10%
      preservationTrigger: number;   // e.g., 0.20 → if WR > initialWR * 1.20
      prosperityTrigger: number;     // e.g., 0.20 → if WR < initialWR * 0.80
      skipCpiAfterNegative: boolean; // skip inflation increase the year after a down portfolio year
    };

export type SimulationModel = "gbm" | "bootstrap";

export interface SimInputs {
  startingBalance: number;
  weights: Record<AssetClass, number>;
  annualWithdrawal: number;     // dollar withdrawal in year 1 (year-1 real for fixedReal/GK; ignored for fixedPercent)
  inflation: number;
  horizonYears: number;
  paths: number;
  withdrawalStrategy: WithdrawalStrategy;
  simulationModel: SimulationModel;
  retirementTaxRate: number;    // 0..1 — sim grosses up withdrawal to fund net spending
  incomeStreams?: IncomeStream[];
}

export interface SimResult {
  successProbability: number;
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  medianEnding: number;
  yearsToDepletion: number | null;
  // Distribution of average annual real spending (only meaningful for fixedPercent / guytonKlinger)
  spendStats?: {
    medianAvgRealSpend: number;
    p10AvgRealSpend: number;
    p90AvgRealSpend: number;
  };
}

export interface StressResult {
  name: string;
  description: string;
  drawdownPct: number;
  endingBalance: number;
  recoveryYearsEstimate: number;
}
