import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiFontService } from '@pacyfist/no-ai';
import { SectionHeading } from '../ui/section-heading';

const COPY_ME = 'Select this sentence and copy it, then look at the panel below.';

/**
 * The costs, demonstrated rather than listed.
 *
 * Wording here tracks the README's trade-offs section. If one changes, change
 * the other.
 */
@Component({
  selector: 'app-costs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, NoAiDirective, NoAiFontDirective],
  template: `
    <app-section-heading num="07" title="What it costs you" />
    <p class="text-base-content/60 mb-4 max-w-3xl text-sm leading-relaxed">
      These are the same mechanism as the protection, not bugs waiting to be fixed. Weigh them
      before you protect anything.
    </p>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title text-xs">Find in page</h3>
          <p class="sr-only">A protected specimen naming a word to search for follows.</p>
          <p class="text-sm" aria-hidden="true" noAi>Search this page for the word haystack.</p>
          <p class="text-base-content/60 text-xs leading-relaxed">
            Press <kbd class="kbd kbd-xs">Ctrl</kbd> <kbd class="kbd kbd-xs">F</kbd> and search for
            the word in the line above. You can read it. The browser cannot find it, because it
            searches the DOM and the DOM holds ciphertext.
          </p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title text-xs">Copy and paste</h3>
          <p class="sr-only">A protected specimen you are invited to copy follows.</p>
          <!-- Element content, not an interpolation. Putting {{ }} inside a noAi
               element is the documented trap: the directive takes over
               textContent and detaches the node Angular then writes into. The
               constant is spliced in here so this copy and the announced()
               readout below cannot drift apart. -->
          <p class="text-sm" aria-hidden="true" noAi (copy)="onCopy()">${COPY_ME}</p>
          <div class="border-base-300 mt-2 border-t pt-2">
            <div class="text-base-content/50 text-xs tracking-widest uppercase">your clipboard</div>
            @if (copied(); as taken) {
              <p class="text-primary mt-1 font-mono text-xs break-all">{{ taken }}</p>
            } @else {
              <p class="text-base-content/40 mt-1 text-xs">waiting for you to copy...</p>
            }
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title text-xs">Screen readers</h3>
          <p class="text-base-content/60 text-xs leading-relaxed">
            Assistive technology reads the DOM, so it announces the ciphertext. This is the exact
            string a screen reader would speak for the sentence above:
          </p>
          <p class="text-warning mt-2 font-mono text-xs break-all">{{ announced() }}</p>
          <p class="text-base-content/60 mt-2 text-xs leading-relaxed">
            Every protected specimen on this page is paired with a plain description that assistive
            technology can reach instead.
          </p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title text-xs">No kerning</h3>
          <p class="text-base-content/60 text-xs leading-relaxed">
            The forged font carries no <span class="font-mono">kern</span> or
            <span class="font-mono">GPOS</span> table, so pairs that should tuck together do not.
            Negligible in body text, visible at display sizes.
          </p>
          <div class="mt-2 grid grid-cols-2 gap-2 text-center">
            <div>
              <div class="text-base-content/50 text-xs tracking-widest uppercase">base</div>
              <div class="text-4xl">AV To</div>
            </div>
            <div>
              <div class="text-base-content/50 text-xs tracking-widest uppercase">forged</div>
              <div class="text-4xl" aria-hidden="true" noAiFont>{{ kernSample() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="alert mt-4 text-sm">
      <span>
        Protect article bodies. Leave navigation, headings, form labels and anything assistive
        technology needs alone.
      </span>
    </div>
  `,
})
export class Costs {
  private readonly document = inject(DOCUMENT);
  private readonly noAi = inject(NoAiFontService);

  protected readonly copied = signal('');

  // computed, not signal: if the font fails to load the library stops
  // scrambling, and these readouts have to stop lying about it.
  protected readonly announced = computed(() => this.noAi.scramble(COPY_ME));
  protected readonly kernSample = computed(() => this.noAi.scramble('AV To'));

  protected onCopy(): void {
    // Read the selection rather than the clipboard: no permission prompt, and
    // a partial selection is reported honestly instead of being called a miss.
    const taken = this.document.getSelection()?.toString() ?? '';
    this.copied.set(taken);
  }
}
