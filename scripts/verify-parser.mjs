// Quick sanity check: run the parser over the local Fidelity CSV and print summary.
// Usage: node scripts/verify-parser.mjs <csv-path>
import { readFileSync } from "node:fs";
import Papa from "papaparse";

const file = process.argv[2] ?? "Portfolio_Positions_Apr-25-2026.csv";
const text = readFileSync(file, "utf8");

// --- inline copies of classify() and parseFidelityCsv() for standalone run ---
const CASH_SYMBOLS = new Set(["FCASH","SPAXX","FDRXX","FLGXX","CORE","FZFXX","FMPXX"]);
const GOLD_SYMBOLS = new Set(["IAU","GLD","SGOL","GLDM","BAR"]);
const INTL_DEV_SYMBOLS = new Set(["VEA","EFA","IEFA","SCHF","VXUS","IXUS"]);
const INTL_EM_SYMBOLS = new Set(["VWO","IEMG","EEM","SCHE","FNDE"]);
const BOND_SYMBOLS = new Set(["BND","AGG","BIV","BSV","VCIT","VCSH","TLT","IEF","GOVT","MUB","VTEB"]);
const SHORT_BOND_SYMBOLS = new Set(["ICSH","BIL","SHV","SHY","JPST","MINT","SGOV"]);
const HY_BOND_SYMBOLS = new Set(["SPHY","HYG","JNK","USHY","SHYG"]);
const SECTOR_SYMBOLS = new Set(["XLU","XLE","XLF","XLK","XLV","XLY","XLP","XLI","XLB","XLRE","XLC","SOXX","SMH","IFRA","PAVE"]);
const US_BLEND_SYMBOLS = new Set(["IVV","VOO","SPY","VTI","ITOT","SCHB","VT","VV","VB","IJR","VTV","VUG","VIG","QQQ","DIA","MDY","IJH"]);
const INTL_BLEND_HINT = ["INTERNATIONAL","INTL ","FTSE EMR","WRLD ST","WORLD STOCK","DEVELOPED MARKETS","EMERGING","INTL GROWTH","INTL VALUE"];
const BOND_HINT = ["BOND","BD INDEX","BND MRKT","TREASURY","MUNI","MUNICIPAL","INCOME FUND"];
const US_HINT = ["S&P 500","RUSSELL","TOTAL MARKET","LARGE CAP","MID CAP","SMALL CAP","DIV APP","GROWTH ACCOUNT","VALUE ACCOUNT","VALUE ACCT","VALUE TR","VAL TR","500 INDEX"];

function classify(symbol, description) {
  const sym = (symbol ?? "").toUpperCase().replace(/\*+$/, "");
  const desc = (description ?? "").toUpperCase();
  if (!sym && !desc) return "Other";
  if (CASH_SYMBOLS.has(sym) || /MONEY MARKET|FDIC|HELD IN|CASH|FCASH|DEPOSIT SWEEP/.test(desc)) return "Cash";
  if (GOLD_SYMBOLS.has(sym) || /GOLD/.test(desc)) return "Gold";
  if (HY_BOND_SYMBOLS.has(sym) || /HIGH YIELD/.test(desc)) return "HighYieldBond";
  if (SHORT_BOND_SYMBOLS.has(sym) || /ULTRA SHORT|SHORT-?TERM BOND|SHORT TERM BOND|CONSRV INCOME/.test(desc)) return "ShortBond";
  if (BOND_SYMBOLS.has(sym) || BOND_HINT.some(h => desc.includes(h))) return "Bond";
  if (INTL_EM_SYMBOLS.has(sym) || /EMERGING|EMR MKT|EMR MARKETS/.test(desc)) return "IntlEmerging";
  if (INTL_DEV_SYMBOLS.has(sym) || /DEVELOPED MARKETS|EAFE/.test(desc)) return "IntlDeveloped";
  if (INTL_BLEND_HINT.some(h => desc.includes(h))) return /EMR|EMERGING/.test(desc) ? "IntlEmerging" : "IntlDeveloped";
  if (SECTOR_SYMBOLS.has(sym) || /SECTOR SPDR|SEMICDTR|SEMICONDUCTOR|INFRASTRUC|UTILITIES|FINANCIAL/.test(desc)) return "Sector";
  if (US_BLEND_SYMBOLS.has(sym) || US_HINT.some(h => desc.includes(h))) return "USStock";
  if (sym && /^[A-Z]{1,5}$/.test(sym)) return "USStock";
  return "Other";
}

function parseMoney(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t || t === "--" || t === "n/a") return null;
  const neg = /^-/.test(t) || /^\(.*\)$/.test(t);
  const cleaned = t.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? (neg ? -n : n) : null;
}

const lines = text.split(/\r?\n/);
let cutoff = lines.length;
for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "") { cutoff = i; break; }
const dataText = lines.slice(0, cutoff).join("\n");
const parsed = Papa.parse(dataText, { header: true, skipEmptyLines: true });

const holdings = [];
for (const row of parsed.data) {
  const accountNumber = (row["Account Number"] ?? "").trim();
  if (!accountNumber && !(row["Account Name"] ?? "").trim()) continue;
  const symbol = (row["Symbol"] ?? "").trim() || null;
  const desc = (row["Description"] ?? "").trim();
  const cv = parseMoney(row["Current Value"]) ?? 0;
  if (cv === 0 && !desc) continue;
  holdings.push({
    account: row["Account Name"], symbol, desc, value: cv, klass: classify(symbol, desc),
  });
}

function classifyAccount(name) {
  const n = (name ?? "").toUpperCase();
  if (!n) return "Unknown";
  if (/HSA|HEALTH SAVINGS/.test(n)) return "HSA";
  if (/401\s*\(?K\)?|401K|403\s*\(?B\)?|403B|TRADITIONAL\s+IRA|ROLLOVER\s+IRA|SEP[\s-]?IRA|SIMPLE\s+IRA|PROFIT\s+SHARING/.test(n)) return "TaxDeferred";
  if (/ROTH/.test(n)) return "TaxFree";
  if (/BROKERAGE|INDIVIDUAL|JOINT|TRUST|CHECKING|FIDELITY GO|YOUTH|UTMA|UGMA|529|LONG[\s-]?TERM|SHORT[\s-]?TERM|BONDS\s+INVESTMENTS/.test(n)) return "Taxable";
  return "Taxable";
}

for (const h of holdings) h.taxStatus = classifyAccount(h.account);

const total = holdings.reduce((s, h) => s + h.value, 0);
const byClass = {};
for (const h of holdings) byClass[h.klass] = (byClass[h.klass] ?? 0) + h.value;
const byAccount = {};
for (const h of holdings) byAccount[h.account] = (byAccount[h.account] ?? 0) + h.value;
const byTax = {};
for (const h of holdings) byTax[h.taxStatus] = (byTax[h.taxStatus] ?? 0) + h.value;

const fmt = (n) => "$" + Math.round(n).toLocaleString();
console.log(`\n${holdings.length} positions, total ${fmt(total)}\n`);
console.log("--- by asset class ---");
for (const [k, v] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${fmt(v).padStart(14)}  ${(v / total * 100).toFixed(1).padStart(5)}%`);
}
console.log("\n--- by account ---");
for (const [k, v] of Object.entries(byAccount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(40)} ${fmt(v).padStart(14)}  ${(v / total * 100).toFixed(1).padStart(5)}%`);
}
console.log("\n--- by tax status ---");
for (const [k, v] of Object.entries(byTax).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${fmt(v).padStart(14)}  ${(v / total * 100).toFixed(1).padStart(5)}%`);
}
console.log("\n--- per-holding classification ---");
for (const h of holdings.sort((a, b) => b.value - a.value)) {
  console.log(`  [${h.klass.padEnd(14)}] ${(h.symbol ?? "—").padEnd(11)} ${fmt(h.value).padStart(13)}  ${h.desc.slice(0, 50)}`);
}
