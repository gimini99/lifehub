import type { AssetClass } from "../types";

const CASH_SYMBOLS = new Set([
  "FCASH", "SPAXX", "FDRXX", "FLGXX", "CORE", "FZFXX", "FMPXX",
]);

const GOLD_SYMBOLS = new Set(["IAU", "GLD", "SGOL", "GLDM", "BAR"]);

const INTL_DEV_SYMBOLS = new Set(["VEA", "EFA", "IEFA", "SCHF", "VXUS", "IXUS"]);
const INTL_EM_SYMBOLS = new Set(["VWO", "IEMG", "EEM", "SCHE", "FNDE"]);
const INTL_BLEND_HINT = ["INTERNATIONAL", "INTL ", "FTSE EMR", "WRLD ST", "WORLD STOCK", "DEVELOPED MARKETS", "EMERGING", "INTL GROWTH", "INTL VALUE"];

const BOND_SYMBOLS = new Set(["BND", "AGG", "BIV", "BSV", "VCIT", "VCSH", "TLT", "IEF", "GOVT", "MUB", "VTEB"]);
const SHORT_BOND_SYMBOLS = new Set(["ICSH", "BIL", "SHV", "SHY", "JPST", "MINT", "SGOV"]);
const HY_BOND_SYMBOLS = new Set(["SPHY", "HYG", "JNK", "USHY", "SHYG"]);
const BOND_HINT = ["BOND", "BD INDEX", "BND MRKT", "TREASURY", "MUNI", "MUNICIPAL", "INCOME FUND"];

const SECTOR_SYMBOLS = new Set([
  "XLU", "XLE", "XLF", "XLK", "XLV", "XLY", "XLP", "XLI", "XLB", "XLRE", "XLC",
  "SOXX", "SMH", "IFRA", "PAVE",
]);

const US_BLEND_SYMBOLS = new Set([
  "IVV", "VOO", "SPY", "VTI", "ITOT", "SCHB", "VT", "VV",
  "VB", "IJR", "VTV", "VUG", "VIG", "QQQ", "DIA", "MDY", "IJH",
]);

const US_HINT = ["S&P 500", "RUSSELL", "TOTAL MARKET", "LARGE CAP", "MID CAP", "SMALL CAP", "DIV APP", "GROWTH ACCOUNT", "VALUE ACCOUNT", "VALUE ACCT", "VALUE TR", "VAL TR", "500 INDEX"];

export function classify(symbol: string | null, description: string): AssetClass {
  const sym = (symbol ?? "").toUpperCase().replace(/\*+$/, "");
  const desc = (description ?? "").toUpperCase();

  if (!sym && !desc) return "Other";

  if (CASH_SYMBOLS.has(sym) || /MONEY MARKET|FDIC|HELD IN|CASH|FCASH|DEPOSIT SWEEP/.test(desc)) {
    return "Cash";
  }

  if (GOLD_SYMBOLS.has(sym) || /GOLD/.test(desc)) return "Gold";

  if (HY_BOND_SYMBOLS.has(sym) || /HIGH YIELD/.test(desc)) return "HighYieldBond";
  if (SHORT_BOND_SYMBOLS.has(sym) || /ULTRA SHORT|SHORT-?TERM BOND|SHORT TERM BOND|CONSRV INCOME/.test(desc)) return "ShortBond";
  if (BOND_SYMBOLS.has(sym) || BOND_HINT.some((h) => desc.includes(h))) return "Bond";

  if (INTL_EM_SYMBOLS.has(sym) || /EMERGING|EMR MKT|EMR MARKETS/.test(desc)) return "IntlEmerging";
  if (INTL_DEV_SYMBOLS.has(sym) || /DEVELOPED MARKETS|EAFE/.test(desc)) return "IntlDeveloped";
  if (INTL_BLEND_HINT.some((h) => desc.includes(h))) {
    return /EMR|EMERGING/.test(desc) ? "IntlEmerging" : "IntlDeveloped";
  }

  if (SECTOR_SYMBOLS.has(sym) || /SECTOR SPDR|SEMICDTR|SEMICONDUCTOR|INFRASTRUC|UTILITIES|FINANCIAL/.test(desc)) {
    return "Sector";
  }

  if (US_BLEND_SYMBOLS.has(sym) || US_HINT.some((h) => desc.includes(h))) return "USStock";

  if (sym && /^[A-Z]{1,5}$/.test(sym)) return "USStock"; // bare ticker fallback (individual stocks like GOOG, COST)

  return "Other";
}
