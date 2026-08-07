import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RawHtmlSection, excerptAround } from './raw-html-section';

const SERVED = `<html><body><p class="protected-body">Kf~0 |0#: e(0 9'6Z</p></body></html>`;

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true })],
  });
  const fixture = TestBed.createComponent(RawHtmlSection);
  fixture.detectChanges();

  // The load runs in afterNextRender and awaits response.text(), so settling it
  // takes more than one microtask turn.
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('excerptAround', () => {
  it('returns a window centred on the marker', () => {
    const html = `${'a'.repeat(500)}MARKER${'b'.repeat(500)}`;
    const excerpt = excerptAround(html, 'MARKER', 20);

    expect(excerpt).toContain('MARKER');
    expect(excerpt.length).toBeLessThan(html.length);
  });

  it('marks both ends as elided when it trims', () => {
    const html = `${'a'.repeat(500)}MARKER${'b'.repeat(500)}`;
    expect(excerptAround(html, 'MARKER', 20).startsWith('…')).toBe(true);
    expect(excerptAround(html, 'MARKER', 20).endsWith('…')).toBe(true);
  });

  it('falls back to the head of the document when the marker is absent', () => {
    expect(excerptAround('no marker here', 'MARKER', 5)).toContain('no ma');
  });
});

describe('RawHtmlSection', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the bytes the server returned for this URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL) => new Response(SERVED, { status: 200 })),
    );
    const { el } = await setup();

    expect(el.querySelector('pre')?.textContent).toContain("Kf~0 |0#: e(0 9'6Z");
  });

  it('warns and falls back to the DOM when the page cannot be re-fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL) => {
        throw new Error('offline');
      }),
    );
    const { el } = await setup();

    expect(el.textContent).toContain('Could not re-fetch');
    expect(el.textContent).toContain('offline');
  });

  it('treats a non-ok response as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL) => new Response(null, { status: 503 })),
    );
    const { el } = await setup();

    expect(el.textContent).toContain('Could not re-fetch');
    expect(el.textContent).toContain('503');
  });

  it('states that static hosting pins the cipher', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL) => new Response(SERVED, { status: 200 })),
    );
    const { el } = await setup();

    expect(el.textContent).toContain('same substitution');
  });
});
