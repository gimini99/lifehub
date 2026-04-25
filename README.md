# Lifehub

A private, on-device portfolio analysis tool. Drop in your Fidelity export, see allocation, run Monte Carlo survivability, and stress-test against historical-style shocks. Installs as a PWA on phone or runs in any browser.

**Privacy:** all parsing and computation happens in your browser. Your portfolio data never leaves the device — no servers, no APIs, no analytics.

## Quick start

```bash
npm install
npm run dev          # local dev at http://localhost:5173
```

Open the URL, drop in `Portfolio_Positions_*.csv` from Fidelity (Accounts → Portfolio → Download → CSV).

## Features

- **CSV import** — Fidelity's portfolio export, including 401k commingled trusts and money-market sweeps.
- **Asset classification** — symbols + descriptions are auto-tagged into US/intl equity, bonds (short / aggregate / HY), gold, sector/thematic, cash.
- **Survivability simulation** — annual-step Monte Carlo with correlated returns (Cholesky on a correlation matrix) and inflation-indexed withdrawals. Runs in a Web Worker.
- **Live controls** — adjust withdrawal, horizon, inflation, and path count; the chart re-renders.
- **Stress scenarios** — 2008 GFC, 1973-74 stagflation, lost decade, 1987, COVID-19. Applied as one-shot returns to your current allocation.
- **PWA** — “Add to Home Screen” on iOS/Android for an app-like launcher.

## Project layout

```
src/
  App.tsx                main shell + dashboard wiring
  types.ts               Holding / SimInputs / SimResult
  lib/
    parseCsv.ts          Fidelity CSV → Holding[]
    classify.ts          symbol/description → AssetClass
    cma.ts               capital-market assumptions (mu, sigma, correlations)
    monteCarlo.ts        sim engine
    stress.ts            preset historical shock scenarios
    format.ts            $ / % helpers, class labels, colors
  workers/
    sim.worker.ts        runs runMonteCarlo() off the main thread
  components/            UI (FileDrop, AllocationChart, FanChart, …)
public/
  icon.svg, icon-maskable.svg, favicon.svg
scripts/
  verify-parser.mjs      node-only sanity check against a real CSV
```

## Tuning the model

Capital-market assumptions live in [`src/lib/cma.ts`](src/lib/cma.ts). Edit the `mu` (expected annual return) and `sigma` (annual volatility) per asset class to match your views, and adjust the correlation matrix below it.

Stress scenarios live in [`src/lib/stress.ts`](src/lib/stress.ts) — add or modify entries to model your own tail risks.

The current asset-class taxonomy and classifier rules are in [`src/lib/classify.ts`](src/lib/classify.ts). If a holding gets misclassified, add the symbol to the appropriate set or extend the description hints.

## Deploying

Static build:

```bash
npm run build        # → dist/
npm run preview      # serve dist locally
```

`dist/` contains a fully self-contained static site. Drop it on GitHub Pages, Cloudflare Pages, Netlify, or any static host. The PWA service worker is pre-generated.

### Install on your phone

1. Deploy and open the URL in mobile Safari (iOS) or Chrome (Android).
2. iOS: Share → Add to Home Screen. Android: ⋮ menu → Install app.
3. Launches like a native app, works offline after first load.

## Privacy & safety

- The CSV file is read with `FileReader` in your browser. It is never sent over the network.
- The repo's `.gitignore` excludes `Portfolio_Positions_*.csv` and `*.portfolio.csv` — keep your real exports out of commits.
- This tool is for personal use and does not constitute financial advice. Capital-market assumptions are illustrative; tune them to your own views.

## Verifying the parser locally

If you want to sanity-check parsing without booting the UI:

```bash
node scripts/verify-parser.mjs Portfolio_Positions_*.csv
```

It prints positions, totals by asset class, and per-holding classification.
