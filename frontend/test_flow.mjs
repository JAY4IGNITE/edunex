import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE:', msg.text()));
  
  await page.goto("http://127.0.0.1:5173/");
  
  await page.waitForSelector("form.filter-bar");
  
  await page.selectOption("select[name='department']", "Computer Science");
  
  await page.click("button:has-text('Apply Filters')");
  
  await page.waitForTimeout(1000);
  const url = page.url();
  console.log("Final URL:", url);
  
  const ctx = await page.textContent(".filter-context");
  console.log("Context text:", ctx);
  
  await browser.close();
})();
