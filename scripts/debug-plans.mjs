// Verify the save/load plan round-trip in the browser:
//   1. Configure a non-default plan (manual entry → 2 assets, change horizon, add an income stream).
//   2. Save it.
//   3. Reload the page.
//   4. Open Plans menu, click the saved plan.
//   5. Confirm the inputs and dashboard match.

import puppeteer from "puppeteer";

const URL = process.argv[2] ?? "http://127.0.0.1:5189/";

const reactSet = (el, value) => {
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, String(value));
  el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
};

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));

  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });

  // Clear localStorage to start fresh.
  await page.evaluate(() => localStorage.removeItem("lifehub.plans"));

  // 1. Manual mode + add 2 assets.
  await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Start manual entry"))?.click());
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate((reactSetSrc) => {
    const reactSet = new Function("el", "value", reactSetSrc);
    const hdr = Array.from(document.querySelectorAll("h3")).find((h) => h.textContent?.trim() === "Your portfolio");
    const panel = hdr.closest(".rounded-xl");
    const select = panel.querySelector("select");
    reactSet(select, "USStock");
    reactSet(panel.querySelectorAll('input[type="text"]')[0], "750000");
    panel.querySelectorAll('input[type="radio"]')[0].click();
    Array.from(panel.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Add").click();
  }, `
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  `);
  await new Promise((r) => setTimeout(r, 300));

  await page.evaluate((reactSetSrc) => {
    const reactSet = new Function("el", "value", reactSetSrc);
    const hdr = Array.from(document.querySelectorAll("h3")).find((h) => h.textContent?.trim() === "Your portfolio");
    const panel = hdr.closest(".rounded-xl");
    const select = panel.querySelector("select");
    reactSet(select, "Bond");
    reactSet(panel.querySelectorAll('input[type="text"]')[0], "250000");
    panel.querySelectorAll('input[type="radio"]')[1].click();
    Array.from(panel.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Add").click();
  }, `
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  `);
  await new Promise((r) => setTimeout(r, 800));

  // 2. Add an income stream (Social Security $42k starting year 5).
  await page.evaluate((reactSetSrc) => {
    const reactSet = new Function("el", "value", reactSetSrc);
    const hdr = Array.from(document.querySelectorAll("h3")).find((h) => h.textContent?.trim() === "Income Streams");
    const panel = hdr.closest(".rounded-xl");
    const inputs = panel.querySelectorAll("input");
    reactSet(inputs[0], "Social Security");
    reactSet(inputs[1], "42000");
    reactSet(inputs[2], "5");
    Array.from(panel.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Add").click();
  }, `
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  `);
  await new Promise((r) => setTimeout(r, 400));

  const before = await page.evaluate(() => ({
    bodyHasMillion: document.body.innerText.includes("$1,000,000"),
    seesSS: document.body.innerText.includes("Social Security"),
    listed: Array.from(document.querySelectorAll("h3")).some((h) => h.textContent?.includes("Survivability")),
  }));
  console.log("before save:", before);

  // 3. Open Plans menu and save.
  await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim().startsWith("≣"))?.click());
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate((reactSetSrc) => {
    const reactSet = new Function("el", "value", reactSetSrc);
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    const planNameInput = inputs.find((i) => i.placeholder === "Plan name");
    reactSet(planNameInput, "Roundtrip Test");
    Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Save").click();
  }, `
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  `);
  await new Promise((r) => setTimeout(r, 300));

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("lifehub.plans");
    if (!raw) return null;
    const plans = JSON.parse(raw);
    return plans.map((p) => ({
      name: p.name,
      version: p.plan.version,
      source: p.plan.source,
      holdings: p.plan.holdings.length,
      extras: p.plan.extras.length,
      incomeStreams: p.plan.incomeStreams.length,
      strategy: p.plan.strategy?.kind,
    }));
  });
  console.log("stored:", stored);

  // 4. Reload page, then load the saved plan.
  await page.reload({ waitUntil: "networkidle2" });
  console.log("post-reload — should be back to the starting screen");
  const fresh = await page.evaluate(() => ({
    onStartScreen: document.body.innerText.includes("Start manual entry"),
    seesSS: document.body.innerText.includes("Social Security"),
  }));
  console.log("post-reload:", fresh);

  // Open Plans menu and click the saved entry.
  await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim().startsWith("≣"))?.click());
  await new Promise((r) => setTimeout(r, 200));
  const loaded = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const target = buttons.find((b) => b.textContent?.includes("Roundtrip Test"));
    if (!target) return "NOT FOUND";
    target.click();
    return "clicked";
  });
  console.log("load click:", loaded);
  await new Promise((r) => setTimeout(r, 1500));

  const after = await page.evaluate(() => ({
    bodyHasMillion: document.body.innerText.includes("$1,000,000"),
    seesSS: document.body.innerText.includes("Social Security"),
    seesUSStock: document.body.innerText.includes("US Stocks"),
    seesBond: document.body.innerText.includes("Bonds"),
    seesSurvivability: Array.from(document.querySelectorAll("h3")).some((h) => h.textContent?.includes("Survivability")),
  }));
  console.log("after load:", after);

  const ok = after.bodyHasMillion && after.seesSS && after.seesSurvivability;
  console.log(ok ? "\n✅ ROUND-TRIP OK" : "\n❌ ROUND-TRIP FAIL");
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
