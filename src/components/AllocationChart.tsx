import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Allocation } from "../types";
import { classLabel, CLASS_COLORS, fmtUSD, fmtPct } from "../lib/format";
import { useThemeColors, useThemeFromContext } from "../lib/useTheme";

interface Props { allocation: Allocation; }

export function AllocationChart({ allocation }: Props) {
  const theme = useThemeFromContext();
  const c = useThemeColors(theme);
  const data = Object.entries(allocation.byClass)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: classLabel(k), key: k, value: v }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium">Allocation by Asset Class</h3>
        <span className="text-sm text-slate-400">{fmtUSD(allocation.total)}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
              {data.map((d) => <Cell key={d.key} fill={CLASS_COLORS[d.key] ?? "#888"} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: c["ink-900"], border: `1px solid ${c["ink-700"]}`, borderRadius: 8, color: c["slate-100"] }}
              formatter={(v: number) => [`${fmtUSD(v)} (${fmtPct(v / allocation.total)})`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: CLASS_COLORS[d.key] }} />
              {d.name}
            </span>
            <span className="tabular-nums text-slate-300">{fmtPct(d.value / allocation.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
