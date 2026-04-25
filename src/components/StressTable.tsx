import type { StressResult } from "../types";
import { fmtPct, fmtUSD } from "../lib/format";

interface Props { results: StressResult[]; startingBalance: number; }

export function StressTable({ results, startingBalance }: Props) {
  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <h3 className="font-medium mb-2">Stress Scenarios</h3>
      <p className="text-xs text-slate-400 mb-3">
        One-shot returns applied to your current allocation. Starting balance: <span className="text-slate-300 tabular-nums">{fmtUSD(startingBalance)}</span>.
      </p>
      <div className="space-y-3">
        {results.map((r) => {
          const tone = r.drawdownPct < -0.20 ? "text-rose-400" : r.drawdownPct < 0 ? "text-amber-300" : "text-emerald-400";
          return (
            <div key={r.name} className="border-t border-ink-800 pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="font-medium text-slate-100">{r.name}</div>
                <div className={`tabular-nums font-medium ${tone}`}>{fmtPct(r.drawdownPct, 1)}</div>
              </div>
              <div className="text-xs text-slate-400 mt-1">{r.description}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-ink-800/60 border border-ink-800 p-2">
                  <div className="text-xs text-slate-400">Ending balance</div>
                  <div className="tabular-nums">{fmtUSD(r.endingBalance)}</div>
                </div>
                <div className="rounded-md bg-ink-800/60 border border-ink-800 p-2">
                  <div className="text-xs text-slate-400">Historical recovery</div>
                  <div className="tabular-nums">{r.recoveryYearsEstimate > 0 ? `~${r.recoveryYearsEstimate} yrs` : "—"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
