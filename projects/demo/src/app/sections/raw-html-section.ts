import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  signal,
} from '@angular/core';

const MARKER = 'protected-body';

/** A readable window of `html` centred on `marker`, or its head if absent. */
export function excerptAround(html: string, marker: string, radius = 400): string {
  const at = html.indexOf(marker);
  if (at === -1) return html.slice(0, radius * 2);

  const start = Math.max(0, at - radius);
  const end = Math.min(html.length, at + radius);
  return `${start > 0 ? '…' : ''}${html.slice(start, end)}${end < html.length ? '…' : ''}`;
}

/**
 * Re-fetches this very URL and shows what came back.
 *
 * That response is the literal file the host served — the same bytes a crawler
 * downloads — which is only true because the route is prerendered.
 */
@Component({
  selector: 'app-raw-html-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-10">
      <h2 class="mb-2 text-xl font-bold">What the server actually sent</h2>
      <p class="text-base-content/70 mb-4 max-w-3xl">
        This page re-requested its own URL and printed the response. No JavaScript ran on it — it is
        the same HTML a crawler receives.
      </p>

      @if (warning(); as message) {
        <div role="alert" class="alert alert-warning alert-soft mb-3">
          <span class="text-sm">{{ message }}</span>
        </div>
      }

      @if (source() !== null) {
        <div class="bg-base-300/40 border-base-300 rounded-lg border">
          <pre
            class="dom-dump max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed"
          ><code>{{ excerpt() }}</code></pre>
        </div>
      } @else {
        <div class="alert">
          <span class="loading loading-spinner loading-sm"></span>
          <span class="text-sm">Fetching this page…</span>
        </div>
      }

      <p class="text-base-content/60 mt-3 max-w-3xl text-sm">
        One caveat this page owes you: it is statically prerendered, so the cipher was fixed when
        the site was built. Every visitor gets the same substitution, which frequency analysis
        solves once and reuses forever. A server rendering per request draws a fresh cipher each
        time; static hosting cannot.
      </p>
    </section>
  `,
})
export class RawHtmlSection {
  protected readonly source = signal<string | null>(null);
  protected readonly warning = signal<string | null>(null);

  protected readonly excerpt = computed(() => excerptAround(this.source() ?? '', MARKER));

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      const response = await fetch(location.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      this.source.set(await response.text());
    } catch (error) {
      this.warning.set(
        `Could not re-fetch this page (${(error as Error).message}). Showing the ` +
          'text held in the DOM instead — the same characters, one step later.',
      );
      this.source.set(document.querySelector(`.${MARKER}`)?.textContent ?? '');
    }
  }
}
