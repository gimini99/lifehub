import { useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "./components/FileDrop";
import { HoldingsTable } from "./components/HoldingsTable";
import { AllocationChart } from "./components/AllocationChart";
import { Controls } from "./components/Controls";
import { SurvivabilityCard } from "./components/SurvivabilityCard";
import { FanChart } from "./components/FanChart";
import { StressTable } from "./components/StressTable";
import { OptimizerPanel } from "./components/OptimizerPanel";
import { TaxView } from "./components/TaxView";
import { ExtrasPanel } from "./components/ExtrasPanel";
import { IncomePanel } from "./components/IncomePanel";
import { LumpSumsPanel } from "./components/LumpSumsPanel";
import { ScheduledStressPanel } from "./components/ScheduledStressPanel";
import { SequenceRiskPanel } from "./components/SequenceRiskPanel";
import { SwrSolverPanel } from "./components/SwrSolverPanel";
import { CashFlowTable } from "./components/CashFlowTable";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeContext, useTheme } from "./lib/useTheme";
import { parseFidelityCsv, computeAllocation, classWeights } from "./lib/parseCsv";
import { runStressScenarios } from "./lib/stress";
import type { AssetClass, CashFlow, ExtraAsset, Holding, IncomeStream, ScheduledStress, SimInputs, SimResult, SimulationModel, SpendingPhases, WithdrawalStrategy } from "./types";
import { fmtUSD } from "./lib/format";

interface PortfolioState {
  holdings: Holding[];
  fileName: string;
  loadedAt: Date;
  source: "csv" | "manual";
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [withdrawal, setWithdrawal] = useState(80_000);
  const [horizon, setHorizon] = useState(30);
  const [inflation, setInflation] = useState(0.025);
  const [paths, setPaths] = useState(4000);
  const [strategy, setStrategy] = useState<WithdrawalStrategy>({ kind: "fixedPercent", rate: 0.04 });
  const [simulationModel, setSimulationModel] = useState<SimulationModel>("gbm");
  const [retirementTaxRate, setRetirementTaxRate] = useState(0);
  const [extras, setExtras] = useState<ExtraAsset[]>([]);
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [spendingPhases, setSpendingPhases] = useState<SpendingPhases | undefined>(undefined);
  const [scheduledStress, setScheduledStress] = useState<ScheduledStress[]>([]);

  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [baselineSuccess, setBaselineSuccess] = useState<number | null>(null);

  // Preview state — when set, the sim and forward-looking views use these weights instead of current.
  const [previewWeights, setPreviewWeights] = useState<Record<AssetClass, number> | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  // Track whether each in-flight sim is for the current portfolio (so we know to update the baseline number).
  const reqIsBaselineRef = useRef(true);

  useEffect(() => {
    const w = new Worker(new URL("./workers/sim.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<{ id: number; result?: SimResult; error?: string }>) => {
      if (e.data.id !== reqIdRef.current) return;
      if (e.data.error) console.error(e.data.error);
      if (e.data.result) {
        setSimResult(e.data.result);
        if (reqIsBaselineRef.current) setBaselineSuccess(e.data.result.successProbability);
      }
      setComputing(false);
    };
    return () => w.terminate();
  }, []);

  const mergedHoldings = useMemo<Holding[]>(() => {
    if (!portfolio) return [];
    const synthetic: Holding[] = extras.map((e) => ({
      accountNumber: "extra",
      accountName: e.label?.trim() ? e.label : `Hypothetical · ${e.assetClass}`,
      symbol: null,
      description: e.label?.trim() ? e.label : `Hypothetical ${e.assetClass}`,
      quantity: null,
      lastPrice: null,
      currentValue: e.amount,
      costBasis: null,
      totalGainLoss: null,
      assetClass: e.assetClass,
      taxStatus: e.taxStatus,
      isExtra: true,
    }));
    return [...portfolio.holdings, ...synthetic];
  }, [portfolio, extras]);

  const allocation = useMemo(() => portfolio ? computeAllocation(mergedHoldings) : null, [portfolio, mergedHoldings]);
  const currentWeights = useMemo(() => allocation ? classWeights(allocation) : null, [allocation]);
  const effectiveWeights = previewWeights ?? currentWeights;

  const stress = useMemo(
    () => allocation && effectiveWeights ? runStressScenarios(allocation.total, effectiveWeights) : [],
    [allocation, effectiveWeights]
  );

  // Reset preview when portfolio changes.
  useEffect(() => { setPreviewWeights(null); setPreviewLabel(null); setBaselineSuccess(null); }, [portfolio]);

  useEffect(() => {
    if (!allocation || !effectiveWeights || !workerRef.current) return;
    // No money to simulate yet — manual mode before any asset is entered. Skip the worker call so
    // we don't burn cycles on a starting-balance-of-zero sim that always shows 0% survivability.
    if (allocation.total <= 0) { setSimResult(null); setComputing(false); return; }
    setComputing(true);
    reqIdRef.current += 1;
    reqIsBaselineRef.current = previewWeights == null;
    const input: SimInputs = {
      startingBalance: allocation.total,
      weights: effectiveWeights,
      annualWithdrawal: withdrawal,
      inflation,
      horizonYears: horizon,
      paths,
      withdrawalStrategy: strategy,
      simulationModel,
      retirementTaxRate,
      incomeStreams,
      cashFlows,
      spendingPhases,
      scheduledStress,
    };
    workerRef.current.postMessage({ id: reqIdRef.current, input });
  }, [allocation, effectiveWeights, previewWeights, withdrawal, inflation, horizon, paths, strategy, simulationModel, retirementTaxRate, incomeStreams, cashFlows, spendingPhases, scheduledStress]);

  const handleFile = (text: string, fileName: string) => {
    try {
      const holdings = parseFidelityCsv(text);
      if (holdings.length === 0) {
        alert("No holdings found in this file. Is it a Fidelity portfolio export?");
        return;
      }
      setPortfolio({ holdings, fileName, loadedAt: new Date(), source: "csv" });
    } catch (e) {
      alert(`Failed to parse: ${e}`);
    }
  };

  const startManual = () => {
    // Empty real portfolio. The user's holdings will live in `extras`, which already merges into
    // mergedHoldings. The downstream report pipeline doesn't care which source they came from.
    setPortfolio({ holdings: [], fileName: "Manual portfolio", loadedAt: new Date(), source: "manual" });
    setExtras([]);
  };

  const onPreview = (w: Record<AssetClass, number> | null, label: string | null) => {
    setPreviewWeights(w);
    setPreviewLabel(label);
  };

  const baseInputs: Omit<SimInputs, "weights"> | null = allocation ? {
    startingBalance: allocation.total,
    annualWithdrawal: withdrawal,
    inflation,
    horizonYears: horizon,
    paths: 4000,
    withdrawalStrategy: strategy,
    simulationModel,
    retirementTaxRate,
    incomeStreams,
    cashFlows,
    spendingPhases,
    scheduledStress,
  } : null;

  return (
    <ThemeContext.Provider value={theme}>
    <div className="min-h-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink-800 border border-ink-700 grid place-items-center">
            <svg viewBox="0 0 64 64" className="w-6 h-6">
              <path d="M10 46 L22 30 L32 38 L44 18 L54 26" stroke="rgb(var(--c-cyan-400))" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="54" cy="26" r="4" fill="rgb(var(--c-cyan-400))"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Lifehub Portfolio</h1>
            <p className="text-xs text-slate-400">On-device survivability analysis · nothing leaves your browser</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          {portfolio && (
            <button
              className="text-xs text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
              onClick={() => { setPortfolio(null); setExtras([]); }}
            >
              start over
            </button>
          )}
        </div>
      </header>

      {!portfolio ? (
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <div className="rounded-xl bg-ink-900/40 border border-ink-800 p-5 space-y-3 flex flex-col">
            <div>
              <div className="font-medium">Upload Fidelity CSV</div>
              <p className="text-sm text-slate-400">Get an instant baseline from your real portfolio.</p>
            </div>
            <FileDrop onFile={handleFile} />
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-400">
              <li>Sign in to fidelity.com → Accounts → Portfolio</li>
              <li>Click the &ldquo;Download&rdquo; button (top right of positions table)</li>
              <li>Choose CSV. Drop it here.</li>
            </ol>
            <div className="text-xs text-slate-500">
              The file is parsed locally — it never leaves your device.
            </div>
          </div>

          <div className="rounded-xl bg-ink-900/40 border border-ink-800 p-5 space-y-3 flex flex-col">
            <div>
              <div className="font-medium">Build manually</div>
              <p className="text-sm text-slate-400">No CSV needed — type in your holdings by asset class and amount, and the same report runs.</p>
            </div>
            <ul className="text-xs text-slate-400 space-y-1 pl-1">
              <li>· Pick an asset class (US Stocks, Bonds, Gold, etc.)</li>
              <li>· Enter a dollar amount</li>
              <li>· Mark Taxable or Not taxable</li>
              <li>· Add as many rows as you want — same survivability, optimizer, stress, and cash-flow output</li>
            </ul>
            <div className="flex-1" />
            <button
              onClick={startManual}
              className="w-full px-3 py-2 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25"
            >
              Start manual entry →
            </button>
          </div>
        </div>
      ) : (
        <Dashboard
          holdings={mergedHoldings}
          allocation={allocation!}
          currentWeights={currentWeights!}
          baseInputs={baseInputs!}
          baselineSuccess={baselineSuccess}
          fileName={portfolio.fileName}
          loadedAt={portfolio.loadedAt}
          withdrawal={withdrawal} setWithdrawal={setWithdrawal}
          horizon={horizon} setHorizon={setHorizon}
          inflation={inflation} setInflation={setInflation}
          paths={paths} setPaths={setPaths}
          strategy={strategy} setStrategy={setStrategy}
          simulationModel={simulationModel} setSimulationModel={setSimulationModel}
          retirementTaxRate={retirementTaxRate} setRetirementTaxRate={setRetirementTaxRate}
          simResult={simResult} computing={computing}
          stress={stress}
          previewLabel={previewLabel}
          onPreview={onPreview}
          extras={extras} setExtras={setExtras}
          incomeStreams={incomeStreams} setIncomeStreams={setIncomeStreams}
          cashFlows={cashFlows} setCashFlows={setCashFlows}
          spendingPhases={spendingPhases} setSpendingPhases={setSpendingPhases}
          scheduledStress={scheduledStress} setScheduledStress={setScheduledStress}
          effectiveWeights={effectiveWeights}
          source={portfolio.source}
        />
      )}

      <footer className="mt-10 text-center text-xs text-slate-500">
        Capital-market assumptions are illustrative — edit <code className="text-slate-400">src/lib/cma.ts</code> to fit your views.
      </footer>
    </div>
    </ThemeContext.Provider>
  );
}

interface DashboardProps {
  holdings: Holding[];
  allocation: ReturnType<typeof computeAllocation>;
  currentWeights: Record<AssetClass, number>;
  baseInputs: Omit<SimInputs, "weights">;
  baselineSuccess: number | null;
  fileName: string;
  loadedAt: Date;
  withdrawal: number; setWithdrawal: (n: number) => void;
  horizon: number; setHorizon: (n: number) => void;
  inflation: number; setInflation: (n: number) => void;
  paths: number; setPaths: (n: number) => void;
  strategy: WithdrawalStrategy; setStrategy: (s: WithdrawalStrategy) => void;
  simulationModel: SimulationModel; setSimulationModel: (m: SimulationModel) => void;
  retirementTaxRate: number; setRetirementTaxRate: (n: number) => void;
  simResult: SimResult | null;
  computing: boolean;
  stress: ReturnType<typeof runStressScenarios>;
  previewLabel: string | null;
  onPreview: (w: Record<AssetClass, number> | null, label: string | null) => void;
  extras: ExtraAsset[];
  setExtras: (e: ExtraAsset[]) => void;
  incomeStreams: IncomeStream[];
  setIncomeStreams: (s: IncomeStream[]) => void;
  cashFlows: CashFlow[];
  setCashFlows: (f: CashFlow[]) => void;
  spendingPhases: SpendingPhases | undefined;
  setSpendingPhases: (s: SpendingPhases | undefined) => void;
  scheduledStress: ScheduledStress[];
  setScheduledStress: (s: ScheduledStress[]) => void;
  effectiveWeights: Record<AssetClass, number> | null;
  source: "csv" | "manual";
}

function Dashboard(p: DashboardProps) {
  const isManual = p.source === "manual";
  const hasMoney = p.allocation.total > 0;

  // The same ExtrasPanel handles both flows — only its position and copy change.
  const entryPanel = (
    <ExtrasPanel
      extras={p.extras}
      setExtras={p.setExtras}
      title={isManual ? "Your portfolio" : "Hypothetical / Extra Assets"}
      description={isManual
        ? "Add your assets one at a time. Pick a class, enter a dollar amount, mark Taxable or Not taxable, and click Add. Everything below recomputes."
        : undefined}
    />
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900/40 border border-ink-800 px-4 py-2 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <span>
          {isManual ? "Manual entry" : "Loaded"} <span className="text-slate-200">{p.fileName}</span>
          {" · "}{p.holdings.length} {p.holdings.length === 1 ? "position" : "positions"}
          {" · "}{fmtUSD(p.allocation.total)}
        </span>
        <span>{p.loadedAt.toLocaleString()}</span>
      </div>

      {isManual && entryPanel}

      {isManual && !hasMoney && (
        <div className="rounded-xl bg-ink-900/40 border border-ink-800 px-4 py-6 text-center text-sm text-slate-400">
          Add at least one asset above to generate the report.
        </div>
      )}

      {hasMoney && p.previewLabel && (
        <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/30 px-4 py-2 text-sm flex items-center justify-between flex-wrap gap-2">
          <span className="text-cyan-100">
            Previewing <span className="font-medium">{p.previewLabel}</span> — survivability/fan chart/stress reflect this alternative; allocation pie + holdings still show your current portfolio.
          </span>
          <button
            onClick={() => p.onPreview(null, null)}
            className="px-2 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-cyan-100 text-xs hover:bg-cyan-500/30"
          >
            Revert to current
          </button>
        </div>
      )}

      {hasMoney && (
      <div className="grid lg:grid-cols-[1fr_22rem] gap-4">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <SurvivabilityCard result={p.simResult} computing={p.computing} horizon={p.horizon} strategy={p.strategy} />
            <AllocationChart allocation={p.allocation} />
          </div>
          <FanChart result={p.simResult} horizon={p.horizon} scheduledStress={p.scheduledStress} />
          <SwrSolverPanel baseInputs={p.baseInputs} weights={p.effectiveWeights} currentWithdrawal={p.withdrawal} />
          <SequenceRiskPanel result={p.simResult} scheduledStress={p.scheduledStress} />
          <CashFlowTable result={p.simResult} />
          <IncomePanel streams={p.incomeStreams} setStreams={p.setIncomeStreams} horizonYears={p.horizon} />
          <LumpSumsPanel flows={p.cashFlows} setFlows={p.setCashFlows} horizonYears={p.horizon} />
          <ScheduledStressPanel events={p.scheduledStress} setEvents={p.setScheduledStress} horizonYears={p.horizon} />
          {!isManual && entryPanel}
          <TaxView allocation={p.allocation} retirementTaxRate={p.retirementTaxRate} />
          <OptimizerPanel
            currentWeights={p.currentWeights}
            baseInputs={p.baseInputs}
            baselineSuccess={p.baselineSuccess}
            onPreview={p.onPreview}
            previewing={p.previewLabel}
          />
          <StressTable results={p.stress} startingBalance={p.allocation.total} />
          <HoldingsTable holdings={p.holdings} total={p.allocation.total} />
        </div>
        <Controls
          withdrawal={p.withdrawal} setWithdrawal={p.setWithdrawal}
          horizon={p.horizon} setHorizon={p.setHorizon}
          inflation={p.inflation} setInflation={p.setInflation}
          paths={p.paths} setPaths={p.setPaths}
          total={p.allocation.total}
          strategy={p.strategy} setStrategy={p.setStrategy}
          simulationModel={p.simulationModel} setSimulationModel={p.setSimulationModel}
          retirementTaxRate={p.retirementTaxRate} setRetirementTaxRate={p.setRetirementTaxRate}
          spendingPhases={p.spendingPhases} setSpendingPhases={p.setSpendingPhases}
        />
      </div>
      )}
    </div>
  );
}
