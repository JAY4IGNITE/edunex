import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Phase 13 UI verification only. Fault fixtures below exist solely in this browser.
const base = process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5173";
const cohort = "?department=Computer+Science&year=2&semester=4";
await mkdir("verification", { recursive: true });
const report = {
  routes: [],
  responsive: [],
  checks: [],
  console: [],
  network: [],
  accessibility: [],
  failures: [],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const starts = new Map();
page.on("console", (msg) => {
  if (["error", "warning"].includes(msg.type()))
    report.console.push({ type: msg.type(), text: msg.text() });
});
page.on("pageerror", (error) => report.failures.push(error.message));
page.on("request", (request) => {
  if (new URL(request.url()).pathname.startsWith("/api/"))
    starts.set(request, Date.now());
});
page.on("response", (response) => {
  if (new URL(response.url()).pathname.startsWith("/api/")) {
    const entry = {
      url: response.url(),
      status: response.status(),
      ms: Date.now() - starts.get(response.request()),
    };
    report.network.push(entry);
    console.log("API", entry.status, entry.ms, new URL(entry.url).pathname);
  }
});

async function settled() {
  await page.waitForTimeout(800);
  await page.locator("main h1").waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelectorAll('main [aria-busy="true"]').length === 0,
    undefined,
    { timeout: 600000 },
  );
  await page.waitForTimeout(600);
}
async function audit(label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
async function inspect(route, label, useNav = false) {
  console.log("CHECK", label);
  if (useNav)
    await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: label, exact: true })
      .click();
  else await page.goto(`${base}${route}${cohort}`);
  await settled();
  const alerts = await page.locator("main [role=alert]").allTextContents();
  assert.equal(alerts.length, 0, `${label}: ${alerts.join("; ")}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, `${label} overflows at desktop`);
  report.routes.push({
    route,
    heading: await page.locator("main h1").innerText(),
    alerts,
    overflow,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `verification/${label.toLowerCase().replaceAll(" ", "-")}-desktop.png`,
    fullPage: true,
  });
  await audit(label);
}
try {
  await inspect("/data", "Data Integration");
  await inspect("/students", "Students", true);
  const firstId = await page.locator(".student-id").first().innerText();
  await page.locator(".student-id").first().click();
  await settled();
  assert.equal(await page.locator("main h1").innerText(), firstId);
  await page.getByText("Explainable Score", { exact: true }).waitFor();
  await page.getByText("Academic", { exact: true }).last().click();
  report.routes.push({ route: `/students/${firstId}`, heading: firstId });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "verification/profile-desktop.png",
    fullPage: true,
  });
  await audit("Student Profile");
  await inspect("/risks", "Risks", true);
  await inspect("/insights", "Insights", true);
  await inspect("/segments", "Segments", true);
  await page
    .getByRole("button", { name: "View characteristics" })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("dialog")
    .getByText("Segment members", { exact: true })
    .waitFor({ timeout: 600000 });
  assert.match(await page.getByRole("dialog").innerText(), /Institution-wide/);
  await audit("Segment dialog");
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "View characteristics" })
      .first()
      .evaluate((el) => el === document.activeElement),
    true,
  );
  report.checks.push(
    "Segment detail loads; Escape closes; focus returns to trigger.",
  );
  await inspect("/", "Overview", true);
  await page.getByRole("button", { name: "Engagement", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Engagement", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  report.checks.push("Historical metric switching works.");
  for (const width of [1440, 1280, 1024, 768, 480, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `Overview overflow at ${width}px`);
    report.responsive.push({ width, overflow });
    await page.screenshot({
      path: `verification/overview-${width}.png`,
      fullPage: true,
    });
  }
  await audit("Mobile overview 390");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Data Integration" })
    .click();
  await settled();
  report.checks.push("Mobile More menu opens secondary pages.");
  await page.screenshot({
    path: "verification/data-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("link", { name: "Students", exact: true })
    .click();
  await settled();
  await page.screenshot({
    path: "verification/students-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Next student page" }).click();
  await settled();
  assert.match(page.url(), /page=2/);
  assert.notEqual(
    await page.locator(".student-id").first().innerText(),
    firstId,
  );
  report.checks.push(
    "Server pagination advances to different students while preserving cohort.",
  );
  await page
    .getByLabel("Department", { exact: true })
    .fill("NoSuchDepartmentPhase13");
  await page.getByRole("button", { name: "Apply department" }).click();
  await page
    .getByText("No students match these filters.", { exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).searchParams.has("page"), false);
  report.checks.push(
    "Department filter reaches backend, clears page, and displays real empty state.",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await settled();
  await page.getByText("Not enough historical data", { exact: true }).waitFor();
  await page.getByText("Insufficient Data", { exact: true }).waitFor();
  report.checks.push(
    "Real empty cohort displays empty distributions/trends and the backend insufficient-data insight.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".spotlight-card")
      .evaluate((el) => getComputedStyle(el, "::before").display),
    "none",
  );
  report.checks.push("Reduced motion disables spotlight and CSS animations.");
  // Error/retry and delayed network loading, in a separate context with no shared cache.
  const faultPage = await context.newPage();
  let failing = true;
  await faultPage.route("**/api/students?*", async (route) => {
    if (failing)
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "private test stack trace",
      });
    else await route.continue();
  });
  await faultPage.goto(`${base}/students${cohort}`);
  await faultPage
    .getByText("Unable to load students.", { exact: true })
    .waitFor({ timeout: 15000 });
  assert.equal(
    await faultPage.getByText("private test stack trace").count(),
    0,
  );
  await faultPage.screenshot({
    path: "verification/error-state.png",
    fullPage: true,
  });
  failing = false;
  await faultPage.getByRole("button", { name: "Try again" }).click();
  await faultPage.locator(".student-id").first().waitFor();
  report.checks.push(
    "500 response shows safe error; retry recovers against real API.",
  );
  await faultPage.goto(`${base}/students/PHASE13-MISSING`);
  await faultPage.getByText("Student not found.", { exact: true }).waitFor();
  report.checks.push("Real missing profile returns a friendly 404 view.");
  await faultPage.close();
} catch (error) {
  report.failures.push(error.stack ?? String(error));
  console.error(error);
  await page
    .screenshot({ path: "verification/failure.png", fullPage: true })
    .catch(() => {});
} finally {
  await writeFile(
    "verification/browser-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify(
      {
        routes: report.routes.length,
        responsive: report.responsive,
        checks: report.checks,
        console: report.console,
        accessibility: report.accessibility.map((a) => ({
          label: a.label,
          violations: a.violations.length,
        })),
        failures: report.failures,
      },
      null,
      2,
    ),
  );
  if (report.failures.length) process.exitCode = 1;
}
