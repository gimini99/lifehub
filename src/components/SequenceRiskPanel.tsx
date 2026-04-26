import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScheduledStress, SimResult } from "../types";
import { fmtUSD } from "../lib/format";
import { useThemeColors, useThemeFromContext } from "../lib/useTheme";

interface Props {
  result: SimResult | null;
  scheduledStress?: ScheduledStress[];
}

export function SequenceRiskPanel({ result, scheduledStress }: Props) {
  const theme = useThemeFromContext();
  const c = useThemeColors(theme);
  const events = scheduledStress ?? [];

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

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="mb-2">
        <h3 className="font-medium">Sequence-of-Returns Risk</h3>
        <p className="text-xs text-slate-400">
          The {worst.length} worst-percentile paths overlaid on the median. Early-retirement drawdowns are the failure mode.
        </p>
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
            {events.map((ev) => (
              <ReferenceLine
                key={ev.id}
                x={ev.year}
                stroke="#fb7185"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: ev.scenarioName, position: "top", fill: "#fb7185", fontSize: 10 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        <Stat label="Worst paths shown" value={`${worst.length}`} />
        <Stat label="Of those, depleted" value={`${failed}`} tone={failed > 0 ? "warn" : "ok"} />
        <Stat label="Worst ending balance" value={worst.length > 0 ? fmtUSD(Math.min(...worst.map((p) => p[horizon])), { compact: true }) : "—"} />
      </div>
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
