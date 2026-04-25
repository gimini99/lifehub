import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line } from "recharts";
import type { SimResult } from "../types";
import { fmtUSD } from "../lib/format";

interface Props { result: SimResult | null; horizon: number; }

export function FanChart({ result, horizon }: Props) {
  if (!result) {
    return (
      <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4 h-72 flex items-center justify-center text-slate-500 text-sm">
        Loading simulation…
      </div>
    );
  }
  const data = Array.from({ length: horizon + 1 }, (_, t) => ({
    year: t,
    p5: result.percentiles.p5[t],
    p25: result.percentiles.p25[t],
    p50: result.percentiles.p50[t],
    p75: result.percentiles.p75[t],
    p95: result.percentiles.p95[t],
    band5_95: [result.percentiles.p5[t], result.percentiles.p95[t]],
    band25_75: [result.percentiles.p25[t], result.percentiles.p75[t]],
  }));

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <h3 className="font-medium mb-2">Outcome distribution over time</h3>
      <div className="h-72">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: "Years", position: "insideBottom", offset: -2, fill: "#64748b" }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtUSD(v, { compact: true })} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
              labelFormatter={(y) => `Year ${y}`}
              formatter={(v: number | number[], name: string) => {
                if (Array.isArray(v)) return [`${fmtUSD(v[0])} – ${fmtUSD(v[1])}`, name];
                return [fmtUSD(v), name];
              }}
            />
            <Area type="monotone" dataKey="band5_95" stroke="none" fill="#22d3ee" fillOpacity={0.10} name="5–95%" />
            <Area type="monotone" dataKey="band25_75" stroke="none" fill="#22d3ee" fillOpacity={0.22} name="25–75%" />
            <Line type="monotone" dataKey="p50" stroke="#22d3ee" strokeWidth={2} dot={false} name="Median" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
