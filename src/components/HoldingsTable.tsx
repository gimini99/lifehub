import { Fragment, useMemo, useState } from "react";
import type { Holding } from "../types";
import { classLabel, fmtUSD, fmtPct, CLASS_COLORS } from "../lib/format";

interface Props { holdings: Holding[]; total: number; }

export function HoldingsTable({ holdings, total }: Props) {
  const [groupByAccount, setGroupByAccount] = useState(true);

  const groups = useMemo(() => {
    if (!groupByAccount) return [{ account: "All Holdings", rows: holdings.slice().sort((a, b) => b.currentValue - a.currentValue) }];
    const map = new Map<string, Holding[]>();
    for (const h of holdings) {
      const k = h.accountName || h.accountNumber;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(h);
    }
    return Array.from(map.entries())
      .map(([account, rows]) => ({ account, rows: rows.sort((a, b) => b.currentValue - a.currentValue) }))
      .sort((a, b) =>
        b.rows.reduce((s, r) => s + r.currentValue, 0) -
        a.rows.reduce((s, r) => s + r.currentValue, 0)
      );
  }, [holdings, groupByAccount]);

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Holdings</h3>
        <label className="text-sm text-slate-400 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={groupByAccount} onChange={(e) => setGroupByAccount(e.target.checked)} />
          Group by account
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left">
            <tr>
              <th className="py-1 pr-2">Symbol</th>
              <th className="py-1 pr-2">Description</th>
              <th className="py-1 pr-2">Class</th>
              <th className="py-1 pr-2 text-right">Value</th>
              <th className="py-1 pr-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const subtotal = g.rows.reduce((s, r) => s + r.currentValue, 0);
              return (
                <Fragment key={g.account}>
                  {groupByAccount && (
                    <tr className="border-t border-ink-800 text-slate-300">
                      <td colSpan={3} className="py-2 font-medium">{g.account}</td>
                      <td className="py-2 text-right tabular-nums">{fmtUSD(subtotal)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtPct(subtotal / total)}</td>
                    </tr>
                  )}
                  {g.rows.map((r, i) => (
                    <tr key={`${g.account}-${i}`} className="border-t border-ink-800/60">
                      <td className="py-1 pr-2 font-mono text-cyan-300">{r.symbol ?? "—"}</td>
                      <td className="py-1 pr-2 text-slate-300 truncate max-w-[24rem]">{r.description}</td>
                      <td className="py-1 pr-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: CLASS_COLORS[r.assetClass] }} />
                          <span className="text-slate-300">{classLabel(r.assetClass)}</span>
                        </span>
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums">{fmtUSD(r.currentValue)}</td>
                      <td className="py-1 pr-2 text-right tabular-nums text-slate-400">{fmtPct(r.currentValue / total)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
