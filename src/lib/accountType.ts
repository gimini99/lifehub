import type { TaxStatus } from "../types";

/**
 * Heuristic mapping from a Fidelity account name to its tax status.
 * Conservative — anything we can't pin defaults to "Taxable" (the most common case).
 */
export function classifyAccount(accountName: string): TaxStatus {
  const n = (accountName ?? "").toUpperCase();
  if (!n) return "Unknown";

  // HSA: pre-tax in, tax-free for medical out → effectively tax-free for that purpose.
  if (/HSA|HEALTH SAVINGS/.test(n)) return "HSA";

  // Tax-deferred: 401(k), 403(b), traditional IRA.
  if (/401\s*\(?K\)?|401K|403\s*\(?B\)?|403B|TRADITIONAL\s+IRA|ROLLOVER\s+IRA|SEP[\s-]?IRA|SIMPLE\s+IRA|PROFIT\s+SHARING/.test(n)) {
    return "TaxDeferred";
  }

  // Tax-free: Roth IRA / Roth 401k.
  if (/ROTH/.test(n)) return "TaxFree";

  // Taxable brokerage / individual / joint / trust / checking / youth UTMA.
  if (/BROKERAGE|INDIVIDUAL|JOINT|TRUST|CHECKING|FIDELITY GO|YOUTH|UTMA|UGMA|529|LONG[\s-]?TERM|SHORT[\s-]?TERM|BONDS\s+INVESTMENTS/.test(n)) {
    return "Taxable";
  }

  return "Taxable";
}

const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  Taxable: "Taxable",
  TaxDeferred: "Tax-Deferred",
  TaxFree: "Tax-Free",
  HSA: "HSA",
  Unknown: "Unknown",
};
export function taxStatusLabel(t: TaxStatus): string { return TAX_STATUS_LABELS[t]; }

export const TAX_STATUS_COLORS: Record<TaxStatus, string> = {
  Taxable: "#fb7185",      // pink — taxes hit on withdrawal/divs/gains
  TaxDeferred: "#facc15",  // yellow — taxed on the way out
  TaxFree: "#34d399",      // green — already taxed (Roth) or untaxed (HSA medical)
  HSA: "#22d3ee",          // cyan
  Unknown: "#94a3b8",
};
