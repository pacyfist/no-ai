import { expect, test } from '@playwright/test';

/**
 * The lab renders four real child injectors, each with its own service, cipher
 * and forged font. It sits behind `@defer (on viewport)` because a child
 * service instantiated during prerender would write to the one shared
 * TransferState seed key and clobber the shell's cipher.
 */
test.describe('the configuration lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.locator('app-config-lab').scrollIntoViewIfNeeded();
    await expect(page.locator('.config-sample').first()).toBeVisible();
  });

  test('renders four independent instances', async ({ page }) => {
    await expect(page.locator('.config-sample')).toHaveCount(4);
  });

  test('no two forged fonts share a family name', async ({ page }) => {
    // Regression: familyName derives from the seed alone, so instances without
    // an explicit seed inherit the page's and register conflicting cmaps under
    // one family. The browser then paints with whichever face it picked.
    const forged = await page.evaluate(() =>
      [...document.fonts].map((f) => f.family).filter((f) => /^(NoAi|Lab)-/.test(f)),
    );

    expect(forged.length).toBeGreaterThan(1);
    expect(new Set(forged).size, `duplicate forged families: ${forged.join(', ')}`).toBe(
      forged.length,
    );
  });

  test('the pinned-seed instance uses the seed it was given', async ({ page }) => {
    const card = page.locator('app-config-lab .card').filter({ hasText: 'Pinned cipher' });
    const stack = await card
      .locator('.config-sample')
      .evaluate((el) => getComputedStyle(el).fontFamily);

    expect(stack).toContain(`NoAi-${(12345).toString(36)}`);
  });

  test('the kill switch leaves its text readable and forges nothing', async ({ page }) => {
    const card = page.locator('app-config-lab .card').filter({ hasText: 'Kill switch' });
    const sample = card.locator('.config-sample');

    await expect(sample).toContainText('Untouched text');
    expect(await sample.evaluate((el) => getComputedStyle(el).fontFamily)).not.toMatch(/NoAi-/);
  });

  test('the kill switch does not hide readable text from assistive technology', async ({
    page,
  }) => {
    // aria-hidden belongs on ciphered specimens only. Applying it to text that
    // is genuinely readable imposes the cost without the protection.
    const sample = page
      .locator('app-config-lab .card')
      .filter({ hasText: 'Kill switch' })
      .locator('.config-sample');

    await expect(sample).not.toHaveAttribute('aria-hidden', 'true');
  });

  test('the narrow charset ciphers digits and leaves letters alone', async ({ page }) => {
    const sample = page
      .locator('app-config-lab .card')
      .filter({ hasText: 'Narrow charset' })
      .locator('.config-sample');

    const text = (await sample.textContent())!;

    // Letters are outside the cipher, so they survive verbatim in the DOM.
    expect(text).toContain('Order');
    expect(text).toContain('shipped');
    // The digits do not.
    expect(text).not.toContain('8391');
  });
});

test.describe('prerender safety', () => {
  test('no lab instance renders during prerender', async ({ request }) => {
    // A child service running on the server overwrites the shell's seed in
    // TransferState, and the client then rebuilds the wrong cipher.
    const html = await (await request.get('./')).text();

    expect(html).not.toContain('config-sample');
  });
});
