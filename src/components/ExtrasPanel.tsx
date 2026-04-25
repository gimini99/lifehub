import { useState } from "react";
import type { AssetClass, ExtraAsset, TaxStatus } from "../types";
import { ASSET_CLASSES } from "../types";
import { classLabel, fmtUSD, CLASS_COLORS } from "../lib/format";
import { taxStatusLabel, TAX_STATUS_COLORS } from "../lib/accountType";

const TAX_OPTIONS: TaxStatus[] = ["Taxable", "TaxDeferred", "TaxFree", "HSA"];

interface Props {
  extras: ExtraAsset[];
  setExtras: (e: ExtraAsset[]) => void;
}

export function ExtrasPanel({ extras, setExtras }: Props) {
  const [klass, setKlass] = useState<AssetClass>("USStock");
  const [tax, setTax] = useState<TaxStatus>("Taxable");
  const [amount, setAmount] = useState<string>("");
  const [label, setLabel] = useState<string>("");

  const total = extras.reduce((s, e) => s + e.amount, 0);

  const add = () => {
    const n = parseFloat(amount.replace(/[$,]/g, ""));
    if (!isFinite(n) || n <= 0) return;
    const id = Math.random().toString(36).slice(2, 10);
    setExtras([...extras, { id, assetClass: klass, taxStatus: tax, amount: n, label: label.trim() || undefined }]);
    setAmount("");
    setLabel("");
  };

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="font-medium">Hypothetical / Extra Assets</h3>
          <p className="text-xs text-slate-400">
            Add what-if money that's not in your CSV (e.g., expected inheritance, real-estate equity, planned 401k contribution).
          </p>
        </div>
        {total > 0 && <span className="text-sm text-slate-300 tabular-nums">+{fmtUSD(total)}</span>}
      </div>

      {extras.length > 0 && (
        <ul className="mb-3 space-y-1">
          {extras.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-ink-800/40 border border-ink-800 px-3 py-1.5 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CLASS_COLORS[e.assetClass] }} />
                <span className="text-slate-200 shrink-0">{classLabel(e.assetClass)}</span>
                <span className="text-xs px-1.5 py-0.5 rounded border shrink-0" style={{ color: TAX_STATUS_COLORS[e.taxStatus], borderColor: TAX_STATUS_COLORS[e.taxStatus] + "55" }}>
                  {taxStatusLabel(e.taxStatus)}
                </span>
                {e.label && <span className="text-slate-400 truncate">· {e.label}</span>}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums text-slate-300">{fmtUSD(e.amount)}</span>
                <button
                  onClick={() => setExtras(extras.filter((x) => x.id !== e.id))}
                  className="text-slate-500 hover:text-rose-400 text-sm"
                  aria-label="Remove"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_minmax(0,1fr)_auto] gap-2">
        <select
          value={klass}
          onChange={(e) => setKlass(e.target.value as AssetClass)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
        >
          {ASSET_CLASSES.map((c) => <option key={c} value={c}>{classLabel(c)}</option>)}
        </select>
        <select
          value={tax}
          onChange={(e) => setTax(e.target.value as TaxStatus)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
        >
          {TAX_OPTIONS.map((t) => <option key={t} value={t}>{taxStatusLabel(t)}</option>)}
        </select>
        <input
          type="text"
          inputMode="decimal"
          placeholder="$ amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
        />
        <input
          type="text"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
        />
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25"
        >
          Add
        </button>
      </div>
    </div>
  );
}
