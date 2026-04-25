/// <reference lib="webworker" />
import { runMonteCarlo } from "../lib/monteCarlo";
import type { SimInputs, SimResult } from "../types";

type Req = { id: number; input: SimInputs };
type Res = { id: number; result: SimResult } | { id: number; error: string };

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, input } = e.data;
  try {
    const result = runMonteCarlo(input);
    (self as unknown as Worker).postMessage({ id, result } satisfies Res);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) } satisfies Res);
  }
};
