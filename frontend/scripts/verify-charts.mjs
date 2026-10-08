import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Contract fixtures are restricted to this isolated verification browser.
// These test layout/interaction edge cases, not the correctness or latency of analytics.
import {
  overview,
  trends,
  segment,
  detail,
  insights,
} from "./browser-fixtures.mjs";
const report = {
  mode: "Isolated contract fixtures; no production fallback data",
  checks: [],
  responsive: [],
  accessibility: [],
  console: [],
  failures: [],
};
await mkdir("verification", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type()))
    report.console.push(message.text());
});
page.on("pageerror", (error) => report.failures.push(error.message));
await page.route("**/api/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  const body = {
    "/api/analytics/overview": overview,
    "/api/analytics/distribution": overview,
    "/api/analytics/trends": trends,
    "/api/insights": insights,
    "/api/segments": { total_students: 100, segments: [segment] },
    "/api/segments/TEST_SEGMENT": detail,
  }[path];
  if (body) await route.fulfill({ json: body });
  else await route.continue();
});
async function audit(label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({ label, violations: result.violations });
  assert.equal(
    result.violations.length,
    0,
    `${label}: accessibility violations`,
  );
}
try {
  await page.goto("http://127.0.0.1:5173/");
  await page
    .getByText("No significant insights available for this cohort.", {
      exact: true,
    })
    .waitFor();
  await page.waitForTimeout(700);
  assert.equal(await page.locator(".recharts-surface").count(), 2);
  await audit("Populated overview desktop");
  for (const width of [1440, 1280, 1024, 768, 480, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.waitForTimeout(250);
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      charts: [...document.querySelectorAll(".recharts-surface")].map((el) => ({
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      })),
    }));
    report.responsive.push({ width, ...geometry });
    assert.equal(geometry.overflow, false, `Overview overflows at ${width}`);
    assert.ok(
      geometry.charts.every((rect) => rect.width > 100 && rect.height > 100),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `verification/overview-fixture-${width}.png`,
      fullPage: true,
    });
  }
  await audit("Populated overview mobile");
  for (const [metric, expected, unit] of [
    ["Attendance", "81", "%"],
    ["Engagement", "3.2", "index"],
    ["Success Score", "72.5", "0–100"],
  ]) {
    await page.getByRole("button", { name: metric, exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: metric, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator(".chart-data summary").click();
    assert.match(
      await page.locator(".chart-data summary").innerText(),
      new RegExp(unit),
    );
    assert.equal(
      await page
        .locator(".chart-data tbody tr")
        .last()
        .locator("td")
        .last()
        .innerText(),
      expected,
    );
    await page.locator(".chart-data summary").click();
  }
  report.checks.push(
    "Donut and historical charts render and resize; all metric tabs show matching exact values and correct units.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Attendance", exact: true }).click();
  assert.equal(
    await page
      .locator(".spotlight-card")
      .evaluate((el) => getComputedStyle(el, "::before").display),
    "none",
  );
  assert.equal(
    await page
      .locator("[data-reveal]")
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  assert.equal(
    await page
      .locator("[data-reveal]")
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  report.checks.push(
    "Reduced motion leaves all cards visible and disables nonessential spotlight/motion.",
  );
  await page.goto("http://127.0.0.1:5173/segments");
  const trigger = page.getByRole("button", { name: "View characteristics" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Segment members", { exact: true }).waitFor();
  assert.match(await dialog.innerText(), /Institution-wide/);
  assert.equal(await dialog.locator(".member-link").count(), 20);
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal(await dialog.locator(".member-link").count(), 1);
  assert.equal(await dialog.locator(".member-link").innerText(), "TEST0021");
  await audit("Segment detail mobile");
  await page.screenshot({
    path: "verification/segment-dialog-fixture-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
  );
  report.checks.push(
    "Segment detail shows characteristics, paginates returned member IDs, and restores focus after Escape.",
  );
  assert.equal(report.console.length, 0, "Unexpected browser warnings/errors");
} catch (error) {
  report.failures.push(error.stack ?? String(error));
  await page
    .screenshot({ path: "verification/charts-failure.png", fullPage: true })
    .catch(() => {});
} finally {
  await writeFile(
    "verification/charts-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify(
      {
        ...report,
        accessibility: report.accessibility.map((a) => ({
          label: a.label,
          violations: a.violations.length,
        })),
      },
      null,
      2,
    ),
  );
  if (report.failures.length) process.exitCode = 1;
}
