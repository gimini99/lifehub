import { useState } from "react";
import type { CashFlow } from "../types";
import { fmtUSD } from "../lib/format";

interface Props {
  flows: CashFlow[];
  setFlows: (f: CashFlow[]) => void;
  horizonYears: number;
}

export function LumpSumsPanel({ flows, setFlows, horizonYears }: Props) {
  const [label, setLabel] = useState("Inheritance");
  const [amount, setAmount] = useState("");
  const [year, setYear] = useState("8");
  const [inflationAdjusted, setInflationAdjusted] = useState(false);

  const sumPositive = flows.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const sumNegative = flows.filter((f) => f.amount < 0).reduce((s, f) => s + f.amount, 0);

  const add = () => {
    const n = parseFloat(amount.replace(/[$,]/g, ""));
    const yr = parseInt(year, 10);
    if (!isFinite(n) || n === 0) return;
    if (!isFinite(yr) || yr < 1) return;
    const id = Math.random().toString(36).slice(2, 10);
    setFlows([
      ...flows,
      { id, label: label.trim() || (n > 0 ? "Inflow" : "Outflow"), amount: n, year: yr, inflationAdjusted },
    ]);
    setAmount("");
  };

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="font-medium">One-Time Cash Flows</h3>
          <p className="text-xs text-slate-400">
            Lump-sum events: inheritance (+), home sale (+), tuition (−), big medical (−), house renovation (−).
          </p>
        </div>
        {(sumPositive > 0 || sumNegative < 0) && (
          <span className="text-sm tabular-nums">
            {sumPositive > 0 && <span className="text-emerald-400">+{fmtUSD(sumPositive)}</span>}
            {sumPositive > 0 && sumNegative < 0 && <span className="text-slate-500"> · </span>}
            {sumNegative < 0 && <span className="text-rose-400">{fmtUSD(sumNegative)}</span>}
          </span>
        )}
      </div>

      {flows.length > 0 && (
        <ul className="mb-3 space-y-1">
          {[...flows].sort((a, b) => a.year - b.year).map((f) => {
            const positive = f.amount > 0;
            return (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-md bg-ink-800/40 border border-ink-800 px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-200 shrink-0 font-medium">{f.label}</span>
                  <span className="text-xs text-slate-400 shrink-0">year {f.year}</span>
                  {f.inflationAdjusted && (
                    <span className="text-xs px-1.5 py-0.5 rounded border border-cyan-400/30 text-cyan-200 shrink-0">CPI</span>
                  )}
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={`tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                    {positive ? "+" : ""}{fmtUSD(f.amount)}
                  </span>
                  <button
                    onClick={() => setFlows(flows.filter((x) => x.id !== f.id))}
                    className="text-slate-500 hover:text-rose-400 text-sm"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5rem_auto_auto] gap-2">
        <input
          type="text"
          placeholder="Label (e.g., Inheritance)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="$ amount (− for outflow)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
        />
        <input
          type="number"
          min={1}
          max={horizonYears}
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
          title="Simulation year (1 = first year)"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-400 px-1">
          <input type="checkbox" checked={inflationAdjusted} onChange={(e) => setInflationAdjusted(e.target.checked)} className="accent-cyan-400" />
          CPI'd
        </label>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25"
        >
          Add
        </button>
      </div>
    </div>
  );
}
