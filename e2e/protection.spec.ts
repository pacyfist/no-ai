import { expect, test } from '@playwright/test';

/** A phrase that appears only in the protected article body. */
const PLAINTEXT = 'quick brown fox';

test.describe('the central claim', () => {
  test('the served HTML a crawler downloads is scrambled', async ({ request }) => {
    const html = await (await request.get('./')).text();

    expect(html.toLowerCase()).not.toContain(PLAINTEXT);
    expect(html).toContain('protected-body');
  });

  test('the DOM text is scrambled while the paragraph still reads on screen', async ({ page }) => {
    await page.goto('./');
    const body = page.locator('.protected-body');

    // hideUntilReady keeps it invisible until the font lands, so waiting for
    // visibility is also waiting for the forge to finish.
    await expect(body).toBeVisible();
    await expect(body).not.toContainText(PLAINTEXT);
    expect((await body.textContent())!.length).toBeGreaterThan(50);
  });

  test('the forged font is registered and actually remaps glyphs', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.protected-body')).toBeVisible();

    const result = await page.evaluate(() => {
      const el = document.querySelector('.protected-body') as HTMLElement;
      const stack = getComputedStyle(el).fontFamily;
      const forged = stack.split(',')[0].replaceAll('"', '').trim();

      // Rasterise one scrambled character with the forged font and the same
      // character with plain Roboto. If the font is really remapping, the two
      // bitmaps must differ — this is the only direct evidence available.
      const draw = (ch: string, font: string) => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d')!;
        ctx.font = font;
        ctx.textBaseline = 'top';
        ctx.fillText(ch, 4, 4);
        return c.toDataURL();
      };

      const ch = el.textContent!.trim()[0];
      return {
        forged,
        families: [...document.fonts].map((f) => f.family),
        remaps: draw(ch, `48px "${forged}"`) !== draw(ch, '48px Roboto'),
      };
    });

    expect(result.forged).toMatch(/^NoAi-/);
    expect(result.families).toContain(result.forged);
    expect(result.remaps).toBe(true);
  });

  test('the page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto('./');
    await expect(page.locator('.protected-body')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('withholding the font exposes the raw characters', async ({ page }) => {
    await page.goto('./');
    const body = page.locator('.protected-body');
    await expect(body).toBeVisible();

    const before = await body.textContent();
    await page.getByRole('checkbox').first().check();

    // Reveal drops the forged font; it must NOT change the underlying text.
    await expect(body).toHaveText(before!.trim());
    const stack = await body.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(stack).not.toMatch(/NoAi-/);
  });
});

test.describe('assets under the /no-ai/ base path', () => {
  // An absolute /fonts/... resolves outside the subpath, 404s, and the library
  // then fails open into a page that looks perfect and protects nothing.
  test('every request the page makes succeeds', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));

    await page.goto('./');
    await expect(page.locator('.protected-body')).toBeVisible();

    expect(failed).toEqual([]);
  });

  test('the base font is reachable', async ({ request }) => {
    const response = await request.get('./fonts/Roboto-Regular.ttf');
    expect(response.status()).toBe(200);
    expect((await response.body()).byteLength).toBeGreaterThan(1000);
  });
});
