import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NoAiDirective, NoAiFontService } from '@pacyfist/no-ai';
import { MirrorPanel } from '../ui/mirror-panel';

const DEFAULT_TEXT = 'The letters you are reading were never stored.';

/**
 * The page's opening argument: the same sentence as a reader sees it and as
 * `innerText` returns it, side by side, with nothing to click.
 */
@Component({
  selector: 'app-hero-mirror',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MirrorPanel, NoAiDirective],
  template: `
    <h1 class="mt-12 max-w-2xl text-3xl leading-tight font-bold tracking-tight md:text-4xl">
      What you read and what the machine reads are
      <span class="text-primary">not the same bytes</span>.
    </h1>
    <p class="text-base-content/60 mt-2 mb-6 text-sm">Edit the text. Both sides follow you.</p>

    <!-- The page's SSR specimen. Element content rather than a binding, because
         only that form is scrambled during prerender and only that form carries
         the data-no-ai-ssr marker section 03 goes looking for. -->
    <p class="sr-only">A protected specimen follows, deliberately unreadable in the page source.</p>
    <p class="border-primary mb-4 border-l-2 pl-3 text-sm leading-relaxed" aria-hidden="true" noAi>
      This sentence was scrambled on the server. Search the page source for it and you will not find
      it, but you are reading it right now.
    </p>

    <app-mirror-panel [readable]="text()" [scrambled]="scrambled()" />

    <div class="card bg-base-100 mt-3 shadow-sm">
      <div class="card-body flex-row flex-wrap items-center gap-4 p-4">
        <input
          class="input input-sm min-w-56 flex-1"
          [value]="text()"
          (input)="onType($event)"
          aria-label="Text to scramble"
        />
        <label class="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            class="toggle toggle-sm"
            [checked]="noAi.revealed()"
            (change)="noAi.revealed.set(!noAi.revealed())"
          />
          withhold the font
        </label>
      </div>
    </div>

    <div class="stats stats-vertical sm:stats-horizontal bg-base-100 mt-3 w-full shadow-sm">
      <div class="stat">
        <div class="stat-title">seed</div>
        <div class="stat-value text-primary font-mono text-2xl">{{ noAi.map.seed }}</div>
        <div class="stat-desc">fixed at build time</div>
      </div>
      <div class="stat">
        <div class="stat-title">glyphs forged</div>
        <div class="stat-value font-mono text-2xl">{{ glyphCount() }}</div>
        <div class="stat-desc">printable ASCII</div>
      </div>
      <div class="stat">
        <div class="stat-title">fixed points</div>
        <div class="stat-value font-mono text-2xl">{{ fixedPoints() }}</div>
        <div class="stat-desc">a derangement</div>
      </div>
      <div class="stat">
        <div class="stat-title">status</div>
        <div class="stat-value text-primary text-xl">
          {{ noAi.failed() ? 'failed open' : noAi.active() ? 'active' : 'off' }}
        </div>
        <div class="stat-desc">never breaks the page</div>
      </div>
    </div>

    <p class="text-base-content/50 mt-3 text-xs leading-relaxed">
      Full disclosure: this sentence also ships readable inside the JavaScript bundle, because
      Angular compiles template text into it. Demo copy was never the thing being protected. The
      evidence that matters is the served HTML in section 03.
    </p>
  `,
})
export class HeroMirror {
  protected readonly noAi = inject(NoAiFontService);
  protected readonly text = signal(DEFAULT_TEXT);
  protected readonly scrambled = computed(() => this.noAi.scramble(this.text()));
  protected readonly glyphCount = computed(() => this.noAi.map.forward.size);

  /**
   * Counted rather than hardcoded.
   *
   * It is always zero, because the library builds a derangement. The point is
   * that this page reports what it measured, on a page whose whole argument is
   * that it shows rather than claims.
   */
  protected readonly fixedPoints = computed(
    () => [...this.noAi.map.forward].filter(([from, to]) => from === to).length,
  );

  protected onType(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }
}
