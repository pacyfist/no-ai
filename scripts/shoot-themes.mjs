/**
 * Screenshots the demo in both daisyUI themes, so light mode gets checked too.
 * Dev-only helper.
 */
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:4321/';
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.querySelector('.protected-body')?.style.visibility);
  await page.screenshot({ path: `scripts/theme-${scheme}.png`, fullPage: true });
  console.log(`wrote scripts/theme-${scheme}.png`);
  await page.close();
}

await browser.close();
