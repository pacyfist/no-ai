/**
 * Screenshots the demo with the reveal toggle off and on, to check the left
 * panel swaps between the human and AI headings. Dev-only helper.
 */
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:4321/';
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !document.querySelector('.protected-body')?.style.visibility);

const heading = () => page.$eval('.card .card-title', (el) => el.textContent.trim());

console.log('toggle off:', await heading());
await page.screenshot({
  path: 'scripts/toggle-off.png',
  clip: { x: 200, y: 560, width: 880, height: 200 },
});

await page.click('input.toggle');
await page.waitForFunction(
  () => document.querySelector('.card .card-title')?.textContent.includes('AI'),
  { timeout: 5000 },
);

console.log('toggle on :', await heading());
await page.screenshot({
  path: 'scripts/toggle-on.png',
  clip: { x: 200, y: 560, width: 880, height: 200 },
});

await browser.close();
