import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NoAiFontDirective, NoAiPipe } from '@pacyfist/no-ai';

/**
 * The two-card pair that carries the page's whole argument: the same text as a
 * reader sees it, and as `innerText` returns it.
 *
 * The left card is genuinely protected. It has to be: a plain readable
 * paragraph there would make the section a claim rather than a demonstration,
 * and inspecting it would give the whole thing away.
 *
 * It uses the pipe with `noAiFont` rather than the `noAi` directive because the
 * text is bound and changes as the visitor types. The directive owns
 * `textContent` and would fight the binding.
 */
@Component({
  selector: 'app-mirror-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiFontDirective, NoAiPipe],
  template: `
    <div class="grid gap-3 md:grid-cols-2">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title justify-between text-xs">
            {{ readableLabel() }}
            <span class="badge badge-ghost badge-sm">human</span>
          </h3>
          <p class="text-sm leading-relaxed" aria-hidden="true" noAiFont>
            {{ readable() | noAi }}
          </p>
          <p class="sr-only">
            A protected specimen. It is stored scrambled and repaired on screen by a generated font,
            so it is deliberately unreadable in the page source.
          </p>
        </div>
      </div>
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title justify-between text-xs">
            {{ scrambledLabel() }}
            <span class="badge badge-primary badge-sm">live</span>
          </h3>
          <p class="text-primary font-mono text-xs leading-relaxed break-all">{{ scrambled() }}</p>
        </div>
      </div>
    </div>
  `,
})
export class MirrorPanel {
  readonly readable = input.required<string>();
  readonly scrambled = input.required<string>();
  readonly readableLabel = input('Rendered');
  readonly scrambledLabel = input('element.innerText');
}
