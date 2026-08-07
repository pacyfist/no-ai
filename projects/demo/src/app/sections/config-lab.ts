import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  OnDestroy,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { provideNoAi } from '@pacyfist/no-ai';
import type { NoAiConfig } from '@pacyfist/no-ai';
import { baseFontBuffer } from '../font-source';
import { CodeBlock } from './code-block';
import { ConfigCard } from './config-card';

export interface LabCard {
  title: string;
  explains: string;
  sample: string;
  code: string;
  config: NoAiConfig;
}

const DIGITS = Array.from({ length: 10 }, (_, i) => 0x30 + i);

/** Shared by every card, so the base font is fetched once for the whole page. */
const SHARED_FONT = { font: baseFontBuffer, fallbackFontFamily: "'Roboto', sans-serif" } as const;

/**
 * Every card that forges a font needs its own seed.
 *
 * `NoAiFontService` derives the FontFace family name from the seed alone
 * (`NoAi-${seed.toString(36)}`). Cards without an explicit seed all inherit the
 * page's transferred seed, so they register different cmaps under one family
 * name — and the browser then paints text with whichever face it picked. The
 * narrow-charset card is where that shows: its letters are outside the cipher
 * and must stay plain, but the shell's full-ASCII face would remap them.
 */

export const LAB_CARDS: readonly LabCard[] = [
  {
    title: 'Pinned cipher',
    explains:
      'This card always draws substitution 12345, whatever seed the rest of the page is using. For tests and reproducible builds only — a constant cipher is solved once and reused forever. Note that this page is statically prerendered, so its own seed is baked in at build time and does not change between reloads either.',
    sample: 'The same substitution on every single page load.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  seed: 12345,\n})`,
    config: { ...SHARED_FONT, seed: 12345 },
  },
  {
    title: 'Kill switch',
    explains:
      'Nothing is scrambled and no font is forged. Flip this per environment when you want the feature off without removing the directives.',
    sample: 'Untouched text, readable by everything including scrapers.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  disabled: true,\n})`,
    config: { ...SHARED_FONT, disabled: true },
  },
  {
    title: 'Narrow charset',
    explains:
      'Only the ten digits are in the cipher, so letters pass through untouched. Useful when just the numbers matter — prices, counts, phone numbers.',
    sample: 'Order 8391 shipped on 2026-08-07 for 429 units.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  charset: [0x30, /* … */ 0x39],\n  seed: 24680, // own family name\n})`,
    config: { ...SHARED_FONT, charset: DIGITS, seed: 24680 },
  },
  {
    title: 'No hiding',
    explains:
      'Protected text paints immediately instead of waiting for the font, so a reader may glimpse raw ciphertext. The trade is that visitors without JavaScript see scrambled text rather than nothing at all.',
    sample: 'Visible from the first frame, gibberish included.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  hideUntilReady: false,\n  seed: 13579, // own family name\n})`,
    config: { ...SHARED_FONT, hideUntilReady: false, seed: 13579 },
  },
];

@Component({
  selector: 'app-config-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, CodeBlock],
  template: `
    <section class="mt-10">
      <h2 class="mb-2 text-xl font-bold">Configuration, running live</h2>
      <p class="text-base-content/70 mb-4 max-w-3xl">
        Each card below is a separate instance of the library with its own settings — a real child
        injector, not a mock.
      </p>

      @defer (on viewport) {
        <div class="grid gap-4 md:grid-cols-2">
          @for (card of cards; track card.title) {
            <div class="card bg-base-100 border-base-300 border">
              <div class="card-body gap-3 p-5">
                <h3 class="text-base-content/60 text-xs tracking-widest uppercase">
                  {{ card.title }}
                </h3>
                <ng-container
                  *ngComponentOutlet="
                    ConfigCard;
                    environmentInjector: injectorFor(card);
                    inputs: { text: card.sample }
                  "
                />
                <p class="text-base-content/60 text-sm">{{ card.explains }}</p>
                <app-code-block [code]="card.code" language="ts" />
              </div>
            </div>
          }
        </div>
      } @placeholder {
        <div
          class="text-base-content/50 border-base-300 rounded-lg border border-dashed p-8 text-sm"
        >
          Scroll down to build four more fonts…
        </div>
      }
    </section>
  `,
})
export class ConfigLab implements OnDestroy {
  private readonly parent = inject(EnvironmentInjector);
  private readonly injectors = new Map<string, EnvironmentInjector>();

  protected readonly ConfigCard = ConfigCard;
  protected readonly cards = LAB_CARDS;

  /**
   * One injector per card, created once and reused. Building a fresh one every
   * change detection pass would forge a new font each cycle.
   */
  protected injectorFor(card: LabCard): EnvironmentInjector {
    let injector = this.injectors.get(card.title);
    if (!injector) {
      injector = createEnvironmentInjector(
        [provideNoAi(card.config)],
        this.parent,
        `no-ai:${card.title}`,
      );
      this.injectors.set(card.title, injector);
    }
    return injector;
  }

  ngOnDestroy(): void {
    this.injectors.forEach((injector) => injector.destroy());
    this.injectors.clear();
  }
}
