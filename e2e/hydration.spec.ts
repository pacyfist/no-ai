import { expect, test } from '@playwright/test';

const decode = (s: string) =>
  s
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');

/**
 * Guards the bug that shipped once already: `<p noAi>literal</p>` takes the
 * element's own text as the original, and on a hydrating page that text is
 * already ciphertext. Scrambling it a second time leaves the reader looking at
 * the server's output, because the font only ever undoes one layer.
 *
 * The site is a static file, so every request carries the same baked seed and
 * the served text and the hydrated text are directly comparable.
 */
test.describe('hydration', () => {
  test('the static form is not scrambled twice', async ({ page, request }) => {
    const html = await (await request.get('./')).text();
    // Not anchored to `<p class=` — Angular emits other attributes first.
    const served = decode(
      html.match(/<p[^>]*class="api-demo[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '',
    ).trim();

    expect(served, 'no api-demo element found in the served HTML').not.toBe('');

    await page.goto('./');
    const hydrated = (await page.locator('.api-demo').first().textContent())!.trim();

    expect(hydrated).toBe(served);
  });

  test('server-scrambled elements are marked so the client can tell', async ({ page, request }) => {
    const html = await (await request.get('./')).text();
    expect(html).toContain('data-no-ai-ssr');

    await page.goto('./');
    await expect(page.locator('.protected-body')).toHaveAttribute('data-no-ai-ssr', '');
  });

  test('the client rebuilds the exact cipher the server used', async ({ page, request }) => {
    const html = await (await request.get('./')).text();
    const seed = html.match(/"noAiSeed":(\d+)/)?.[1];
    expect(seed, 'no noAiSeed in the transfer state').toBeTruthy();

    await page.goto('./');
    const family = await page
      .locator('.protected-body')
      .evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0].replaceAll('"', '').trim());

    expect(family).toBe(`NoAi-${Number(seed).toString(36)}`);
  });

  test('all three template APIs render readable text', async ({ page }) => {
    await page.goto('./');
    const demos = page.locator('.api-demo');
    await expect(demos).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const el = demos.nth(i);
      await expect(el).toBeVisible();
      const stack = await el.evaluate((e) => getComputedStyle(e).fontFamily);
      expect(stack, `api-demo ${i} is not using a forged font`).toMatch(/NoAi-/);
    }
  });
});
