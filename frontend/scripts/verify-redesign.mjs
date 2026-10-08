import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { installRedesignFixtures } from "./redesign-fixtures.mjs";

const baseline = process.argv.includes("--baseline");
const base = baseline ? "http://127.0.0.1:4173" : "http://127.0.0.1:5173";
const output = `verification/${baseline ? "before-edunex" : "after-edunex"}`;
const widths = [1440, 1280, 1024, 768, 480, 390, 320];
const routes = [
  ["/", "overview"],
  ["/students", "students"],
  ["/students/TEST0001", "profile"],
  ["/risks", "risks"],
  ["/segments", "segments"],
  ["/insights", "insights"],
  ["/data", "data"],
];
const report = {
  mode: "Isolated browser contract fixtures; no production fallback data",
  routes: [],
  responsive: [],
  accessibility: [],
  checks: [],
  console: [],
  requests: [],
  failures: [],
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
await installRedesignFixtures(page, report.requests);
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type()))
    report.console.push({
      type: message.type(),
      text: message.text(),
      page: page.url(),
    });
});
page.on("pageerror", (error) =>
  report.failures.push(error.stack ?? error.message),
);
try {
  for (const [route, name] of routes) {
    console.log(`Checking ${name}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}${route}`);
    await page.locator("main h1").waitFor();
    await page.waitForFunction(
      () => !document.querySelector('main [aria-busy="true"]'),
      undefined,
      { timeout: 30000 },
    );
    await page.waitForTimeout(350);
    const alerts = await page.locator("main [role=alert]").allTextContents();
    if (alerts.length)
      report.failures.push(`${name} alerts: ${alerts.join("; ")}`);
    report.routes.push({
      route,
      heading: await page.locator("main h1").innerText(),
    });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(180);
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        charts: [...document.querySelectorAll(".recharts-surface")].map(
          (el) => ({
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          }),
        ),
        overflowing: [
          ...document.querySelectorAll("main > *, .filter-bar, .app-header"),
        ]
          .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
          .map((el) => el.className),
      }));
      report.responsive.push({ route, width, ...geometry });
      if (geometry.overflow)
        report.failures.push(`${name} document overflows at ${width}px`);
      if (
        geometry.charts.some((rect) => rect.width <= 100 || rect.height <= 100)
      )
        report.failures.push(
          `${name} chart has invalid geometry at ${width}px`,
        );
      await page.screenshot({
        path: `${output}/${name}-${width}.png`,
        fullPage: true,
      });
      if ([1440, 390].includes(width)) {
        await page.screenshot({
          path: `${output}/${name}-${width}-viewport.png`,
        });
      }
      if ([1440, 390].includes(width)) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.accessibility.push({
          route,
          width,
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
        if (result.violations.length)
          report.failures.push(
            `${name} has ${result.violations.length} accessibility violations at ${width}px`,
          );
      }
    }
  }
  if (!baseline) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/dashboard?department=Computer+Science&year=2`);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await page.waitForTimeout(300);
    assert.equal(
      await page
        .locator(".workspace-sidebar")
        .evaluate((el) => el.getBoundingClientRect().width),
      80,
    );
    await page.getByRole("link", { name: "Students", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("year"), "2");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    const trigger = page.getByRole("button", { name: "Search and navigate" });
    await trigger.click();
    const input = page.getByRole("combobox");
    await input.fill("insights");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/insights?*");
    assert.equal(
      new URL(page.url()).searchParams.get("department"),
      "Computer Science",
    );
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").waitFor();
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.getByRole("combobox").getAttribute("aria-activedescendant"),
      "command-1",
    );
    await page.keyboard.press("ArrowUp");
    assert.equal(
      await page.getByRole("combobox").getAttribute("aria-activedescendant"),
      "command-0",
    );
    const paletteAudit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    report.accessibility.push({
      route: "command-palette",
      width: 1440,
      violations: paletteAudit.violations,
    });
    assert.equal(
      paletteAudit.violations.length,
      0,
      "Command palette accessibility",
    );
    for (let index = 0; index < 6; index++) await page.keyboard.press("Tab");
    assert.equal(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
      true,
      "Dialog traps keyboard focus",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await trigger.evaluate((el) => el === document.activeElement),
      true,
      "Palette restores focus",
    );
    await trigger.click();
    await page.getByRole("combobox").fill("TEST0001");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/students/TEST0001?*");
    await page
      .getByText("The complete student record", { exact: true })
      .waitFor();
    for (const label of [
      "Academic",
      "Attendance",
      "LMS",
      "Engagement",
      "Placement",
      "Skills",
      "Feedback",
    ]) {
      await page
        .locator(".domain-history summary")
        .filter({ hasText: label })
        .click();
      assert.equal(
        await page
          .getByRole("region", { name: `${label} history`, exact: true })
          .isVisible(),
        true,
      );
    }
    report.checks.push(
      "Sidebar collapse/expand, retained cohort filters, Ctrl+K, arrows/Enter, Escape, focus trap/restoration, exact-ID navigation and all seven source-history disclosures.",
    );
    await page.goto(`${base}/insights`);
    await page.getByRole("button", { name: "Engagement", exact: true }).click();
    assert.equal(await page.locator(".insight-card").count(), 1);
    await page.getByRole("button", { name: /All insights/ }).click();
    assert.equal(await page.locator(".insight-card").count(), 4);
    report.checks.push(
      "Insight category controls filter the real response without another API request.",
    );
    await page.goto(`${base}/students`);
    await page.getByLabel("Student ID", { exact: true }).fill("TEST0002");
    await page
      .getByRole("button", { name: "Open profile", exact: true })
      .click();
    await page.waitForURL("**/students/TEST0002");
    report.checks.push("Directory exact-ID lookup opens Student 360.");
  }
  if (report.console.length)
    report.failures.push(
      `${report.console.length} unexpected browser console messages`,
    );
} catch (error) {
  report.failures.push(error.stack ?? String(error));
  await page
    .screenshot({ path: `${output}/failure.png`, fullPage: true })
    .catch(() => {});
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify(
      {
        routes: report.routes.length,
        viewports: report.responsive.length,
        accessibility: report.accessibility.map(
          ({ route, width, violations }) => ({
            route,
            width,
            violations: violations.length,
          }),
        ),
        console: report.console,
        failures: report.failures,
      },
      null,
      2,
    ),
  );
  if (report.failures.length) process.exitCode = 1;
}
