import Papa from "papaparse";
import type { Holding, Allocation, AssetClass, TaxStatus } from "../types";
import { classify } from "./classify";
import { classifyAccount } from "./accountType";

const ASSET_CLASSES: AssetClass[] = [
  "USStock", "IntlDeveloped", "IntlEmerging",
  "Bond", "ShortBond", "HighYieldBond",
  "Cash", "Gold", "Sector", "Other",
];

const TAX_STATUSES: TaxStatus[] = ["Taxable", "TaxDeferred", "TaxFree", "HSA", "Unknown"];

function parseMoney(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t || t === "--" || t === "n/a") return null;
  const neg = /^-/.test(t) || /^\(.*\)$/.test(t);
  const cleaned = t.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}

function parseQty(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  const n = parseFloat(t.replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

/**
 * Parses Fidelity's "Portfolio_Positions_*.csv" export.
 * Skips the disclaimer block Fidelity appends after the data rows.
 */
export function parseFidelityCsv(text: string): Holding[] {
  // Trim Fidelity's disclaimer footer: everything from the first blank line onward.
  const lines = text.split(/\r?\n/);
  let cutoff = lines.length;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") { cutoff = i; break; }
  }
  const dataText = lines.slice(0, cutoff).join("\n");

  const parsed = Papa.parse<Record<string, string>>(dataText, {
    header: true,
    skipEmptyLines: true,
  });

  const holdings: Holding[] = [];
  for (const row of parsed.data) {
    if (!row || typeof row !== "object") continue;
    const accountNumber = (row["Account Number"] ?? "").trim();
    const accountName = (row["Account Name"] ?? "").trim();
    if (!accountNumber && !accountName) continue;

    const symbolRaw = (row["Symbol"] ?? "").trim();
    const description = (row["Description"] ?? "").trim();
    const currentValue = parseMoney(row["Current Value"]) ?? 0;
    if (currentValue === 0 && !description) continue;

    const symbol = symbolRaw || null;
    holdings.push({
      accountNumber,
      accountName,
      symbol,
      description,
      quantity: parseQty(row["Quantity"]),
      lastPrice: parseMoney(row["Last Price"]),
      currentValue,
      costBasis: parseMoney(row["Cost Basis Total"]),
      totalGainLoss: parseMoney(row["Total Gain/Loss Dollar"]),
      assetClass: classify(symbol, description),
      taxStatus: classifyAccount(accountName),
    });
  }
  return holdings;
}

export function computeAllocation(holdings: Holding[]): Allocation {
  const byClass = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
  const byTaxStatus = Object.fromEntries(TAX_STATUSES.map((t) => [t, 0])) as Record<TaxStatus, number>;
  const byAccount: Record<string, number> = {};
  let total = 0;
  for (const h of holdings) {
    byClass[h.assetClass] += h.currentValue;
    byTaxStatus[h.taxStatus] += h.currentValue;
    byAccount[h.accountName] = (byAccount[h.accountName] ?? 0) + h.currentValue;
    total += h.currentValue;
  }
  return { byClass, byAccount, byTaxStatus, total };
}

export function classWeights(allocation: Allocation): Record<AssetClass, number> {
  const w = Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as Record<AssetClass, number>;
  if (allocation.total <= 0) return w;
  for (const c of ASSET_CLASSES) {
    w[c] = allocation.byClass[c] / allocation.total;
  }
  return w;
}
