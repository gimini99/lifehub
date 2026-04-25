import { useState } from "react";
import type { AssetClass, SimInputs } from "../types";
import { fmtPct, fmtUSD } from "../lib/format";
import { findMaxSafeWithdrawal } from "../lib/monteCarlo";

interface Props {
  baseInputs: Omit<SimInputs, "weights"> | null;
  weights: Record<AssetClass, number> | null;
  currentWithdrawal: number;
}

const PRESETS = [80, 85, 90, 95, 99];

export function SwrSolverPanel({ baseInputs, weights, currentWithdrawal }: Props) {
  const [target, setTarget] = useState(90);
  const [result, setResult] = useState<{ amount: number; rate: number; success: number; target: number } | null>(null);
  const [solving, setSolving] = useState(false);

  const onSolve = async () => {
    if (!baseInputs || !weights) return;
    setSolving(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 30)); // let the spinner paint before the blocking loop
    try {
      const r = findMaxSafeWithdrawal(
        { ...baseInputs, weights },
        target / 100,
        14, // a couple more iterations for tighter convergence
        2000,
      );
      setResult({ ...r, target });
    } finally {
      setSolving(false);
    }
  };

  const delta = result ? result.amount - currentWithdrawal : 0;

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="font-medium">Safe Withdrawal Rate Solver</h3>
          <p className="text-xs text-slate-400">
            Inverts the sim: given your full plan, finds the highest year-1 spend that still hits the target survivability.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-sm text-slate-400 mr-1">Target success:</span>
        <div className="inline-flex rounded-md border border-ink-700 bg-ink-800/40 p-0.5 text-xs">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setTarget(p)}
              className={[
                "px-2 py-1 rounded transition tabular-nums",
                target === p ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/30" : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {p}%
            </button>
          ))}
        </div>
        <input
          type="range"
          min={50} max={99} step={1}
          value={target}
          onChange={(e) => setTarget(parseInt(e.target.value, 10))}
          className="flex-1 min-w-[10rem] accent-cyan-400"
          aria-label="Target success rate"
        />
        <span className="text-sm tabular-nums text-slate-300 w-12 text-right">{target}%</span>
        <button
          onClick={onSolve}
          disabled={solving || !baseInputs}
          className="px-3 py-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {solving ? "Solving…" : "Solve"}
        </button>
      </div>

      {result && (
        <div className="rounded-lg bg-ink-800/40 border border-ink-800 p-3">
          <div className="text-xs text-slate-400 mb-1">Max safe annual withdrawal at {result.target}% success</div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-semibold tabular-nums text-cyan-200">{fmtUSD(result.amount)}</span>
            <span className="text-slate-300 tabular-nums">{fmtPct(result.rate, 2)} of portfolio</span>
            {currentWithdrawal > 0 && (
              <span className={`text-sm tabular-nums ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {delta >= 0 ? "+" : ""}{fmtUSD(delta, { compact: true })} vs current
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Realized success in the binary-search MC: <span className="text-slate-300">{fmtPct(result.success, 1)}</span>.
            Honors your full plan — allocation, horizon, taxes, income streams, cash flows, spending phases.
          </p>
        </div>
      )}

      {!result && !solving && (
        <p className="text-xs text-slate-500">
          Click <span className="text-slate-300">Solve</span> to binary-search the year-1 spend that lands at the chosen survivability target. Takes 1–3 seconds.
        </p>
      )}
    </div>
  );
}
