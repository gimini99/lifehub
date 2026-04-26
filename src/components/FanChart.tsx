import { Area, AreaChart, ResponsiveContainer, ReferenceLine, Tooltip, XAxis, YAxis, CartesianGrid, Line } from "recharts";
import type { ScheduledStress, SimResult } from "../types";
import { fmtUSD } from "../lib/format";
import { useThemeColors, useThemeFromContext } from "../lib/useTheme";

interface Props {
  result: SimResult | null;
  horizon: number;
  scheduledStress?: ScheduledStress[];
}

interface Datum {
  year: number;
  p5: number; p25: number; p50: number; p75: number; p95: number;
  band5_95: [number, number];
  band25_75: [number, number];
}

export function FanChart({ result, horizon, scheduledStress }: Props) {
  const theme = useThemeFromContext();
  const c = useThemeColors(theme);
  const events = scheduledStress ?? [];

  if (!result) {
    return (
      <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4 h-72 flex items-center justify-center text-slate-500 text-sm">
        Loading simulation…
      </div>
    );
  }
  const data: Datum[] = Array.from({ length: horizon + 1 }, (_, t) => ({
    year: t,
    p5: result.percentiles.p5[t],
    p25: result.percentiles.p25[t],
    p50: result.percentiles.p50[t],
    p75: result.percentiles.p75[t],
    p95: result.percentiles.p95[t],
    band5_95: [result.percentiles.p5[t], result.percentiles.p95[t]],
    band25_75: [result.percentiles.p25[t], result.percentiles.p75[t]],
  }));

  // Custom tooltip so we can guarantee the median appears alongside the bands,
  // in a stable order, with consistent formatting.
  const renderTooltip = (props: { active?: boolean; payload?: Array<{ payload?: unknown }> }) => {
    if (!props.active || !props.payload || props.payload.length === 0) return null;
    const d = props.payload[0].payload as Datum | undefined;
    if (!d) return null;
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm shadow-lg"
        style={{ background: c["ink-900"], border: `1px solid ${c["ink-700"]}`, color: c["slate-100"] }}
      >
        <div className="text-xs text-slate-400 mb-1">Year {d.year}</div>
        <Row label="Median (50%)" value={fmtUSD(d.p50)} dotColor={c["cyan-400"]} bold />
        <Row label="25–75%" value={`${fmtUSD(d.p25)} – ${fmtUSD(d.p75)}`} dotColor={c["cyan-400"]} dotOpacity={0.45} />
        <Row label="5–95%" value={`${fmtUSD(d.p5)} – ${fmtUSD(d.p95)}`} dotColor={c["cyan-400"]} dotOpacity={0.20} />
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <h3 className="font-medium mb-2">Outcome distribution over time</h3>
      <div className="h-72">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={c["ink-800"]} strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke={c["slate-500"]} tick={{ fontSize: 11, fill: c["slate-400"] }} label={{ value: "Years", position: "insideBottom", offset: -2, fill: c["slate-500"] }} />
            <YAxis stroke={c["slate-500"]} tick={{ fontSize: 11, fill: c["slate-400"] }} tickFormatter={(v) => fmtUSD(v, { compact: true })} />
            <Tooltip content={renderTooltip} />
            <Area type="monotone" dataKey="band5_95" stroke="none" fill={c["cyan-400"]} fillOpacity={0.10} name="5–95%" />
            <Area type="monotone" dataKey="band25_75" stroke="none" fill={c["cyan-400"]} fillOpacity={0.22} name="25–75%" />
            <Line type="monotone" dataKey="p50" stroke={c["cyan-400"]} strokeWidth={2} dot={false} name="Median" />
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Row({ label, value, dotColor, dotOpacity = 1, bold = false }: { label: string; value: string; dotColor: string; dotOpacity?: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: dotColor, opacity: dotOpacity }} />
        <span className={bold ? "text-slate-100 font-medium" : "text-slate-300"}>{label}</span>
      </span>
      <span className={`tabular-nums ${bold ? "text-slate-100 font-medium" : "text-slate-300"}`}>{value}</span>
    </div>
  );
}
