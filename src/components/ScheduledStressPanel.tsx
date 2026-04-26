import { useState } from "react";
import type { ScheduledStress } from "../types";
import { SCENARIOS } from "../lib/stress";
import { fmtPct } from "../lib/format";

interface Props {
  events: ScheduledStress[];
  setEvents: (e: ScheduledStress[]) => void;
  horizonYears: number;
}

export function ScheduledStressPanel({ events, setEvents, horizonYears }: Props) {
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);
  const [year, setYear] = useState<string>("3");

  const add = () => {
    const s = SCENARIOS[scenarioIdx];
    if (!s) return;
    const yr = parseInt(year, 10);
    if (!isFinite(yr) || yr < 1 || yr > horizonYears) return;
    const id = Math.random().toString(36).slice(2, 10);
    setEvents([...events, { id, scenarioName: s.name, year: yr, shock: { ...s.shock } }]);
  };

  return (
    <div className="rounded-xl bg-ink-900/60 border border-ink-800 p-4">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="font-medium">Scheduled Stress Events</h3>
          <p className="text-xs text-slate-400">
            Force a known scenario to fire in a specific simulation year. The shocks compound into that year's returns inside every Monte Carlo path. The fan chart and survivability % will reflect it.
          </p>
        </div>
      </div>

      {events.length > 0 && (
        <ul className="mb-3 space-y-1">
          {[...events].sort((a, b) => a.year - b.year).map((e) => {
            // Show a representative shock for readability — pick USStock if present, else first non-zero.
            const repClass = e.shock.USStock != null ? "USStock" : Object.keys(e.shock)[0];
            const repValue = repClass ? e.shock[repClass as keyof typeof e.shock] : null;
            return (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-ink-800/40 border border-ink-800 px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-200 shrink-0 font-medium">{e.scenarioName}</span>
                  <span className="text-xs text-slate-400 shrink-0">in year {e.year}</span>
                  {repValue != null && (
                    <span className={`text-xs tabular-nums shrink-0 ${repValue < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                      ({repClass} {fmtPct(repValue, 0)})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setEvents(events.filter((x) => x.id !== e.id))}
                  className="text-slate-500 hover:text-rose-400 text-sm"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_5rem_auto] gap-2">
        <select
          value={scenarioIdx}
          onChange={(e) => setScenarioIdx(parseInt(e.target.value, 10))}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
          aria-label="Scenario"
        >
          {SCENARIOS.map((s, i) => (
            <option key={s.name} value={i}>{s.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={horizonYears}
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm tabular-nums"
          title="Simulation year (1 = first year)"
        />
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-sm hover:bg-cyan-500/25"
        >
          Schedule
        </button>
      </div>
    </div>
  );
}
