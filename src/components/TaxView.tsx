import type { Allocation, TaxStatus } from "../types";
import { TAX_STATUS_COLORS, taxStatusLabel } from "../lib/accountType";
import { fmtPct, fmtUSD } from "../lib/format";

interface Props {
  allocation: Allocation;
  retirementTaxRate: number;
}

export function TaxView({ allocation, retirementTaxRate }: Props) {
  const { byTaxStatus, total } = allocation;
  const postTaxTotal =
    (byTaxStatus.Taxable ?? 0) +
    (byTaxStatus.TaxFree ?? 0) +
    (byTaxStatus.HSA ?? 0) +
    (byTaxStatus.TaxDeferred ?? 0) * (1 - Math.min(retirementTaxRate, 0.95)) +
    (byTaxStatus.Unknown ?? 0);

  const drag = total - postTaxTotal;
  const order: TaxStatus[] = ["Taxable", "TaxDeferred", "TaxFree", "HSA", "Unknown"];

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-medium">Tax-Aware Net Worth</h3>
        <span className="text-xs text-slate-500">retirement rate {fmtPct(retirementTaxRate, 0)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-ink-800/60 border border-ink-800 p-3">
          <div className="text-xs text-slate-400">Gross</div>
          <div className="text-xl font-semibold tabular-nums">{fmtUSD(total)}</div>
        </div>
        <div className="rounded-lg bg-ink-800/60 border border-ink-800 p-3">
          <div className="text-xs text-slate-400">After tax-deferred haircut</div>
          <div className="text-xl font-semibold tabular-nums text-emerald-300">{fmtUSD(postTaxTotal)}</div>
          {drag > 0 && (
            <div className="text-xs text-rose-300 tabular-nums mt-0.5">−{fmtUSD(drag, { compact: true })} estimated tax drag</div>
          )}
        </div>
      </div>

      <div className="h-3 w-full rounded-full overflow-hidden bg-ink-800 flex">
        {order.map((t) => {
          const v = byTaxStatus[t] ?? 0;
          if (v <= 0) return null;
          const pct = total > 0 ? (v / total) * 100 : 0;
          return <div key={t} style={{ width: `${pct}%`, background: TAX_STATUS_COLORS[t] }} title={`${taxStatusLabel(t)}: ${fmtPct(v / total, 1)}`} />;
        })}
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {order.map((t) => {
          const v = byTaxStatus[t] ?? 0;
          if (v <= 0) return null;
          return (
            <li key={t} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: TAX_STATUS_COLORS[t] }} />
                {taxStatusLabel(t)}
              </span>
              <span className="tabular-nums text-slate-300">{fmtUSD(v, { compact: true })} · {fmtPct(v / total, 1)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Post-tax estimate haircuts the tax-deferred bucket only — Roth/HSA assumed tax-free in retirement, taxable already-paid (gains drag ignored). Adjust the retirement tax rate slider in <span className="text-slate-300">Plan</span> to recompute.
      </p>
    </div>
  );
}
