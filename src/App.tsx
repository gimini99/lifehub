import { useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "./components/FileDrop";
import { HoldingsTable } from "./components/HoldingsTable";
import { AllocationChart } from "./components/AllocationChart";
import { Controls } from "./components/Controls";
import { SurvivabilityCard } from "./components/SurvivabilityCard";
import { FanChart } from "./components/FanChart";
import { StressTable } from "./components/StressTable";
import { parseFidelityCsv, computeAllocation, classWeights } from "./lib/parseCsv";
import { runStressScenarios } from "./lib/stress";
import type { Holding, SimInputs, SimResult } from "./types";
import { fmtUSD } from "./lib/format";

interface PortfolioState { holdings: Holding[]; fileName: string; loadedAt: Date; }

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [withdrawal, setWithdrawal] = useState(80_000);
  const [horizon, setHorizon] = useState(30);
  const [inflation, setInflation] = useState(0.025);
  const [paths, setPaths] = useState(4000);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL("./workers/sim.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<{ id: number; result?: SimResult; error?: string }>) => {
      if (e.data.id !== reqIdRef.current) return;
      if (e.data.error) console.error(e.data.error);
      if (e.data.result) setSimResult(e.data.result);
      setComputing(false);
    };
    return () => w.terminate();
  }, []);

  const allocation = useMemo(() => portfolio ? computeAllocation(portfolio.holdings) : null, [portfolio]);
  const weights = useMemo(() => allocation ? classWeights(allocation) : null, [allocation]);
  const stress = useMemo(
    () => allocation && weights ? runStressScenarios(allocation.total, weights) : [],
    [allocation, weights]
  );

  useEffect(() => {
    if (!allocation || !weights || !workerRef.current) return;
    setComputing(true);
    reqIdRef.current += 1;
    const input: SimInputs = {
      startingBalance: allocation.total,
      weights,
      annualWithdrawal: withdrawal,
      inflation,
      horizonYears: horizon,
      paths,
    };
    workerRef.current.postMessage({ id: reqIdRef.current, input });
  }, [allocation, weights, withdrawal, inflation, horizon, paths]);

  const handleFile = (text: string, fileName: string) => {
    try {
      const holdings = parseFidelityCsv(text);
      if (holdings.length === 0) {
        alert("No holdings found in this file. Is it a Fidelity portfolio export?");
        return;
      }
      setPortfolio({ holdings, fileName, loadedAt: new Date() });
    } catch (e) {
      alert(`Failed to parse: ${e}`);
    }
  };

  return (
    <div className="min-h-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink-800 border border-ink-700 grid place-items-center">
            <svg viewBox="0 0 64 64" className="w-6 h-6">
              <path d="M10 46 L22 30 L32 38 L44 18 L54 26" stroke="#22d3ee" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="54" cy="26" r="4" fill="#22d3ee"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Lifehub Portfolio</h1>
            <p className="text-xs text-slate-400">On-device survivability analysis · nothing leaves your browser</p>
          </div>
        </div>
        {portfolio && (
          <button
            className="text-xs text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
            onClick={() => setPortfolio(null)}
          >
            load different file
          </button>
        )}
      </header>

      {!portfolio ? (
        <div className="grid sm:grid-cols-[1fr_minmax(0,28rem)_1fr] gap-4">
          <div />
          <div className="space-y-4">
            <FileDrop onFile={handleFile} />
            <div className="rounded-xl bg-ink-900/40 border border-ink-800 p-4 text-sm text-slate-300">
              <div className="font-medium mb-1">How to get the file</div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>Sign in to fidelity.com → Accounts → Portfolio</li>
                <li>Click the “Download” button (top right of positions table)</li>
                <li>Choose CSV. Drop it here.</li>
              </ol>
              <div className="mt-3 text-xs text-slate-500">
                The file is parsed locally — it never leaves your device.
              </div>
            </div>
          </div>
          <div />
        </div>
      ) : (
        <Dashboard
          holdings={portfolio.holdings}
          allocation={allocation!}
          fileName={portfolio.fileName}
          loadedAt={portfolio.loadedAt}
          withdrawal={withdrawal} setWithdrawal={setWithdrawal}
          horizon={horizon} setHorizon={setHorizon}
          inflation={inflation} setInflation={setInflation}
          paths={paths} setPaths={setPaths}
          simResult={simResult} computing={computing}
          stress={stress}
        />
      )}

      <footer className="mt-10 text-center text-xs text-slate-500">
        Capital-market assumptions are illustrative — edit <code className="text-slate-400">src/lib/cma.ts</code> to fit your views.
      </footer>
    </div>
  );
}

interface DashboardProps {
  holdings: Holding[];
  allocation: ReturnType<typeof computeAllocation>;
  fileName: string;
  loadedAt: Date;
  withdrawal: number; setWithdrawal: (n: number) => void;
  horizon: number; setHorizon: (n: number) => void;
  inflation: number; setInflation: (n: number) => void;
  paths: number; setPaths: (n: number) => void;
  simResult: SimResult | null;
  computing: boolean;
  stress: ReturnType<typeof runStressScenarios>;
}

function Dashboard(p: DashboardProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900/40 border border-ink-800 px-4 py-2 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <span>Loaded <span className="text-slate-200">{p.fileName}</span> · {p.holdings.length} positions · {fmtUSD(p.allocation.total)}</span>
        <span>{p.loadedAt.toLocaleString()}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-4">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <SurvivabilityCard result={p.simResult} computing={p.computing} horizon={p.horizon} />
            <AllocationChart allocation={p.allocation} />
          </div>
          <FanChart result={p.simResult} horizon={p.horizon} />
          <StressTable results={p.stress} startingBalance={p.allocation.total} />
          <HoldingsTable holdings={p.holdings} total={p.allocation.total} />
        </div>
        <Controls
          withdrawal={p.withdrawal} setWithdrawal={p.setWithdrawal}
          horizon={p.horizon} setHorizon={p.setHorizon}
          inflation={p.inflation} setInflation={p.setInflation}
          paths={p.paths} setPaths={p.setPaths}
          total={p.allocation.total}
        />
      </div>
    </div>
  );
}
