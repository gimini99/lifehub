import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SimInputs, SimResult } from "../types";
import { fmtPct, fmtUSD } from "../lib/format";
import { useThemeColors, useThemeFromContext } from "../lib/useTheme";
import { findMaxSafeWithdrawal } from "../lib/monteCarlo";

interface Props {
  result: SimResult | null;
  baseInputs: Omit<SimInputs, "weights"> | null;
  weights: Record<string, number> | null;
}

export function SequenceRiskPanel({ result, baseInputs, weights }: Props) {
  const theme = useThemeFromContext();
  const c = useThemeColors(theme);
  const [solverResult, setSolverResult] = useState<{ amount: number; rate: number; success: number } | null>(null);
  const [solving, setSolving] = useState(false);

  if (!result) {
    return (
      <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4 h-72 flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  const horizon = result.percentiles.p50.length - 1;
  const worst = result.worstPaths ?? [];
  const median = result.percentiles.p50;
  const data = Array.from({ length: horizon + 1 }, (_, t) => {
    const row: Record<string, number> = { year: t, median: median[t] };
    worst.forEach((p, i) => { row[`w${i}`] = p[t]; });
    return row;
  });

  const failed = worst.filter((p) => p[horizon] <= 0).length;

  const onSolve = async () => {
    if (!baseInputs || !weights) return;
    setSolving(true);
    setSolverResult(null);
    // Yield to UI for the spinner before the synchronous loop kicks off.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const r = findMaxSafeWithdrawal(
        { ...baseInputs, weights: weights as Record<import("../types").AssetClass, number> },
        0.95, 12, 2000,
      );
      setSolverResult(r);
    } finally {
      setSolving(false);
    }
  };

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="font-medium">Sequence-of-Returns Risk</h3>
          <p className="text-xs text-slate-400">
            The {worst.length} worst-percentile paths overlaid on the median. Early-retirement drawdowns are the failure mode.
          </p>
        </div>
        <button
          onClick={onSolve}
          disabled={solving || !baseInputs}
          className="px-3 py-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {solving ? "Solving…" : "Find max safe withdrawal (95%)"}
        </button>
      </div>

      <div className="h-64 mb-2">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={c["ink-800"]} strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke={c["slate-500"]} tick={{ fontSize: 11, fill: c["slate-400"] }} />
            <YAxis stroke={c["slate-500"]} tick={{ fontSize: 11, fill: c["slate-400"] }} tickFormatter={(v) => fmtUSD(v, { compact: true })} />
            <Tooltip
              contentStyle={{ background: c["ink-900"], border: `1px solid ${c["ink-700"]}`, borderRadius: 8, color: c["slate-100"] }}
              labelFormatter={(y) => `Year ${y}`}
              formatter={(v: number, name: string) => [fmtUSD(v, { compact: true }), name === "median" ? "Median" : ""]}
            />
            {worst.map((_, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`w${i}`}
                stroke="#fb7185"
                strokeWidth={1}
                strokeOpacity={0.45}
                dot={false}
                isAnimationActive={false}
                legendType="none"
                name={`worst #${i + 1}`}
              />
            ))}
            <Line type="monotone" dataKey="median" stroke={c["cyan-400"]} strokeWidth={2.5} dot={false} name="Median" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        <Stat label="Worst paths shown" value={`${worst.length}`} />
        <Stat label="Of those, depleted" value={`${failed}`} tone={failed > 0 ? "warn" : "ok"} />
        <Stat label="Worst ending balance" value={worst.length > 0 ? fmtUSD(Math.min(...worst.map((p) => p[horizon])), { compact: true }) : "—"} />
      </div>

      {solverResult && (
        <div className="mt-3 rounded-lg bg-ink-800/40 border border-ink-800 p-3 text-sm">
          <div className="text-xs text-slate-400 mb-1">Max safe annual withdrawal at 95% success</div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-semibold tabular-nums text-cyan-200">{fmtUSD(solverResult.amount)}</span>
            <span className="text-slate-300 tabular-nums">{fmtPct(solverResult.rate, 2)} of portfolio</span>
            <span className="text-xs text-slate-500">(realized success {fmtPct(solverResult.success, 1)})</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Binary-searches the year-1 withdrawal that lands at ~95% survivability under your current allocation, horizon, taxes, income, and cash flows.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const color = tone === "warn" ? "text-rose-400" : tone === "ok" ? "text-emerald-400" : "text-slate-100";
  return (
    <div className="rounded-md bg-ink-800/40 border border-ink-800 p-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`tabular-nums font-medium ${color}`}>{value}</div>
    </div>
  );
}
