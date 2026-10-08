import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("verification", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const report = { connected: false, sockets: [], errors: [] };
page.on("websocket", socket => {
  const url = new URL(socket.url());
  if (url.pathname === "/ws/updates") report.sockets.push(`${url.origin}${url.pathname}`);
});
page.on("pageerror", error => report.errors.push(error.message));
try {
  await page.goto(`${process.env.EDUNEX_TEST_BASE_URL ?? "http://127.0.0.1:5173"}/data`);
  await page.getByRole("status", { name: "Real-time connected" }).waitFor({ timeout: 15000 });
  report.connected = true;
} catch (error) {
  report.errors.push(error.message);
} finally {
  await writeFile("verification/realtime-report.json", JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  if (!report.connected || report.errors.length) process.exitCode = 1;
}
