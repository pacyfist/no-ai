import { expect, test } from '@playwright/test';

/**
 * The page claims the clipboard carries the DOM's characters rather than the
 * glyphs you read. Nothing else verifies that: the unit tests run without a
 * FontFace, and reading `textContent` is a weaker statement than a real copy.
 *
 * This drives a genuine selection, a genuine Ctrl+C and the system clipboard.
 */
test.describe('copy-paste', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('copying protected text yields ciphertext, not the words on screen', async ({ page }) => {
    await page.goto('./');
    const body = page.locator('.protected-body');
    await expect(body).toBeVisible();

    // Select the paragraph the way a person dragging across it would.
    await body.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });

    await page.keyboard.press('ControlOrMeta+c');

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());

    expect(clipboard.length).toBeGreaterThan(50);
    expect(clipboard.toLowerCase()).not.toContain('quick brown fox');
    expect(clipboard.trim()).toBe((await body.textContent())!.trim());
  });

  test('pasting it back is judged unusable', async ({ page }) => {
    await page.goto('./');
    const body = page.locator('.protected-body');
    await expect(body).toBeVisible();

    await body.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.keyboard.press('ControlOrMeta+c');

    const textarea = page.locator('textarea.dom-dump');
    await textarea.click();
    await page.keyboard.press('ControlOrMeta+v');

    await expect(textarea).not.toHaveValue(/quick brown fox/i);
    await expect(page.getByText('scrambled — unusable')).toBeVisible();
  });

  test('a partial readable paste is not mislabelled as unusable', async ({ page }) => {
    // Regression: comparing the paste against the whole article labelled every
    // partial copy "unusable", which is the opposite of the truth.
    await page.goto('./');
    await expect(page.locator('.protected-body')).toBeVisible();

    await page.locator('textarea.dom-dump').fill('Pack my box with five dozen liquor jugs');

    await expect(page.getByText('came through readable')).toBeVisible();
    await expect(page.getByText('scrambled — unusable')).toBeHidden();
  });
});
