import { useEffect, useMemo, useRef, useState } from "react";
import type { AssetClass, SimInputs } from "../types";
import type { Candidate, OptResult } from "../lib/optimize";
import { weightDistance } from "../lib/optimize";
import { AllocationCompareChart } from "./AllocationCompareChart";
import { fmtPct, fmtUSD } from "../lib/format";

interface Props {
  currentWeights: Record<AssetClass, number>;
  baseInputs: Omit<SimInputs, "weights">;
  baselineSuccess: number | null;
  onPreview: (weights: Record<AssetClass, number> | null, label: string | null) => void;
  previewing: string | null;
}

export function OptimizerPanel(props: Props) {
  const { currentWeights, baseInputs, baselineSuccess, onPreview, previewing } = props;
  const [results, setResults] = useState<OptResult[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../workers/opt.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<{ id: number; results?: OptResult[]; progress?: { done: number; total: number }; error?: string }>) => {
      if (e.data.id !== reqIdRef.current) return;
      if (e.data.progress) {
        setProgress(e.data.progress);
        // Got a heartbeat — clear the watchdog.
        if (watchdogRef.current) { window.clearTimeout(watchdogRef.current); watchdogRef.current = null; }
        return;
      }
      if (e.data.error) {
        console.error("[optimizer worker]", e.data.error);
        setWorkerError(e.data.error);
        setRunning(false);
        return;
      }
      if (e.data.results) {
        setResults(e.data.results);
        setRunning(false);
        setProgress(null);
        if (watchdogRef.current) { window.clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      }
    };
    w.onerror = (event) => {
      const msg = event.message || "Worker failed to load (often a stale service-worker cache — try a hard refresh: Ctrl+Shift+R / Cmd+Shift+R).";
      console.error("[optimizer worker error]", event);
      setWorkerError(msg);
      setRunning(false);
    };
    w.onmessageerror = (event) => {
      console.error("[optimizer message error]", event);
      setWorkerError("Worker message could not be deserialized.");
      setRunning(false);
    };
    return () => {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      w.terminate();
    };
  }, []);

  // Re-run invalidates results (since assumptions changed underneath them).
  useEffect(() => { setResults(null); setSelected(null); }, [
    baseInputs.startingBalance, baseInputs.annualWithdrawal,
    baseInputs.horizonYears, baseInputs.inflation,
  ]);

  const run = () => {
    if (!workerRef.current) return;
    setWorkerError(null);
    setRunning(true);
    setResults(null);
    setSelected(null);
    setProgress({ done: 0, total: 1 });
    reqIdRef.current += 1;
    workerRef.current.postMessage({
      id: reqIdRef.current,
      current: currentWeights,
      base: baseInputs,
      paths: 800,
      randomCount: 30,
      perturbCount: 20,
      seed: 7,
    });
    // Watchdog: if we don't hear from the worker within 8s, assume it's stuck and surface a helpful message.
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    watchdogRef.current = window.setTimeout(() => {
      setWorkerError(
        "Optimizer worker isn't responding. This is almost always a stale service-worker cache. " +
        "Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) or close the tab and reopen.",
      );
      setRunning(false);
    }, 8000);
  };

  const top = useMemo(() => results?.slice(0, 12) ?? [], [results]);

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div>
          <h3 className="font-medium">Suggested Allocations</h3>
          <p className="text-xs text-slate-400">
            Generates ~60 candidates and ranks them by survivability under your current plan.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="px-3 py-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {running ? `Running… ${progress ? `${progress.done}/${progress.total}` : ""}` : results ? "Re-run" : "Find better allocations"}
        </button>
      </div>

      {workerError && (
        <div className="mb-3 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {workerError}
        </div>
      )}

      {!results && !running && !workerError && (
        <p className="text-sm text-slate-500 italic">Click the button to evaluate alternatives against your current plan.</p>
      )}

      {results && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="py-1 pr-2"></th>
                  <th className="py-1 pr-2">Allocation</th>
                  <th className="py-1 pr-2 text-right">Success</th>
                  <th className="py-1 pr-2 text-right">vs current</th>
                  <th className="py-1 pr-2 text-right">Median ending</th>
                  <th className="py-1 pr-2 text-right">Turnover</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r) => {
                  const isCurrent = r.candidate.source === "current";
                  const dvs = baselineSuccess != null ? r.successProbability - baselineSuccess : null;
                  const dist = weightDistance(currentWeights, r.candidate.weights) / 2;
                  const isPreview = previewing === r.candidate.name;
                  return (
                    <tr
                      key={r.candidate.name}
                      onClick={() => {
                        setSelected(r.candidate);
                        if (isPreview) {
                          onPreview(null, null);
                        } else if (!isCurrent) {
                          onPreview(r.candidate.weights, r.candidate.name);
                        }
                      }}
                      className={[
                        "border-t border-ink-800 cursor-pointer hover:bg-ink-800/40",
                        isCurrent ? "text-slate-300" : "",
                        isPreview ? "bg-cyan-500/10" : "",
                      ].join(" ")}
                    >
                      <td className="py-1 pr-2 text-slate-500 tabular-nums">{isCurrent ? "·" : "↗"}</td>
                      <td className="py-1 pr-2">
                        <span className="font-medium text-slate-100">{r.candidate.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{r.candidate.source}</span>
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums font-medium">{fmtPct(r.successProbability, 1)}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">
                        {dvs == null ? "—" : (
                          <span className={dvs > 0 ? "text-emerald-400" : dvs < 0 ? "text-rose-400" : "text-slate-400"}>
                            {dvs > 0 ? "+" : ""}{(dvs * 100).toFixed(1)} pp
                          </span>
                        )}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums text-slate-300">{fmtUSD(r.medianEnding, { compact: true })}</td>
                      <td className="py-1 pr-2 text-right tabular-nums text-slate-400">{isCurrent ? "—" : fmtPct(dist, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Click any non-current row to preview that allocation across the dashboard. Click again to revert.
          </p>
          {selected && (
            <div className="mt-4 border-t border-ink-800 pt-3">
              <div className="text-sm font-medium mb-1">{selected.name} — weight comparison</div>
              <AllocationCompareChart current={currentWeights} proposed={selected.weights} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
