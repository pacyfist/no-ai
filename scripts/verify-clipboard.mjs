/**
 * Drives the real user flow: select the protected paragraph, Ctrl+C, click the
 * paste box, Ctrl+V. Uses genuine key events and the real system clipboard, so
 * it tests the actual claim — that copying protected text yields the scrambled
 * string, not the glyphs you read.
 */
import puppeteer from 'puppeteer-core';

const TARGET = process.argv[2] ?? 'http://localhost:4321/';
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});
await browser
  .defaultBrowserContext()
  .overridePermissions(new URL(TARGET).origin, ['clipboard-read', 'clipboard-write']);

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await page.goto(TARGET, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !document.querySelector('.protected-body')?.style.visibility);

// Select the protected paragraph exactly as a person dragging across it would.
await page.evaluate(() => {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('.protected-body'));
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});

await page.keyboard.down('Control');
await page.keyboard.press('KeyC');
await page.keyboard.up('Control');

await page.click('textarea.dom-dump');
await page.keyboard.down('Control');
await page.keyboard.press('KeyV');
await page.keyboard.up('Control');

const pasted = await page.$eval('textarea.dom-dump', (el) => el.value);
const badges = await page.$$eval('.card-title .badge', (els) =>
  els.map((e) => e.textContent.trim()),
);

await page.screenshot({ path: 'scripts/clipboard-paste.png', fullPage: true });
await browser.close();

console.log('pasted length           :', pasted.length);
console.log('pasted sample           :', JSON.stringify(pasted.slice(0, 70)));
console.log('verdict badges shown    :', badges);

const leaked = /quick brown fox/i.test(pasted);
console.log('plaintext survived copy :', leaked);

const ok = pasted.length > 50 && !leaked && badges.includes('unusable');
console.log(ok ? '\nPASS — the clipboard carried scrambled text' : '\nFAIL');
process.exit(ok ? 0 : 1);
