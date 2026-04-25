import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { AssetClass } from "../types";
import { ASSET_CLASSES } from "../types";
import { classLabel, fmtPct } from "../lib/format";
import { useThemeColors, useThemeFromContext } from "../lib/useTheme";

interface Props {
  current: Record<AssetClass, number>;
  proposed: Record<AssetClass, number>;
}

export function AllocationCompareChart({ current, proposed }: Props) {
  const theme = useThemeFromContext();
  const c = useThemeColors(theme);

  const data = ASSET_CLASSES
    .map((klass) => ({
      name: classLabel(klass),
      key: klass,
      current: (current[klass] ?? 0) * 100,
      proposed: (proposed[klass] ?? 0) * 100,
    }))
    .filter((d) => d.current > 0.05 || d.proposed > 0.05);

  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 32 }}>
          <CartesianGrid stroke={c["ink-800"]} strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke={c["slate-500"]} tick={{ fontSize: 10, fill: c["slate-400"] }} angle={-30} textAnchor="end" interval={0} />
          <YAxis stroke={c["slate-500"]} tick={{ fontSize: 11, fill: c["slate-400"] }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ background: c["ink-900"], border: `1px solid ${c["ink-700"]}`, borderRadius: 8, color: c["slate-100"] }}
            formatter={(v: number) => fmtPct(v / 100, 1)}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: c["slate-300"] }} />
          <Bar dataKey="current" name="Current" fill={c["slate-400"]} />
          <Bar dataKey="proposed" name="Proposed" fill={c["cyan-400"]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
