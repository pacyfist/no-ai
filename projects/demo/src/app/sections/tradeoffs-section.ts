import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-tradeoffs-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-10">
      <h2 class="mb-4 text-xl font-bold">What this actually buys you</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="card bg-base-100 border-success/30 border">
          <div class="card-body p-5">
            <span class="badge badge-success badge-soft badge-sm mb-1">Stops</span>
            <p class="text-base-content/80 text-sm leading-relaxed">
              Bulk text extraction: <code class="kbd kbd-xs">fetch</code> plus an HTML parse,
              <code class="kbd kbd-xs">innerText</code> scraping, copy-paste into a chat window. The
              server-rendered HTML is scrambled too, so crawlers that never run JavaScript get
              nothing readable.
            </p>
          </div>
        </div>
        <div class="card bg-base-100 border-error/30 border">
          <div class="card-body p-5">
            <span class="badge badge-error badge-soft badge-sm mb-1">Does not stop</span>
            <p class="text-base-content/80 text-sm leading-relaxed">
              A determined adversary. The generated font is downloadable and its
              <code class="kbd kbd-xs">cmap</code> describes the substitution completely &mdash;
              anyone willing to parse it can invert the cipher. Rendering the page and running OCR
              also defeats it.
            </p>
          </div>
        </div>
        <div class="card bg-base-100 border-warning/30 border">
          <div class="card-body p-5">
            <span class="badge badge-warning badge-soft badge-sm mb-1">Costs you</span>
            <p class="text-base-content/80 text-sm leading-relaxed">
              Screen-reader output, in-page search, and copy-paste on protected text. That is the
              same mechanism, not a bug &mdash; a readable fallback for assistive technology would
              sit in the HTML for scrapers to take. Protect article bodies; leave navigation,
              headings, and anything assistive technology needs alone.
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class TradeoffsSection {}
