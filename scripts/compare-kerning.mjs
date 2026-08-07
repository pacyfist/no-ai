/**
 * Renders the readable text and the protected text one above the other, large,
 * so the visual cost of the forged font (which carries no kerning table) can be
 * judged directly. Dev-only helper; all strings come from the page itself.
 */
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 460, deviceScaleFactor: 3 });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !document.querySelector('.protected-body')?.style.visibility);

await page.evaluate(() => {
  const el = document.querySelector('.protected-body');
  const forgedFamily = getComputedStyle(el).fontFamily;
  const scrambled = el.textContent; // renders readable via forged font
  const readable = 'The quick brown fox jumps over the lazy dog. AVATAR To Yo. 1970';

  const wrap = document.createElement('div');
  wrap.setAttribute(
    'style',
    'padding:28px;background:#fff;color:#000;font:400 30px "Roboto",sans-serif',
  );

  const label = (t) => {
    const d = document.createElement('div');
    d.setAttribute('style', 'font:400 12px monospace;color:#888;margin:14px 0 4px');
    d.textContent = t;
    return d;
  };
  const line = (t, family) => {
    const d = document.createElement('div');
    if (family) d.style.fontFamily = family;
    d.textContent = t;
    return d;
  };

  wrap.append(
    label('PLAIN ROBOTO — kerned by the browser'),
    line(readable, null),
    label('FORGED FONT — same typeface, no kern table'),
    line(scrambled.slice(0, 63), forgedFamily),
  );

  document.body.replaceChildren(wrap);
});

await page.screenshot({ path: 'scripts/kerning-compare.png' });
await browser.close();
console.log('wrote scripts/kerning-compare.png');
