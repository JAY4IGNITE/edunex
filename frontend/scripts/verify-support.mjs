import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5175";
const output = process.env.EDUNEX_TEST_OUTPUT ?? "../.phase-work/support-browser";
await mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:"chrome",headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors = [];
page.on("pageerror",error=>errors.push(error.message));
try {
  await page.goto(`${base}/login`);
  await page.getByRole("button",{name:"Continue as Dean / Admin"}).click();
  await page.getByRole("heading",{name:"Student success overview"}).waitFor({timeout:60000});
  await page.goto(`${base}/priority`);
  await page.getByRole("link",{name:"Review recommendations"}).first().waitFor({timeout:60000});
  await page.screenshot({path:`${output}/priority.png`,fullPage:true});
  await page.getByRole("link",{name:"Review recommendations"}).first().click();
  await page.getByRole("heading",{name:"Recommended interventions",exact:true}).waitFor({timeout:60000});
  const section = page.getByRole("region",{name:"Recommended interventions"});
  await section.getByRole("button",{name:"Review and assign"}).first().click();
  const card = section.locator("article").filter({has:page.getByRole("button",{name:"Assign",exact:true})}).first();
  await card.getByLabel("Demo assignee").selectOption("mentor-demo");
  await card.getByLabel("Notes (synthetic demo only)").fill("Synthetic browser verification: staff-reviewed support action.");
  await card.getByRole("button",{name:"Assign",exact:true}).click();
  await section.getByRole("button",{name:"Start",exact:true}).first().click();
  await section.getByRole("button",{name:"Complete",exact:true}).first().click();
  await section.getByRole("status").filter({hasText:"No later assessment"}).first().waitFor();
  await page.goto(`${base}/interventions?status=Completed`);
  await page.getByRole("status").filter({hasText:"No later assessment"}).first().waitFor({timeout:30000});
  await page.screenshot({path:`${output}/completed.png`,fullPage:true});
  for (const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/result.json`,JSON.stringify({passed:true,flow:"priority → student → review → assign → start → complete → tracker",widths:[1440,768,390],errors},null,2));
  console.log("Support browser flow passed, including honest missing-follow-up outcome and responsive tracker.");
} finally { await browser.close(); }
