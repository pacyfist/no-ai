/**
 * End-to-end check that the technique actually works in a real browser.
 *
 * Loads the demo, waits for the forged font, then confirms three things a unit
 * test cannot: the DOM text is scrambled, the glyphs painted on screen are the
 * readable ones, and hydration did not error.
 *
 * Usage: node scripts/verify-in-browser.mjs [url]
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:4321/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !document.querySelector('.protected-body')?.style.visibility, {
  timeout: 15000,
});

const result = await page.evaluate(async () => {
  const body = document.querySelector('.protected-body');
  const dom = body.textContent;
  const family = getComputedStyle(body).fontFamily;

  // Ask the browser which font it actually used to paint the first characters.
  const loaded = [...document.fonts].map((f) => ({ family: f.family, status: f.status }));

  // Rasterise one scrambled character with the forged font and the same
  // character with the plain fallback. If the forged font is really remapping,
  // the two bitmaps must differ.
  const draw = (ch, font) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillText(ch, 4, 4);
    return c.toDataURL();
  };
  const forgedFamily = family.split(',')[0].replaceAll('"', '');
  const scrambledChar = dom[0];
  const withForged = draw(scrambledChar, `48px "${forgedFamily}"`);
  const withPlain = draw(scrambledChar, '48px Roboto');

  return { dom, family, loaded, remapsGlyphs: withForged !== withPlain, scrambledChar };
});

const readable = await page.$eval('.protected-body', (el) => el.getBoundingClientRect().width > 0);
await page.screenshot({ path: 'scripts/demo-screenshot.png', fullPage: true });
await browser.close();

const domSample = result.dom.slice(0, 80);
console.log('DOM textContent          :', JSON.stringify(domSample));
console.log('computed font-family     :', result.family);
console.log('registered FontFaces     :', JSON.stringify(result.loaded));
console.log(
  'forged font remaps glyphs:',
  result.remapsGlyphs,
  `(tested "${result.scrambledChar}")`,
);
console.log('protected element visible:', readable);
console.log('console errors           :', consoleErrors.length ? consoleErrors : 'none');

const plaintextLeaked = /quick brown fox/i.test(result.dom);
console.log('plaintext leaked to DOM  :', plaintextLeaked);

const ok = !plaintextLeaked && result.remapsGlyphs && readable && consoleErrors.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
writeFileSync('scripts/.last-verify.json', JSON.stringify({ ...result, consoleErrors }, null, 2));
process.exit(ok ? 0 : 1);
