const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  
  // Wait for the FilterBar
  await page.waitForSelector("form.filter-bar");
  
  console.log("Found filter bar");
  
  // Try to select a department
  const deptSelect = await page.locator("select[name='department']");
  const options = await deptSelect.locator("option").allTextContents();
  console.log("Department options:", options);
  
  await browser.close();
})();
