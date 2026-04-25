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
}

export interface Allocation {
  byClass: Record<AssetClass, number>;
  byAccount: Record<string, number>;
  total: number;
}

export interface SimInputs {
  startingBalance: number;
  weights: Record<AssetClass, number>;
  annualWithdrawal: number;
  inflation: number;
  horizonYears: number;
  paths: number;
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
}

export interface StressResult {
  name: string;
  description: string;
  drawdownPct: number;
  endingBalance: number;
  recoveryYearsEstimate: number;
}
