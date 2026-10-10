// Production-bundle browser benchmark with deterministic 150ms API fixtures.
// This measures frontend scheduling/transfer, not production backend latency.
import { chromium } from "playwright";
import { overview, trends, insights } from "./browser-fixtures.mjs";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const base = process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5174";
const output = process.argv[2];
if (!output) throw new Error("Pass an output JSON path");
const browser = await chromium.launch({ headless: true });
const samples = [];
const landing = [];
try {
  for (let run = 0; run < 5; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const calls = [], errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.routeWebSocket("**/ws/updates", () => {});
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      calls.push({ path, at: Date.now() });
      const body = {
        "/api/health": { status: "ok", database: "ready" },
        "/api/auth/session": { user: { id: "dean-demo", role: "admin", name: "Demo Dean / Admin", department: null } },
        "/api/data/departments": ["Computer Science"],
        "/api/analytics/overview": overview,
        "/api/analytics/distribution": overview,
        "/api/analytics/trends": trends,
        "/api/insights": insights,
      }[path];
      assert.ok(body, `Unexpected request: ${path}`);
      await new Promise(resolve => setTimeout(resolve, 150));
      await route.fulfill({ json: body });
    });
    const start = Date.now();
    await page.goto(`${base}/dashboard`);
    await page.getByText("Average across assessed students").waitFor();
    const kpiMs = Date.now() - start;
    await page.getByRole("heading", { name: "Support capacity scenario" }).waitFor();
    await page.getByText("No significant insights available for this cohort.").waitFor();
    const usableMs = Date.now() - start;
    const resources = await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.includes("/assets/")).map(r => ({ file: r.name.split("/").pop(), bytes: r.encodedBodySize })));
    assert.deepEqual(errors, []);
    samples.push({ kpiMs, usableMs, calls: calls.map(c => ({ path: c.path, startMs: c.at - start })), resources });
    await context.close();
  }
  for (let run = 0; run < 5; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.route("**/api/auth/users", route => route.fulfill({ json: { users: [], notice: "Browser benchmark fixture" } }));
    const start = Date.now();
    await page.goto(base);
    await page.locator(".landing-footer").waitFor();
    const contentMs = Date.now() - start;
    const resources = await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.includes("/assets/")).map(r => ({ file: r.name.split("/").pop(), bytes: r.encodedBodySize })));
    landing.push({ contentMs, resources });
    await context.close();
  }
} finally { await browser.close(); }
const chunks = [];
for (const name of await readdir("dist/assets")) {
  if (!name.endsWith(".js")) continue;
  const data = await readFile(`dist/assets/${name}`);
  chunks.push({ name, bytes: data.length, gzipBytes: gzipSync(data).length });
}
await mkdir(dirname(output), { recursive: true });
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const report = { environment: "local production preview; cold browser contexts; 150ms contract API fixtures; reduced motion", medianKpiMs: median(samples.map(s => s.kpiMs)), medianUsableMs: median(samples.map(s => s.usableMs)), samples, landing, chunks };
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ medianKpiMs: report.medianKpiMs, medianUsableMs: report.medianUsableMs, requests: samples.map(s => s.calls.length) }));
