import { Component, VERSION, computed, inject, signal } from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiFontService, NoAiPipe } from '@pacyfist/no-ai';
import { StatusBanner } from './sections/status-banner';

@Component({
  selector: 'app-root',
  imports: [NoAiDirective, NoAiFontDirective, NoAiPipe, StatusBanner],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly noAi = inject(NoAiFontService);

  protected readonly angularVersion = VERSION.major;

  protected readonly headline = signal('Everything below this line is protected');

  protected readonly article = signal(
    'The quick brown fox jumps over the lazy dog. Pack my box with five dozen ' +
      'liquor jugs. How vexingly quick daft zebras jump! 0123456789 — this ' +
      'paragraph is stored in the DOM as gibberish and repaired by a font that ' +
      'was generated in your browser a moment ago.',
  );

  /** Whatever the visitor pasted back after copying the protected paragraph. */
  protected readonly pasted = signal('');

  protected readonly hasPaste = computed(() => this.pasted().trim().length > 0);

  /**
   * Whether the clipboard round-trip survived — true only if protection is off
   * or broken, which is exactly what makes the comparison worth showing.
   */
  protected readonly pasteIsReadable = computed(
    () => this.hasPaste() && this.pasted().trim() === this.article().trim(),
  );

  protected onPaste(event: Event): void {
    this.pasted.set((event.target as HTMLTextAreaElement).value);
  }

  protected clearPaste(): void {
    this.pasted.set('');
  }
}
