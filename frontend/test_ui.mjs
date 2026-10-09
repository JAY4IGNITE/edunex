import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", msg => console.log("PAGE LOG:", msg.text()));
  await page.goto("http://127.0.0.1:5173/");
  
  await page.waitForTimeout(2000);
  
  const deptSelect = await page.locator("select[name='department']");
  const options = await deptSelect.locator("option").allTextContents();
  console.log("Department options:", options);
  
  await browser.close();
})();
