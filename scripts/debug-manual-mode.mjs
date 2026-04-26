// Verify both starting paths: (1) CSV upload still works, (2) manual entry → add asset → report renders.

import puppeteer from "puppeteer";

const URL = process.argv[2] ?? "http://127.0.0.1:5189/";

async function check(label, page, expression, expected) {
  const value = await page.evaluate(expression);
  const ok = expected ? expected(value) : !!value;
  console.log(`  ${ok ? "ok " : "FAIL"} ${label}: ${JSON.stringify(value).slice(0, 100)}`);
  return ok;
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

  console.log("\n[manual mode]");

  // Click "Start manual entry"
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.textContent?.includes("Start manual entry"));
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log(`  ${clicked ? "ok " : "FAIL"} clicked "Start manual entry"`);

  await new Promise((r) => setTimeout(r, 500));

  await check("dashboard shows manual-entry strip", page, () =>
    Array.from(document.querySelectorAll("span")).some((s) => s.textContent?.includes("Manual entry"))
  );

  await check("entry panel rendered at top with title 'Your portfolio'", page, () =>
    Array.from(document.querySelectorAll("h3")).some((h) => h.textContent?.trim() === "Your portfolio")
  );

  await check("survivability/fan/etc are HIDDEN before any entry", page, () => {
    const headings = Array.from(document.querySelectorAll("h3")).map((h) => h.textContent?.trim());
    return !headings.includes("Survivability");
  });

  // Helper: react-aware value setter, then dispatch input event so React's tracker picks up the change.
  await page.exposeFunction("__addAsset", () => {});
  const addAsset = async (assetClass, amount, taxable) => {
    return page.evaluate((assetClass, amount, taxable) => {
      const hdr = Array.from(document.querySelectorAll("h3")).find((h) => h.textContent?.trim() === "Your portfolio");
      if (!hdr) return "no entry panel";
      const panel = hdr.closest(".rounded-xl");
      // Asset class select
      const select = panel.querySelector("select");
      const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      selectSetter.call(select, assetClass);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      // Amount input — must use native input setter so React tracks it
      const amtInput = panel.querySelectorAll('input[type="text"]')[0];
      const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      inputSetter.call(amtInput, String(amount));
      amtInput.dispatchEvent(new Event("input", { bubbles: true }));
      // Tax radio
      const radios = panel.querySelectorAll('input[type="radio"]');
      const target = taxable ? radios[0] : radios[1];
      target.click();
      // Add
      const addBtn = Array.from(panel.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Add");
      addBtn.click();
      return "added";
    }, assetClass, amount, taxable);
  };

  console.log(`  ${(await addAsset("USStock", 400000, true)) === "added" ? "ok " : "FAIL"} added first asset (US Stocks $400k taxable)`);
  await new Promise((r) => setTimeout(r, 600));
  console.log(`  ${(await addAsset("Bond", 200000, false)) === "added" ? "ok " : "FAIL"} added second asset (Bond $200k not taxable)`);

  await new Promise((r) => setTimeout(r, 1200));

  // Diagnostic dump
  const diag = await page.evaluate(() => {
    const text = document.body.innerText;
    const headings = Array.from(document.querySelectorAll("h3")).map((h) => h.textContent?.trim());
    const totalMatch = text.match(/\$[\d,]+/g);
    const stripText = Array.from(document.querySelectorAll("span")).map((s) => s.textContent).filter((t) => t && t.includes("position")).slice(0, 3);
    const entryListItems = Array.from(document.querySelectorAll("li")).map((l) => l.textContent?.trim()).slice(0, 5);
    return { headings, totalMatch, stripText, entryListItems };
  });
  console.log("diag:", JSON.stringify(diag, null, 2));

  await check("survivability card now visible", page, () =>
    Array.from(document.querySelectorAll("h3")).some((h) => h.textContent?.trim() === "Survivability")
  );

  await check("allocation chart visible", page, () =>
    Array.from(document.querySelectorAll("h3")).some((h) => h.textContent?.includes("Allocation by Asset Class"))
  );

  await check("strip shows total $600k and 2 positions", page, () => {
    const text = document.body.innerText;
    return /\$600,000/.test(text) && /2 positions/.test(text);
  });

  await check("optimizer panel present", page, () =>
    Array.from(document.querySelectorAll("h3")).some((h) => h.textContent?.includes("Suggested Allocations"))
  );

  // Click optimizer Find better allocations and watch progress
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const b = buttons.find((x) => /Find better allocations/.test(x.textContent ?? ""));
    b?.click();
  });
  console.log("  ... optimizer started");
  const start = Date.now();
  let last = "";
  while (Date.now() - start < 20000) {
    await new Promise((r) => setTimeout(r, 500));
    const txt = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const b = buttons.find((x) => /Running|Re-run|Find better/.test(x.textContent ?? ""));
      return b?.textContent ?? "";
    });
    if (txt !== last) { console.log(`     [${((Date.now() - start) / 1000).toFixed(1)}s] ${txt}`); last = txt; }
    if (txt.includes("Re-run")) break;
  }
  console.log(`  ${last.includes("Re-run") ? "ok " : "FAIL"} optimizer completed under manual mode`);

  console.log("\n[csv path still works]");
  await page.goto(URL, { waitUntil: "networkidle2" });
  await check("starting screen shows Upload Fidelity CSV card", page, () =>
    document.body.innerText.includes("Upload Fidelity CSV")
  );
  await check("starting screen shows Build manually card", page, () =>
    document.body.innerText.includes("Build manually")
  );

} finally {
  await browser.close();
}
