import { useState } from "react";
import type { IncomeStream } from "../types";
import { fmtUSD } from "../lib/format";

interface Props {
  streams: IncomeStream[];
  setStreams: (s: IncomeStream[]) => void;
  horizonYears: number;
}

export function IncomePanel({ streams, setStreams, horizonYears }: Props) {
  const [label, setLabel] = useState("Social Security");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState("5");
  const [end, setEnd] = useState("");
  const [inflationAdjusted, setInflationAdjusted] = useState(true);

  const totalYear1 = streams.reduce((s, x) => s + (x.startYear <= 1 && (x.endYear ?? horizonYears) >= 1 ? x.annualAmount : 0), 0);

  const add = () => {
    const n = parseFloat(amount.replace(/[$,]/g, ""));
    const sy = parseInt(start, 10);
    const ey = end.trim() === "" ? undefined : parseInt(end, 10);
    if (!isFinite(n) || n <= 0) return;
    if (!isFinite(sy) || sy < 1) return;
    if (ey !== undefined && (!isFinite(ey) || ey < sy)) return;

    const id = Math.random().toString(36).slice(2, 10);
    setStreams([
      ...streams,
      { id, label: label.trim() || "Income", annualAmount: n, startYear: sy, endYear: ey, inflationAdjusted },
    ]);
    setAmount("");
    setEnd("");
  };

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="font-medium">Income Streams</h3>
          <p className="text-xs text-slate-400">
            Social Security, pension, rental income, part-time work — anything that offsets the portfolio's spending need.
          </p>
        </div>
        {totalYear1 > 0 && (
          <span className="text-sm text-slate-300 tabular-nums">
            +{fmtUSD(totalYear1)}/yr (year 1)
          </span>
        )}
      </div>

      {streams.length > 0 && (
        <ul className="mb-3 space-y-1">
          {streams.map((s) => {
            const yrs = s.endYear ? `yr ${s.startYear}–${s.endYear}` : `yr ${s.startYear} onward`;
            return (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-ink-800/40 border border-ink-800 px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-200 shrink-0 font-medium">{s.label}</span>
                  <span className="text-xs text-slate-400 shrink-0">{yrs}</span>
                  {s.inflationAdjusted && (
                    <span className="text-xs px-1.5 py-0.5 rounded border border-cyan-400/30 text-cyan-200 shrink-0">CPI</span>
                  )}
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="tabular-nums text-slate-300">{fmtUSD(s.annualAmount)}/yr</span>
                  <button
                    onClick={() => setStreams(streams.filter((x) => x.id !== s.id))}
                    className="text-slate-500 hover:text-rose-400 text-sm"
                    aria-label="Remove"
                    title="Remove"
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5rem_5rem_auto_auto] gap-2">
        <input
          type="text"
          placeholder="Label (e.g., Social Security)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="$ / year"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
        />
        <input
          type="number"
          min={1}
          max={horizonYears}
          placeholder="Start yr"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
          title="First simulation year this stream pays (1 = year one)"
        />
        <input
          type="number"
          min={1}
          max={horizonYears}
          placeholder="End yr"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
          title="Last simulation year (leave blank for lifelong)"
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
