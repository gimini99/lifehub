import type { SimResult } from "../types";
import { fmtPct, fmtUSD } from "../lib/format";

interface Props {
  result: SimResult | null;
}

export function CashFlowTable({ result }: Props) {
  const rows = result?.representativePath;
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4 text-sm text-slate-500">
        No representative path yet — run a simulation.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <h3 className="font-medium mb-1">Year-by-Year Cash Flow (median path)</h3>
      <p className="text-xs text-slate-400 mb-3">
        The Monte Carlo path whose ending balance is closest to the median. Numbers are nominal (year-of dollars).
      </p>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs sm:text-sm">
          <thead className="text-slate-400 sticky top-0 bg-ink-900">
            <tr className="text-right">
              <th className="py-1.5 pr-2 text-left">Yr</th>
              <th className="py-1.5 pr-2">Start</th>
              <th className="py-1.5 pr-2">Return</th>
              <th className="py-1.5 pr-2">Cash flow</th>
              <th className="py-1.5 pr-2">Income</th>
              <th className="py-1.5 pr-2">Net spend</th>
              <th className="py-1.5 pr-2">From portfolio</th>
              <th className="py-1.5 pr-2">Tax</th>
              <th className="py-1.5 pr-2">End</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const retTone = r.returnPct >= 0 ? "text-emerald-400" : "text-rose-400";
              const flowTone = r.cashFlow > 0 ? "text-emerald-400" : r.cashFlow < 0 ? "text-rose-400" : "text-slate-500";
              return (
                <tr key={r.year} className="border-t border-ink-800/60 text-right">
                  <td className="py-1 pr-2 text-left text-slate-300">{r.year}</td>
                  <td className="py-1 pr-2 tabular-nums text-slate-300">{fmtUSD(r.startBal, { compact: true })}</td>
                  <td className={`py-1 pr-2 tabular-nums ${retTone}`}>
                    {fmtPct(r.returnPct, 1)}
                    <span className="text-slate-500 ml-1">({fmtUSD(r.returnDollars, { compact: true })})</span>
                  </td>
                  <td className={`py-1 pr-2 tabular-nums ${flowTone}`}>{r.cashFlow !== 0 ? (r.cashFlow > 0 ? "+" : "") + fmtUSD(r.cashFlow, { compact: true }) : "—"}</td>
                  <td className="py-1 pr-2 tabular-nums text-slate-300">{r.income > 0 ? fmtUSD(r.income, { compact: true }) : "—"}</td>
                  <td className="py-1 pr-2 tabular-nums text-slate-300">{fmtUSD(r.netSpendTarget, { compact: true })}</td>
                  <td className="py-1 pr-2 tabular-nums text-slate-300">{fmtUSD(r.portfolioGross, { compact: true })}</td>
                  <td className="py-1 pr-2 tabular-nums text-slate-400">{r.taxes > 0 ? fmtUSD(r.taxes, { compact: true }) : "—"}</td>
                  <td className={`py-1 pr-2 tabular-nums font-medium ${r.endBal <= 0 ? "text-rose-400" : "text-slate-100"}`}>{fmtUSD(r.endBal, { compact: true })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
