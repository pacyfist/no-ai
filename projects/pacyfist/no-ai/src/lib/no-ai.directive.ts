import { Directive, ElementRef, OnInit, Renderer2, effect, inject, input } from '@angular/core';
import { NoAiFontService } from './no-ai-font.service';

/**
 * Protects an element's text.
 *
 * ```html
 * <p noAi>Text a scraper should not be able to read.</p>
 * <p [noAi]="article().body"></p>
 * ```
 *
 * Takes the element's own text content, or the bound string when one is given,
 * replaces it with the scrambled form, and points the element at the forged
 * font so a reader still sees the original words.
 *
 * For text Angular interpolates, use the `noAi` pipe with `noAiFont` instead —
 * this directive owns the element's text content and would fight the binding.
 */
@Directive({ selector: '[noAi]' })
export class NoAiDirective implements OnInit {
  /** Text to protect. Omit to protect whatever the element already contains. */
  readonly noAi = input<string>('');

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly service = inject(NoAiFontService);

  /** The readable text. Held so the directive can restore it if the font fails. */
  private original: string | null = null;

  constructor() {
    effect(() => {
      const bound = this.noAi();
      if (bound) this.original = bound;

      // Read the reactive state so this re-runs when the font lands, when the
      // reveal toggle flips, or when loading fails.
      this.service.fontStack();
      this.service.hidden();

      this.apply();
    });
  }

  ngOnInit(): void {
    // Runs on the server too, where effects do not, so the server-rendered HTML
    // is scrambled for crawlers that never execute JavaScript.
    this.original ??= this.element.nativeElement.textContent ?? '';
    this.apply();
  }

  private apply(): void {
    if (this.original === null) return;

    const el = this.element.nativeElement;
    this.renderer.setProperty(el, 'textContent', this.service.scramble(this.original));
    this.renderer.setStyle(el, 'font-family', this.service.fontStack());

    if (this.service.hidden()) {
      this.renderer.setStyle(el, 'visibility', 'hidden');
    } else {
      this.renderer.removeStyle(el, 'visibility');
    }
  }
}
