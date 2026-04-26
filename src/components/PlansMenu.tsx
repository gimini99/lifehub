import { useEffect, useRef, useState } from "react";
import type { Plan, SavedPlan } from "../types";
import { deletePlan, downloadPlan, listPlans, parseImportedPlan, savePlan } from "../lib/planIO";

interface Props {
  /** Returns the current state as a serializable Plan, or null if there's nothing to save (no portfolio loaded yet). */
  getPlan: () => Plan | null;
  /** Called when the user picks a plan to load — receives the migrated Plan. */
  onLoad: (plan: Plan) => void;
}

export function PlansMenu({ getPlan, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [saveName, setSaveName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = () => setPlans(listPlans().sort((a, b) => b.savedAt.localeCompare(a.savedAt)));

  useEffect(() => { if (open) refresh(); }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const flashFor = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 2000); };

  const onSaveCurrent = () => {
    setError(null);
    const plan = getPlan();
    if (!plan) { setError("Nothing to save — load a portfolio first."); return; }
    const saved = savePlan(saveName, plan);
    setSaveName("");
    refresh();
    flashFor(`Saved "${saved.name}".`);
  };

  const onLoadClick = (saved: SavedPlan) => {
    onLoad(saved.plan);
    setOpen(false);
    flashFor(`Loaded "${saved.name}".`);
  };

  const onDelete = (saved: SavedPlan) => {
    if (!confirm(`Delete plan "${saved.name}"? This can't be undone.`)) return;
    deletePlan(saved.id);
    refresh();
  };

  const onExport = (saved: SavedPlan) => downloadPlan(saved);

  const onImportFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedPlan(String(reader.result ?? ""));
        // Save it under its embedded name so it joins the library, then load it.
        const stored = savePlan(imported.name, imported.plan);
        refresh();
        onLoad(stored.plan);
        setOpen(false);
        flashFor(`Imported "${stored.name}".`);
      } catch (e) {
        setError(`Import failed: ${(e as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "px-2 py-1 rounded-md border text-xs flex items-center gap-1.5 transition",
          open
            ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-100"
            : "bg-ink-800/40 border-ink-700 text-slate-400 hover:text-slate-200",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span aria-hidden>≣</span>
        <span>Plans</span>
        {plans.length > 0 && <span className="text-slate-500 tabular-nums">{plans.length}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 shadow-xl z-30 p-3 space-y-3 text-sm"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Save current</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Plan name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSaveCurrent()}
                className="flex-1 bg-ink-800/60 border border-ink-700 rounded-md px-2 py-1.5 text-sm"
              />
              <button
                onClick={onSaveCurrent}
                className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs hover:bg-cyan-500/25"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Saves to this device's localStorage. Same name overwrites.</p>
          </div>

          <div className="border-t border-ink-800 pt-3">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Saved plans</div>
            {plans.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No saved plans yet.</p>
            ) : (
              <ul className="space-y-1">
                {plans.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-ink-800/40 border border-ink-800 px-2 py-1.5">
                    <button
                      onClick={() => onLoadClick(s)}
                      className="flex-1 text-left min-w-0 hover:text-cyan-200"
                      title={`Saved ${new Date(s.savedAt).toLocaleString()}`}
                    >
                      <div className="text-slate-200 truncate">{s.name}</div>
                      <div className="text-xs text-slate-500">{new Date(s.savedAt).toLocaleString()}</div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onExport(s)}
                        className="text-xs text-slate-400 hover:text-cyan-200 px-1"
                        title="Export to JSON file"
                      >
                        ⤓
                      </button>
                      <button
                        onClick={() => onDelete(s)}
                        className="text-xs text-slate-500 hover:text-rose-400 px-1"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-ink-800 pt-3">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Import from file</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-2.5 py-1.5 rounded-md bg-ink-800/60 border border-ink-700 text-slate-300 text-xs hover:bg-ink-800"
            >
              Choose JSON file…
            </button>
          </div>

          {error && <div className="text-xs text-rose-300 border border-rose-400/30 bg-rose-500/10 rounded-md px-2 py-1.5">{error}</div>}
          {flash && <div className="text-xs text-emerald-300 border border-emerald-400/30 bg-emerald-500/10 rounded-md px-2 py-1.5">{flash}</div>}
        </div>
      )}
    </div>
  );
}
