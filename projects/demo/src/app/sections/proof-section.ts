import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiFontService, NoAiPipe } from '@pacyfist/no-ai';

/** The sample the whole page is built around. The build guard greps for it. */
export const PROTECTED_ARTICLE =
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen ' +
  'liquor jugs. How vexingly quick daft zebras jump! 0123456789 — this ' +
  'paragraph is stored in the DOM as gibberish and repaired by a font that ' +
  'was generated in your browser a moment ago.';

const PROTECTED_HEADLINE = 'Everything below this line is protected';

@Component({
  selector: 'app-proof-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective, NoAiFontDirective, NoAiPipe],
  template: `
    <div class="grid gap-5 lg:grid-cols-2">
      <div class="card bg-base-100 border-base-300 border shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-base-content/60 text-xs tracking-widest uppercase">
            {{ noAi.revealed() ? 'What a scraper sees' : 'What a human reads' }}
          </h2>
          <h3 class="mt-1 text-lg font-semibold" noAiFont aria-hidden="true">
            {{ headline | noAi }}
          </h3>
          <p class="protected-body leading-relaxed" aria-hidden="true" [noAi]="article"></p>

          <!-- Protected text reads as gibberish to a screen reader. The library
               README tells consumers to pair it with an accessible copy; the
               demo should do what it recommends. -->
          <p class="sr-only">{{ headline }} {{ article }}</p>

          <div class="divider my-2"></div>
          <p class="text-base-content/60 text-sm">
            Select this paragraph and copy it, then paste it on the right.
          </p>
        </div>
      </div>

      <div class="card bg-base-100 border-base-300 border shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-base-content/60 text-xs tracking-widest uppercase">
            Paste it back here
            @if (hasPaste()) {
              @if (pasteIsReadable()) {
                <span class="badge badge-error badge-soft badge-xs ml-1 normal-case"
                  >came through intact</span
                >
              } @else {
                <span class="badge badge-warning badge-soft badge-xs ml-1 normal-case"
                  >unusable</span
                >
              }
            }
          </h2>

          <textarea
            class="textarea dom-dump mt-1 min-h-40 w-full flex-1 font-mono text-sm leading-relaxed"
            placeholder="Paste the copied paragraph here…"
            aria-label="Paste the copied paragraph"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            [value]="pasted()"
            (input)="onPaste($event)"
          ></textarea>

          @if (hasPaste()) {
            <div class="mt-2 flex items-center justify-between gap-2">
              <span class="text-base-content/60 text-xs">
                {{ pasted().length }} characters pasted
              </span>
              <button type="button" class="btn btn-ghost btn-xs" (click)="clearPaste()">
                Clear
              </button>
            </div>
          }

          <div class="divider my-2"></div>
          <p class="text-base-content/60 text-sm">
            The clipboard carries the DOM's characters, not the glyphs you saw. This is the same
            string an HTML parser or a crawler receives.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ProofSection {
  protected readonly noAi = inject(NoAiFontService);

  protected readonly headline = PROTECTED_HEADLINE;
  protected readonly article = PROTECTED_ARTICLE;

  /** Whatever the visitor pasted back after copying the protected paragraph. */
  protected readonly pasted = signal('');

  protected readonly hasPaste = computed(() => this.pasted().trim().length > 0);

  /**
   * Whether the clipboard round-trip survived — true only if protection is off
   * or broken, which is exactly what makes the comparison worth showing.
   */
  protected readonly pasteIsReadable = computed(
    () => this.hasPaste() && this.pasted().trim() === this.article.trim(),
  );

  protected onPaste(event: Event): void {
    this.pasted.set((event.target as HTMLTextAreaElement).value);
  }

  protected clearPaste(): void {
    this.pasted.set('');
  }
}
