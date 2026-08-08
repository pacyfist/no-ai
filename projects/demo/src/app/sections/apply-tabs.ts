import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiFontService, NoAiPipe } from '@pacyfist/no-ai';
import { SectionHeading } from '../ui/section-heading';
import { CodeBlock } from '../ui/code-block';

/**
 * Settled empirically during Task 3: effects run during prerender.
 *
 * A prerender with `[noAi]="text()"` bound specimens produced scrambled text
 * carrying `data-no-ai-ssr` in the served HTML. That can only happen if the
 * directive's effect ran, because its `ngOnInit` fallback reads an empty
 * element and would have rendered nothing. Effects therefore do run during
 * prerender in Angular 21, and the library's own comment claiming otherwise is
 * out of date.
 */
const BOUND_SSR_NOTE =
  'The directive takes the bound string as the original. This form is scrambled during server ' +
  'rendering as well, so it is safe for crawler-facing content.';

const TABS = [
  { id: 'static', label: '<p noAi>' },
  { id: 'bound', label: '[noAi]="expr"' },
  { id: 'pipe', label: '| noAi + noAiFont' },
  { id: 'trap', label: 'the trap' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const STATIC_TEXT = 'Protected by element content.';

const SNIPPETS = {
  static: [`<p noAi>${STATIC_TEXT}</p>`],
  bound: ['<p [noAi]="body()"></p>'],
  pipe: ['<h3 noAiFont>{{ title() | noAi }}</h3>'],
  trap: ['<!-- do not do this -->', '<p noAi>{{ title() }}</p>'],
} as const;

/** The whole template surface, each form running live with its own readout. */
@Component({
  selector: 'app-apply-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, CodeBlock, NoAiDirective, NoAiFontDirective, NoAiPipe],
  template: `
    <app-section-heading num="04" title="Three ways to apply it" />
    <p class="text-base-content/60 mb-4 max-w-3xl text-sm leading-relaxed">
      Every form the library offers, running for real. The readout under each one is that element's
      own <code class="font-mono">innerText</code>, read straight off the rendered specimen, so you
      can see which forms protect and which do not.
    </p>

    <div role="tablist" class="tabs tabs-lift">
      @for (t of tabs; track t.id) {
        <button
          role="tab"
          class="tab"
          [class.tab-active]="active() === t.id"
          [class.text-warning]="t.id === 'trap'"
          (click)="active.set(t.id)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    <div class="card bg-base-100 rounded-t-none shadow-sm">
      <div class="card-body gap-4 p-4">
        @switch (active()) {
          @case ('static') {
            <app-code-block [lines]="snippets.static" />
            <div class="rounded-box border-base-300 border p-3" [class.border-warning]="isEmpty()">
              <p class="text-sm" aria-hidden="true" noAi #specimen>${STATIC_TEXT}</p>
            </div>
            <p class="text-base-content/60 text-xs">
              The directive takes the element's own text, replaces it with the scrambled form and
              applies the forged font. This is the form that survives server rendering, so it is the
              one crawler-facing content should use.
            </p>
          }
          @case ('bound') {
            <app-code-block [lines]="snippets.bound" />
            <div class="rounded-box border-base-300 border p-3" [class.border-warning]="isEmpty()">
              <p class="text-sm" aria-hidden="true" [noAi]="bound()" #specimen></p>
            </div>
            <p class="text-base-content/60 text-xs">{{ boundNote }}</p>
          }
          @case ('pipe') {
            <app-code-block [lines]="snippets.pipe" />
            <div class="rounded-box border-base-300 border p-3" [class.border-warning]="isEmpty()">
              <h3 class="text-sm" aria-hidden="true" noAiFont #specimen>{{ piped() | noAi }}</h3>
            </div>
            <p class="text-base-content/60 text-xs">
              The pipe scrambles the string and
              <code class="font-mono">noAiFont</code> supplies the font without touching text. This
              is the form to use whenever Angular interpolates the content.
            </p>
          }
          @case ('trap') {
            <app-code-block [lines]="snippets.trap" />
            <div
              class="rounded-box border p-3"
              [class.border-warning]="isEmpty()"
              [class.border-base-300]="!isEmpty()"
            >
              <p class="text-sm" aria-hidden="true" noAi #specimen>{{ piped() }}</p>
            </div>
            @if (isEmpty()) {
              <p class="text-warning/80 text-xs italic">this element is empty</p>
            }
            <div class="alert alert-warning text-xs">
              <span>
                The directive reads the element's text in <code class="font-mono">ngOnInit</code>,
                which runs before the interpolation has written anything, so it takes an empty
                string as the original and overwrites Angular's text node with an empty one. The
                interpolation then updates a node that is no longer attached, so nothing appears.
                The content disappears entirely - use the pipe with
                <code class="font-mono">noAiFont</code> instead.
              </span>
            </div>
          }
        }

        <div class="border-base-300 border-t pt-3">
          <div class="text-base-content/50 text-xs tracking-widest uppercase">
            what a scraper reads
          </div>
          @if (hasReadout()) {
            <p class="text-primary mt-1 font-mono text-xs break-all">{{ readout() }}</p>
          } @else {
            <div class="skeleton mt-1 h-4 w-48"></div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ApplyTabs {
  /**
   * Not read for its value. Depending on the same signals the directives
   * depend on means this effect re-reads the DOM whenever they re-apply, so
   * the readout never lags behind the specimen it is meant to describe.
   */
  private readonly noAi = inject(NoAiFontService);

  protected readonly tabs = TABS;

  /**
   * Snippets live here rather than inline in the template. An Angular template
   * parses `{{ }}` inside a binding's string literal as interpolation, so the
   * pipe example cannot be written inline without being evaluated.
   */
  protected readonly snippets = SNIPPETS;

  protected readonly active = signal<TabId>('static');
  protected readonly boundNote = BOUND_SSR_NOTE;

  protected readonly bound = signal('Protected from a bound signal.');
  protected readonly piped = signal('Protected through the pipe.');

  /** The currently rendered specimen. Only one `@switch` case is in the DOM at a time. */
  private readonly specimen = viewChild<ElementRef<HTMLElement>>('specimen');

  /**
   * The specimen's own `innerText`, read from the DOM rather than recomputed.
   *
   * Null until the first client-side read lands - `afterRenderEffect` never
   * runs on the server, so a prerendered page has no readout yet and shows a
   * skeleton in its place rather than a value the server cannot see.
   */
  protected readonly readout = signal<string | null>(null);

  protected readonly hasReadout = computed(() => this.readout() !== null);
  protected readonly isEmpty = computed(() => this.readout() === '');

  constructor() {
    afterRenderEffect({
      read: () => {
        this.noAi.fontStack();
        this.noAi.hidden();
        const el = this.specimen()?.nativeElement;
        this.readout.set(el ? el.innerText : null);
      },
    });
  }
}
