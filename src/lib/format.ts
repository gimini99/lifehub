export function fmtUSD(n: number, opts: { compact?: boolean } = {}): string {
  if (!isFinite(n)) return "—";
  if (opts.compact && Math.abs(n) >= 10_000) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function fmtPct(n: number, digits = 1): string {
  if (!isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  USStock: "US Stocks",
  IntlDeveloped: "Intl Developed",
  IntlEmerging: "Intl Emerging",
  Bond: "Bonds",
  ShortBond: "Short-Term Bonds",
  HighYieldBond: "High-Yield Bonds",
  Cash: "Cash",
  Gold: "Gold",
  Sector: "Sector / Thematic",
  Other: "Other",
};
export function classLabel(c: string): string {
  return ASSET_CLASS_LABELS[c] ?? c;
}

export const CLASS_COLORS: Record<string, string> = {
  USStock: "#22d3ee",
  IntlDeveloped: "#60a5fa",
  IntlEmerging: "#a78bfa",
  Bond: "#34d399",
  ShortBond: "#10b981",
  HighYieldBond: "#facc15",
  Cash: "#94a3b8",
  Gold: "#fbbf24",
  Sector: "#fb7185",
  Other: "#cbd5e1",
};
