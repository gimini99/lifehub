import type { SimResult } from "../types";
import { fmtPct, fmtUSD } from "../lib/format";

interface Props {
  result: SimResult | null;
  computing: boolean;
  horizon: number;
}

export function SurvivabilityCard({ result, computing, horizon }: Props) {
  const pct = result?.successProbability ?? 0;
  const tone =
    pct >= 0.9 ? "text-emerald-400" :
    pct >= 0.75 ? "text-cyan-300" :
    pct >= 0.5 ? "text-amber-300" :
    "text-rose-400";

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium">Survivability</h3>
        {computing && <span className="text-xs text-slate-400 animate-pulse">simulating…</span>}
      </div>
      <div className="text-sm text-slate-400 mb-2">probability portfolio survives full {horizon}-yr horizon</div>
      <div className={`text-5xl font-semibold tabular-nums ${tone}`}>
        {result ? fmtPct(pct, 1) : "—"}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Median ending balance" value={result ? fmtUSD(result.medianEnding, { compact: true }) : "—"} />
        <Stat
          label="Avg yrs to depletion (failed paths)"
          value={result?.yearsToDepletion ? `${result.yearsToDepletion.toFixed(1)} yrs` : "—"}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-800/60 border border-ink-800 p-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}
