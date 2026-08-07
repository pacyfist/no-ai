import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiFontService, NoAiPipe } from '@pacyfist/no-ai';

@Component({
  selector: 'app-root',
  imports: [NoAiDirective, NoAiFontDirective, NoAiPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly noAi = inject(NoAiFontService);

  protected readonly headline = signal('Everything below this line is protected');

  protected readonly article = signal(
    'The quick brown fox jumps over the lazy dog. Pack my box with five dozen ' +
      'liquor jugs. How vexingly quick daft zebras jump! 0123456789 — this ' +
      'paragraph is stored in the DOM as gibberish and repaired by a font that ' +
      'was generated in your browser a moment ago.',
  );

  private readonly protectedText = viewChild<ElementRef<HTMLElement>>('protectedText');

  /** The literal text content of the protected element — what a scraper walks away with. */
  protected readonly domText = signal('');

  constructor() {
    effect(() => {
      // Re-read once the font lands and whenever the reveal toggle flips.
      this.noAi.ready();
      this.noAi.revealed();
      const el = this.protectedText()?.nativeElement;
      if (el) this.domText.set(el.textContent ?? '');
    });
  }

  protected toggleReveal(event: Event): void {
    this.noAi.revealed.set((event.target as HTMLInputElement).checked);
  }
}
