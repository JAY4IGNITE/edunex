import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5173";
const output = process.env.EDUNEX_TEST_OUTPUT ?? ".phase-work/judge-evidence";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function selectRole(label, heading) {
  await page.getByRole("link", { name: "Switch role" }).click();
  await page.getByRole("button", { name: `Continue as ${label}` }).click();
  await page.getByRole("heading", { name: heading }).waitFor({ timeout: 60000 });
}

async function studentsForCurrentRole() {
  return page.evaluate(async () => {
    const response = await fetch("/api/students?limit=1000");
    return { status: response.status, rows: await response.json() };
  });
}

try {
  await page.goto(`${base}/`);
  await page.locator(".landing-footer").waitFor();
  await page.screenshot({ path: `${output}/landing.png`, fullPage: true });
  await page.getByRole("button", { name: "Continue as Dean / Admin" }).click();
  await page.getByRole("heading", { name: "Student success overview" }).waitFor({ timeout: 60000 });
  await page.getByRole("heading", { name: "Support capacity scenario" }).waitFor({ timeout: 60000 });
  await page.locator(".recharts-pie-sector").first().waitFor();
  await page.screenshot({ path: `${output}/admin-dashboard.png`, fullPage: true });

  const admin = await studentsForCurrentRole();
  assert.equal(admin.status, 200, "Admin can read the synthetic student directory");
  assert.ok(admin.rows.length > 0, "The disposable database is seeded");
  const adminIds = new Set(admin.rows.map((row) => row.student_id));

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await csvPromise;
  assert.equal(csv.suggestedFilename(), "edunex-cohort-planning.csv");
  const csvPath = `${output}/edunex-cohort-planning.csv`;
  await csv.saveAs(csvPath);
  const csvText = await readFile(csvPath, "utf8");
  assert.match(csvText, /Estimated high-risk cases/);
  assert.match(csvText, /Uncovered estimated cases/);

  await selectRole("HOD / Faculty", "Student success overview");
  const faculty = await studentsForCurrentRole();
  assert.equal(faculty.status, 200);
  assert.ok(faculty.rows.length > 0 && faculty.rows.length < admin.rows.length);
  assert.ok(faculty.rows.every((row) => row.department === "Computer Science"));
  await page.screenshot({ path: `${output}/faculty-scope.png`, fullPage: true });

  await selectRole("Mentor", "Students");
  const mentor = await studentsForCurrentRole();
  assert.equal(mentor.status, 200);
  assert.ok(mentor.rows.length > 0 && mentor.rows.length < admin.rows.length);
  assert.ok(mentor.rows.every((row) => adminIds.has(row.student_id)), "Mentor rows are a subset of the Admin synthetic roster");
  await page.screenshot({ path: `${output}/mentor-scope.png`, fullPage: true });

  await selectRole("Dean / Admin", "Student success overview");
  await page.goto(`${base}/priority`);
  const reviewLink = page.getByRole("link", { name: "Review recommendations" }).first();
  await reviewLink.waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${output}/priority-queue.png`, fullPage: true });
  await reviewLink.click();
  await page.getByRole("heading", { name: "Recommended interventions", exact: true }).waitFor({ timeout: 60000 });
  const section = page.getByRole("region", { name: "Recommended interventions" });
  await section.getByRole("button", { name: "Review and assign" }).first().click();
  const card = section.locator("article").filter({ has: page.getByRole("button", { name: "Assign", exact: true }) }).first();
  await card.getByLabel("Demo assignee").selectOption("mentor-demo");
  await card.getByLabel("Notes (synthetic demo only)").fill("Synthetic judge flow: staff-reviewed support action.");
  await card.getByRole("button", { name: "Assign", exact: true }).click();
  await section.getByRole("button", { name: "Start", exact: true }).first().click();
  await section.getByRole("button", { name: "Complete", exact: true }).first().click();
  await section.getByRole("status").filter({ hasText: "No later assessment" }).first().waitFor();

  await page.goto(`${base}/interventions?status=Completed`);
  await page.getByRole("status").filter({ hasText: "No later assessment" }).first().waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${output}/completed-tracker.png`, fullPage: true });

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Horizontal overflow at ${width}px`);
  }
  assert.deepEqual(errors, [], "The browser journey has no uncaught page errors");
  await writeFile(`${output}/result.json`, JSON.stringify({
    passed: true,
    roles: { adminStudents: admin.rows.length, facultyStudents: faculty.rows.length, mentorStudents: mentor.rows.length },
    checks: ["admin dashboard", "capacity CSV", "faculty department scope", "mentor caseload scope", "priority to completed intervention", "responsive tracker"],
    widths: [1440, 768, 390],
    errors,
  }, null, 2));
  console.log("Complete EduNex judge journey passed; screenshots, CSV and result are saved in", output);
} finally {
  await browser.close();
}
