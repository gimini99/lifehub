interface Props {
  withdrawal: number;
  setWithdrawal: (n: number) => void;
  horizon: number;
  setHorizon: (n: number) => void;
  inflation: number;
  setInflation: (n: number) => void;
  paths: number;
  setPaths: (n: number) => void;
  total: number;
}

import { fmtUSD, fmtPct } from "../lib/format";

export function Controls({
  withdrawal, setWithdrawal,
  horizon, setHorizon,
  inflation, setInflation,
  paths, setPaths,
  total,
}: Props) {
  const wRate = total > 0 ? withdrawal / total : 0;
  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4 space-y-4">
      <h3 className="font-medium">Plan</h3>

      <Slider
        label="Annual Withdrawal"
        sub={`${fmtUSD(withdrawal)}/yr (${fmtPct(wRate, 2)} of portfolio)`}
        value={withdrawal} min={0} max={Math.max(500_000, Math.round(total * 0.12))} step={1000}
        onChange={setWithdrawal}
      />
      <Slider
        label="Horizon"
        sub={`${horizon} years`}
        value={horizon} min={5} max={60} step={1}
        onChange={setHorizon}
      />
      <Slider
        label="Inflation"
        sub={fmtPct(inflation, 1)}
        value={inflation * 1000} min={0} max={80} step={1}
        onChange={(v) => setInflation(v / 1000)}
      />
      <Slider
        label="Simulation Paths"
        sub={`${paths.toLocaleString()} paths`}
        value={paths} min={500} max={10000} step={500}
        onChange={setPaths}
      />
    </div>
  );
}

function Slider(props: {
  label: string; sub: string;
  value: number; min: number; max: number; step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-300">{props.label}</span>
        <span className="text-slate-400 tabular-nums">{props.sub}</span>
      </div>
      <input
        type="range"
        className="w-full accent-cyan-400"
        min={props.min} max={props.max} step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}
