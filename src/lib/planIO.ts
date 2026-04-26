import type { Plan, SavedPlan } from "../types";

const STORAGE_KEY = "lifehub.plans";
const PLAN_VERSION = 1 as const;

/** Read all saved plans from localStorage. Returns empty array if none/corrupt. */
export function listPlans(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedPlan);
  } catch {
    return [];
  }
}

/** Persist the full library back to localStorage. */
function writePlans(plans: SavedPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

/** Save a plan under the given name. Replaces any plan with the same name; otherwise appends. */
export function savePlan(name: string, plan: Plan): SavedPlan {
  const trimmedName = name.trim() || `Plan ${new Date().toLocaleString()}`;
  const all = listPlans();
  const existingIdx = all.findIndex((p) => p.name === trimmedName);
  const saved: SavedPlan = {
    id: existingIdx >= 0 ? all[existingIdx].id : Math.random().toString(36).slice(2, 12),
    name: trimmedName,
    savedAt: new Date().toISOString(),
    plan: { ...plan, version: PLAN_VERSION },
  };
  if (existingIdx >= 0) all[existingIdx] = saved;
  else all.push(saved);
  writePlans(all);
  return saved;
}

export function deletePlan(id: string): void {
  writePlans(listPlans().filter((p) => p.id !== id));
}

export function getPlan(id: string): SavedPlan | undefined {
  return listPlans().find((p) => p.id === id);
}

/**
 * Migrate a plan from any older version to the current one. The version field exists
 * so future schema changes can be handled cleanly without breaking saved files.
 * Today there's only v1, so this is a passthrough — but the structure is in place.
 */
export function migratePlan(plan: Plan): Plan {
  // future: switch on plan.version and apply migrations in order
  return { ...plan, version: PLAN_VERSION };
}

export function exportPlanAsBlob(saved: SavedPlan): Blob {
  return new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
}

export function downloadPlan(saved: SavedPlan): void {
  const blob = exportPlanAsBlob(saved);
  const url = URL.createObjectURL(blob);
  const safeName = saved.name.replace(/[^\w\-]+/g, "_").slice(0, 60);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lifehub-plan-${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse JSON text → SavedPlan (after migration). Throws on invalid input. */
export function parseImportedPlan(text: string): SavedPlan {
  const parsed = JSON.parse(text);
  if (!isSavedPlan(parsed)) throw new Error("Not a valid lifehub plan file.");
  return { ...parsed, plan: migratePlan(parsed.plan) };
}

function isSavedPlan(v: unknown): v is SavedPlan {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.savedAt === "string" &&
    !!o.plan && typeof o.plan === "object" &&
    typeof (o.plan as Record<string, unknown>).version === "number"
  );
}
