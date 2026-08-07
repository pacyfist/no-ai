import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NoAiDirective } from '@pacyfist/no-ai';

/**
 * One protected sample. Instantiated once per child EnvironmentInjector, so the
 * `NoAiDirective` inside it resolves whichever `NoAiFontService` that injector
 * provides rather than the shell's.
 */
@Component({
  selector: 'app-config-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective],
  // No readable copy of `text()` — it would land in the served HTML as
  // plaintext and hand a scraper the answer for free.
  template: ` <p class="config-sample leading-relaxed" aria-hidden="true" [noAi]="text()"></p> `,
})
export class ConfigCard {
  readonly text = input.required<string>();
}
