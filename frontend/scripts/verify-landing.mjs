import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const output = join(tmpdir(), "edunex-landing-review");
const base = process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5173";
await mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:"chrome",headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:"reduce", colorScheme:"dark"});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if(message.type() === "error") errors.push(message.text()); });
const checks = [];
try {
  await page.goto(base);
  await page.locator(".landing-footer").waitFor({state:"attached"});
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".landing-skip").evaluate(el => el === document.activeElement),true);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("main").evaluate(el => el === document.activeElement),true);
  assert.equal(await page.locator("h1").count(),1);
  assert.equal(await page.locator(".landing-logo .edunex-mark").count(),2);
  // A saved choice must survive reloads and override a later OS theme change.
  for (const theme of ["light", "dark"]) {
    await page.getByRole("button", {name:"Switch to " + theme + " theme"}).focus();
    await page.keyboard.press("Enter");
    await page.reload();
    await page.locator(".landing-footer").waitFor({state:"attached"});
    await page.emulateMedia({colorScheme:theme === "light" ? "dark" : "light"});
    assert.equal(await page.locator("html").getAttribute("data-theme"),theme);
    const expectedBackground = theme === "dark" ? "rgb(7, 9, 13)" : "rgb(245, 247, 250)";
    assert.equal(await page.locator(".landing-page").evaluate(el => getComputedStyle(el).backgroundColor),expectedBackground);
  for(const width of [320,390,640,768,900,1024,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(() => window.scrollTo(0,0));
    const geometry = await page.evaluate(() => ({
      width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
      headings:[...document.querySelectorAll("h1,h2,h3")].map(el => ({text:el.textContent,size:getComputedStyle(el).fontSize})),
      font:getComputedStyle(document.querySelector(".hero-description")).fontFamily,
      overflow:[...document.querySelectorAll(".landing-page *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => el.className)
    }));
    assert.ok(geometry.scroll <= width,JSON.stringify(geometry));
    if([320,390,768,1440].includes(width)) {
      const axe = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
      checks.push({theme,width,geometry,violations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    }
    await page.screenshot({path:join(output,"landing-"+theme+"-"+width+".png"),fullPage:true});
    if(width===1440) await page.screenshot({path:join(output,"desktop-"+theme+"-viewport.png")});
  }
  }
  for (const [name,id] of [["Platform","intelligence"],["How it works","how-it-works"],["Why EduNex","early-warning"]]) {
    await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name,exact:true}).click();
    assert.equal(new URL(page.url()).hash,"#"+id);
    const rect = await page.locator("#"+id).boundingBox();
    assert.ok(rect.y >= 80 && rect.y < 180, id+" position "+rect.y);
  }
  const links=await page.locator('a[href^="/"]').evaluateAll(els=>els.map(el=>el.getAttribute("href")));
  assert.ok(links.every(h=>["/","/dashboard","/students","/risks","/segments","/insights","/data"].includes(h)));
  assert.deepEqual(errors,[]);
  await writeFile(join(output,"report.json"),JSON.stringify({checks,errors,links},null,2));
  console.log(JSON.stringify({output,errors,results:checks.map(c=>({theme:c.theme,width:c.width,height:c.geometry.height,violations:c.violations}))},null,2));
  assert.ok(checks.every(c=>c.violations.length===0),"Accessibility violations found");
} finally { await browser.close(); }
