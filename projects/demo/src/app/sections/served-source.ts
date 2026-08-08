import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { SectionHeading } from '../ui/section-heading';

type Status = 'loading' | 'ok' | 'error';

/**
 * Fetches the page's own served HTML and shows the protected paragraph from it.
 *
 * The evidence is the response body rather than anything this component
 * composed, which is the only reason the section is worth having.
 */
@Component({
  selector: 'app-served-source',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading],
  template: `
    <app-section-heading num="03" title="At the source" />
    <p class="text-base-content/60 mb-4 max-w-3xl text-sm leading-relaxed">
      Not our word for it. This section requests this page from the server again and shows you the
      protected paragraph exactly as it arrives, before any JavaScript runs. It is what a crawler
      receives.
    </p>

    <div class="mockup-browser border-base-300 bg-base-100 border">
      <div class="mockup-browser-toolbar">
        <div class="input text-xs">{{ url() }}</div>
        @if (status() === 'ok') {
          <span class="badge badge-primary badge-sm ml-2">200</span>
        }
      </div>
      <div class="bg-base-200 px-4 py-4">
        @switch (status()) {
          @case ('loading') {
            <span class="loading loading-dots loading-sm"></span>
          }
          @case ('error') {
            <p class="text-warning font-mono text-xs">{{ error() }}</p>
          }
          @case ('ok') {
            <pre
              class="text-primary overflow-x-auto font-mono text-xs whitespace-pre-wrap"
            ><code>{{ markup() }}</code></pre>
          }
        }
      </div>
    </div>

    <p class="text-base-content/60 mt-3 max-w-3xl text-sm leading-relaxed">
      The <code class="font-mono">data-no-ai-ssr</code> attribute is how a hydrating element is told
      apart from one the browser rendered itself. Without it the client would take the server's
      ciphertext for the original and scramble it a second time, and the font only ever undoes one
      layer.
    </p>
  `,
})
export class ServedSource {
  private readonly document = inject(DOCUMENT);

  protected readonly url = signal('');
  protected readonly status = signal<Status>('loading');
  protected readonly markup = signal('');
  protected readonly error = signal('');

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    const href = this.document.baseURI;
    this.url.set(href);

    try {
      const response = await fetch(href, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const protectedEl = parsed.querySelector('[data-no-ai-ssr]');

      if (!protectedEl) {
        this.error.set(
          'No element carrying data-no-ai-ssr was found in the response. On a dev server without SSR this is expected.',
        );
        this.status.set('error');
        return;
      }

      this.markup.set(protectedEl.outerHTML);
      this.status.set('ok');
    } catch (cause) {
      this.error.set(`Could not fetch this page's own HTML: ${(cause as Error).message}`);
      this.status.set('error');
    }
  }
}
