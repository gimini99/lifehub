/// <reference lib="webworker" />
import type { AssetClass, SimInputs } from "../types";
import { generateCandidates, evaluateCandidates } from "../lib/optimize";

interface Req {
  id: number;
  current: Record<AssetClass, number>;
  base: Omit<SimInputs, "weights">;
  paths?: number;
  randomCount?: number;
  perturbCount?: number;
  seed?: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, current, base, paths, randomCount, perturbCount, seed } = e.data;
  try {
    const candidates = generateCandidates(current, { randomCount, perturbCount, seed });
    const total = candidates.length;
    const results = evaluateCandidates(candidates, base, paths ?? 800, (done) => {
      (self as unknown as Worker).postMessage({ id, progress: { done, total } });
    });
    (self as unknown as Worker).postMessage({ id, results });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
