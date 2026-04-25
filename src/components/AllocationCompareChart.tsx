import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { AssetClass } from "../types";
import { ASSET_CLASSES } from "../lib/cma";
import { classLabel, fmtPct } from "../lib/format";

interface Props {
  current: Record<AssetClass, number>;
  proposed: Record<AssetClass, number>;
}

export function AllocationCompareChart({ current, proposed }: Props) {
  const data = ASSET_CLASSES
    .map((c) => ({
      name: classLabel(c),
      key: c,
      current: (current[c] ?? 0) * 100,
      proposed: (proposed[c] ?? 0) * 100,
    }))
    .filter((d) => d.current > 0.05 || d.proposed > 0.05);

  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 32 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
            formatter={(v: number) => fmtPct(v / 100, 1)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="current" name="Current" fill="#475569" />
          <Bar dataKey="proposed" name="Proposed" fill="#22d3ee" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
