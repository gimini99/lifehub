// Drive the live app in a headless browser, load test.csv, add an income stream,
// click Find better allocations, and capture worker errors / progress.

import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] ?? "http://127.0.0.1:5189/";
const CSV_PATH = resolve(__dirname, "..", "test.csv");

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));
  page.on("workererror", (err) => console.log("[workererror]", err.message));

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
  console.log("loaded:", await page.title());

  // Upload the CSV via the hidden file input.
  const csvText = readFileSync(CSV_PATH, "utf8");
  console.log(`csv size: ${csvText.length} bytes`);
  const fileInputs = await page.$$('input[type="file"]');
  console.log("file inputs:", fileInputs.length);
  if (fileInputs.length === 0) throw new Error("no file input found on page");
  await fileInputs[0].uploadFile(CSV_PATH);

  await new Promise((r) => setTimeout(r, 1500));
  console.log("after upload, looking for optimizer button");

  // Add an income stream first to hit the failing case.
  // Find the Income panel's Amount input and Add button.
  const addIncome = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("h3"));
    const incomeHdr = labels.find((h) => h.textContent?.includes("Income Streams"));
    if (!incomeHdr) return "no Income Streams header";
    const panel = incomeHdr.closest(".rounded-xl");
    if (!panel) return "no panel";
    const inputs = panel.querySelectorAll("input");
    if (inputs.length < 4) return `only ${inputs.length} inputs`;
    // Order in JSX: Label, Amount, Start yr, End yr, then a checkbox. We modify amount + start.
    inputs[1].focus(); inputs[1].value = "42000";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[2].focus(); inputs[2].value = "5";
    inputs[2].dispatchEvent(new Event("input", { bubbles: true }));
    const buttons = Array.from(panel.querySelectorAll("button"));
    const addBtn = buttons.find((b) => b.textContent?.trim() === "Add");
    if (!addBtn) return "no Add button";
    addBtn.click();
    return "added income stream";
  });
  console.log("income setup:", addIncome);

  await new Promise((r) => setTimeout(r, 800));

  // Also add an extra asset to mimic the user's setup more closely.
  const addExtra = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("h3"));
    const hdr = labels.find((h) => h.textContent?.includes("Hypothetical / Extra Assets"));
    if (!hdr) return "no extras header";
    const panel = hdr.closest(".rounded-xl");
    if (!panel) return "no panel";
    const selects = panel.querySelectorAll("select");
    const inputs = panel.querySelectorAll('input[type="text"]');
    if (selects.length < 2 || inputs.length < 2) return `only ${selects.length} selects / ${inputs.length} text inputs`;
    selects[0].value = "IntlEmerging";
    selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    inputs[0].focus(); inputs[0].value = "500000";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    const buttons = Array.from(panel.querySelectorAll("button"));
    const addBtn = buttons.find((b) => b.textContent?.trim() === "Add");
    addBtn?.click();
    return "added extra asset";
  });
  console.log("extra setup:", addExtra);
  await new Promise((r) => setTimeout(r, 800));

  // Click "Find better allocations"
  const optBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => /Find better allocations|Re-run/.test(b.textContent ?? ""));
    if (!btn) return null;
    btn.click();
    return btn.textContent;
  });
  console.log("clicked optimizer button:", optBtn);

  // Watch progress for up to 30 seconds.
  const start = Date.now();
  let lastSeen = "";
  while (Date.now() - start < 30000) {
    await new Promise((r) => setTimeout(r, 500));
    const txt = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => /Running|Re-run|Find better allocations/.test(b.textContent ?? ""));
      return btn?.textContent ?? "";
    });
    if (txt !== lastSeen) {
      console.log(`[${((Date.now() - start) / 1000).toFixed(1)}s] btn:`, txt);
      lastSeen = txt;
    }
    if (txt.includes("Re-run")) {
      console.log("optimizer completed!");
      break;
    }
  }

  if (lastSeen.includes("Running")) {
    console.log("STILL RUNNING after 30s — bug confirmed");
  }
} finally {
  await browser.close();
}
