import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, baseFontBuffer, resetBaseFontBuffer } from './font-source';

function setBaseHref(href: string): void {
  document.head.querySelector('base')?.remove();
  const base = document.createElement('base');
  base.setAttribute('href', href);
  document.head.prepend(base);
}

describe('font-source', () => {
  beforeEach(() => resetBaseFontBuffer());
  afterEach(() => {
    vi.unstubAllGlobals();
    document.head.querySelector('base')?.remove();
  });

  it('resolves asset paths against the base href, not the document root', () => {
    setBaseHref('/no-ai/');
    expect(assetUrl('fonts/Roboto-Regular.ttf')).toBe(
      new URL('/no-ai/fonts/Roboto-Regular.ttf', location.origin).href,
    );
  });

  it('resolves against the root when the app is served from the root', () => {
    setBaseHref('/');
    expect(assetUrl('fonts/Roboto-Regular.ttf')).toBe(
      new URL('/fonts/Roboto-Regular.ttf', location.origin).href,
    );
  });

  it('fetches the base font exactly once no matter how many callers ask', async () => {
    setBaseHref('/no-ai/');
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL) => new Response(new ArrayBuffer(8), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([baseFontBuffer(), baseFontBuffer()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/no-ai/fonts/Roboto-Regular.ttf');
    expect(a.byteLength).toBe(8);
    expect(b.byteLength).toBe(8);
  });

  it('rejects with the status when the font cannot be fetched', async () => {
    setBaseHref('/no-ai/');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL) => new Response(null, { status: 404 })),
    );

    await expect(baseFontBuffer()).rejects.toThrow('404');
  });

  it('does not cache a failed fetch', async () => {
    setBaseHref('/no-ai/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(baseFontBuffer()).rejects.toThrow('500');
    await expect(baseFontBuffer()).resolves.toBeInstanceOf(ArrayBuffer);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
