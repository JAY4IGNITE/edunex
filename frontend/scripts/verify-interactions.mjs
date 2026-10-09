import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Live API checks for Phase 13. Only the explicit 500/loading scenario is intercepted.
const base = process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5173";
const cohort = "?department=Computer+Science&year=2&semester=4";
const report = {
  checks: [],
  responsive: [],
  accessibility: [],
  console: [],
  network: [],
  failures: [],
};
await mkdir("verification", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
});
const page = await context.newPage();
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type()))
    report.console.push(message.text());
});
page.on("pageerror", (error) => report.failures.push(error.message));
page.on("response", (response) => {
  if (new URL(response.url()).pathname.startsWith("/api/"))
    report.network.push({ url: response.url(), status: response.status() });
});
async function settled(target = page) {
  await target.waitForTimeout(300);
  await target.locator("main h1").waitFor();
  await target.waitForFunction(
    () => !document.querySelector('main [aria-busy="true"]'),
    undefined,
    { timeout: 30000 },
  );
  await target.waitForTimeout(500);
}
async function audit(label, target = page) {
  const result = await new AxeBuilder({ page: target })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({ label, violations: result.violations });
  assert.equal(
    result.violations.length,
    0,
    `${label}: accessibility violations`,
  );
}
async function capture(name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `verification/${name}.png`, fullPage: true });
}
async function widths(label) {
  for (const width of [1440, 1280, 1024, 768, 480, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    report.responsive.push({ label, width, overflow });
    assert.equal(overflow, false, `${label} overflow at ${width}px`);
  }
  await capture(`${label}-mobile-live`);
  await audit(`${label} at 390px`);
}
try {
  await page.goto(`${base}/students${cohort}`);
  await settled();
  const firstId = await page.locator(".student-id").first().innerText();
  await capture("students-complete-desktop");
  await widths("students");
  const scroll = await page
    .getByRole("region", { name: "Student records" })
    .evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  assert.ok(
    scroll.scroll <= scroll.client,
    "Mobile student cards must fit their container without horizontal scrolling",
  );
  await page.getByRole("button", { name: "Next student page" }).click();
  await settled();
  assert.match(page.url(), /page=2/);
  assert.notEqual(
    await page.locator(".student-id").first().innerText(),
    firstId,
  );
  report.checks.push(
    "Live server pagination returns different identities and preserves cohort parameters.",
  );
  await page
    .getByLabel("Department", { exact: true })
    .selectOption("Electronics");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL((url) => url.searchParams.get("department") === "Electronics");
  assert.equal(new URL(page.url()).searchParams.has("page"), false);
  await page.getByLabel("Year", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL((url) => url.searchParams.get("year") === "1");
  await page.getByLabel("Semester", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.waitForURL((url) => url.searchParams.get("semester") === "1");
  await settled();
  assert.equal(new URL(page.url()).searchParams.get("year"), "1");
  assert.equal(new URL(page.url()).searchParams.get("semester"), "1");
  report.checks.push(
    "Department/year/semester are sent to live backend; filtering resets pagination.",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await settled();
  await page.getByText("Not enough historical data", { exact: true }).waitFor();
  await page.getByText("Insufficient Data", { exact: true }).waitFor();
  await widths("overview-empty");
  await page.getByRole("button", { name: "Engagement", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Engagement", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".spotlight-card")
      .evaluate((el) => getComputedStyle(el, "::before").display),
    "none",
  );
  assert.equal(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    true,
  );
  report.checks.push(
    "Live empty overview renders every endpoint, backend insufficient-data insight, metric selection and reduced-motion state.",
  );
  await page.getByRole("button", { name: "More", exact: true }).click();
  await audit("Mobile navigation dialog");
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "More", exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Data Integration", exact: true })
    .click();
  await settled();
  assert.equal(await page.getByRole("dialog").count(), 0);
  await widths("data");
  report.checks.push(
    "Mobile menu supports Escape/focus restoration and secondary navigation.",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("link", { name: "Students", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await settled();
  assert.equal(new URL(page.url()).search, "");
  await page.locator(".student-id").first().click();
  await settled();
  await widths("profile");
  report.checks.push(
    "Reset removes cohort parameters; student navigation opens a live Student 360 record.",
  );
  // Fault injection is confined to this page. Retry continues to the actual API.
  const faultPage = await context.newPage();
  let failing = true;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await faultPage.route("**/api/students?*", async (route) => {
    await gate;
    if (failing)
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "private test stack trace",
      });
    else await route.continue();
  });
  await faultPage.emulateMedia({ reducedMotion: "reduce" });
  await faultPage.goto(`${base}/students${cohort}`);
  await faultPage
    .getByRole("status", { name: "Loading students", exact: true })
    .waitFor();
  assert.equal(
    await faultPage
      .locator('[data-slot="skeleton"]')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await faultPage.screenshot({
    path: "verification/table-loading-mobile.png",
    fullPage: true,
  });
  release();
  await faultPage
    .getByText("Unable to load students.", { exact: true })
    .waitFor({ timeout: 15000 });
  assert.equal(
    await faultPage.getByText("private test stack trace").count(),
    0,
  );
  await audit("Safe error state", faultPage);
  await faultPage.screenshot({
    path: "verification/error-state-mobile.png",
    fullPage: true,
  });
  failing = false;
  await faultPage.getByRole("button", { name: "Try again" }).click();
  await faultPage.locator(".student-id").first().waitFor();
  report.checks.push(
    "Delayed request shows skeleton; reduced motion disables pulse; injected 500 is safe; retry loads real data.",
  );
  // Keep expected 404 browser diagnostics separate from the healthy-page console check.
  await faultPage.goto(`${base}/students/PHASE13-MISSING`);
  await faultPage.getByText("Student not found.", { exact: true }).waitFor();
  assert.equal(
    await faultPage.getByRole("button", { name: "Try again" }).count(),
    0,
  );
  report.checks.push(
    "Actual backend 404 renders a friendly student-not-found state.",
  );
  await faultPage.close();
  assert.equal(
    report.console.length,
    0,
    "Unexpected browser console warnings/errors",
  );
  assert.equal(
    report.network.filter((item) => item.status >= 400).length,
    0,
    "Unexpected live API failure",
  );
} catch (error) {
  report.failures.push(error.stack ?? String(error));
  await page
    .screenshot({
      path: "verification/interaction-failure.png",
      fullPage: true,
    })
    .catch(() => {});
} finally {
  await writeFile(
    "verification/interactions-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify(
      {
        ...report,
        network: `${report.network.length} responses`,
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
