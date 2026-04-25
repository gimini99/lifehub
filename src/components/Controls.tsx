import type { SimulationModel, SpendingPhases, WithdrawalStrategy } from "../types";
import { fmtPct, fmtUSD } from "../lib/format";

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

  strategy: WithdrawalStrategy;
  setStrategy: (s: WithdrawalStrategy) => void;
  simulationModel: SimulationModel;
  setSimulationModel: (m: SimulationModel) => void;
  retirementTaxRate: number;
  setRetirementTaxRate: (n: number) => void;
  spendingPhases: SpendingPhases | undefined;
  setSpendingPhases: (s: SpendingPhases | undefined) => void;
}

const DEFAULT_PHASES: SpendingPhases = { phase2Year: 16, phase2Mult: 0.75, phase3Year: 26, phase3Mult: 0.90 };

export function Controls(p: Props) {
  const wRate = p.total > 0 ? p.withdrawal / p.total : 0;

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4 space-y-5">
      <h3 className="font-medium">Plan</h3>

      <Section title="Withdrawal strategy">
        <Segmented
          value={p.strategy.kind}
          options={[
            { value: "fixedReal", label: "Fixed real $" },
            { value: "fixedPercent", label: "% of balance" },
            { value: "guytonKlinger", label: "Guyton-Klinger" },
          ]}
          onChange={(v) => {
            if (v === "fixedReal") p.setStrategy({ kind: "fixedReal" });
            else if (v === "fixedPercent") p.setStrategy({ kind: "fixedPercent", rate: 0.04 });
            else p.setStrategy({
              kind: "guytonKlinger",
              preservationCut: 0.10,
              prosperityRaise: 0.10,
              preservationTrigger: 0.20,
              prosperityTrigger: 0.20,
              skipCpiAfterNegative: true,
            });
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          {p.strategy.kind === "fixedReal" && "Spend the same real-dollar amount each year (CPI-adjusted)."}
          {p.strategy.kind === "fixedPercent" && "Each year, withdraw a fixed % of the current balance — never depletes, but spending varies."}
          {p.strategy.kind === "guytonKlinger" && "Start fixed-real, then trim spending after big drawdowns and raise it after big run-ups. Skip the inflation bump after a down year."}
        </p>

        {p.strategy.kind === "fixedPercent" ? (
          <Slider
            label="Withdrawal rate"
            sub={`${fmtPct(p.strategy.rate, 2)} · ${fmtUSD(p.strategy.rate * p.total)}/yr`}
            value={Math.round(p.strategy.rate * 1000)}
            min={10} max={120} step={5}
            onChange={(v) => p.setStrategy({ kind: "fixedPercent", rate: v / 1000 })}
          />
        ) : (
          <Slider
            label="Year-1 spending (after-tax)"
            sub={`${fmtUSD(p.withdrawal)}/yr (${fmtPct(wRate, 2)} of portfolio)`}
            value={p.withdrawal}
            min={0}
            max={Math.max(500_000, Math.round(p.total * 0.12))}
            step={1000}
            onChange={p.setWithdrawal}
          />
        )}
      </Section>

      <Section title="Horizon & inflation">
        <Slider label="Horizon" sub={`${p.horizon} years`} value={p.horizon} min={5} max={60} step={1} onChange={p.setHorizon} />
        <Slider label="Inflation" sub={fmtPct(p.inflation, 1)} value={Math.round(p.inflation * 1000)} min={0} max={80} step={1} onChange={(v) => p.setInflation(v / 1000)} />
      </Section>

      <Section title="Tax">
        <Slider
          label="Effective retirement tax rate"
          sub={fmtPct(p.retirementTaxRate, 0)}
          value={Math.round(p.retirementTaxRate * 100)} min={0} max={50} step={1}
          onChange={(v) => p.setRetirementTaxRate(v / 100)}
        />
        <p className="mt-1 text-xs text-slate-500">Sim grosses up your withdrawal to fund the after-tax spending you set above.</p>
      </Section>

      <Section title="Spending phases">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={!!p.spendingPhases}
            onChange={(e) => p.setSpendingPhases(e.target.checked ? DEFAULT_PHASES : undefined)}
            className="accent-cyan-400"
          />
          Use go-go / slow-go / no-go phases
        </label>
        {p.spendingPhases && (
          <div className="space-y-2 pl-1 mt-1">
            <Slider
              label="Slow-go starts year"
              sub={`year ${p.spendingPhases.phase2Year}`}
              value={p.spendingPhases.phase2Year} min={2} max={p.horizon} step={1}
              onChange={(v) => p.setSpendingPhases({ ...p.spendingPhases!, phase2Year: Math.min(v, p.spendingPhases!.phase3Year - 1) })}
            />
            <Slider
              label="Slow-go spending"
              sub={fmtPct(p.spendingPhases.phase2Mult, 0)}
              value={Math.round(p.spendingPhases.phase2Mult * 100)} min={40} max={120} step={5}
              onChange={(v) => p.setSpendingPhases({ ...p.spendingPhases!, phase2Mult: v / 100 })}
            />
            <Slider
              label="No-go starts year"
              sub={`year ${p.spendingPhases.phase3Year}`}
              value={p.spendingPhases.phase3Year} min={p.spendingPhases.phase2Year + 1} max={p.horizon} step={1}
              onChange={(v) => p.setSpendingPhases({ ...p.spendingPhases!, phase3Year: v })}
            />
            <Slider
              label="No-go spending"
              sub={fmtPct(p.spendingPhases.phase3Mult, 0)}
              value={Math.round(p.spendingPhases.phase3Mult * 100)} min={40} max={150} step={5}
              onChange={(v) => p.setSpendingPhases({ ...p.spendingPhases!, phase3Mult: v / 100 })}
            />
            <p className="text-xs text-slate-500">
              Default: full spending years 1-15, 75% slow-go years 16-25, 90% no-go years 26+ (healthcare bump).
            </p>
          </div>
        )}
      </Section>

      <Section title="Simulation engine">
        <Segmented
          value={p.simulationModel}
          options={[
            { value: "gbm", label: "GBM (synthetic)" },
            { value: "bootstrap", label: "Historical bootstrap" },
          ]}
          onChange={(v) => p.setSimulationModel(v as SimulationModel)}
        />
        <p className="mt-1 text-xs text-slate-500">
          {p.simulationModel === "gbm"
            ? "Generates returns from per-class normal distributions (mu, sigma) with class correlations."
            : "Each path samples consecutive years from 1973–2023 history; preserves real fat tails and regime correlations."}
        </p>
        <Slider label="Simulation paths" sub={`${p.paths.toLocaleString()} paths`} value={p.paths} min={500} max={10000} step={500} onChange={p.setPaths} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-ink-700 bg-ink-800/40 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            "px-2.5 py-1 rounded transition",
            value === o.value
              ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/30"
              : "text-slate-400 hover:text-slate-200",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
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
