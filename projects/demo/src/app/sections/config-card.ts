import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NoAiDirective, NoAiFontService } from '@pacyfist/no-ai';

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
  //
  // aria-hidden only when this instance actually ciphers. A disabled instance
  // renders ordinary readable text, and hiding that from assistive technology
  // would impose the cost without the protection.
  template: `
    <p
      class="config-sample leading-relaxed"
      [attr.aria-hidden]="noAi.active() ? 'true' : null"
      [noAi]="text()"
    ></p>
  `,
})
export class ConfigCard {
  /** This card's own service, from the child injector that created it. */
  protected readonly noAi = inject(NoAiFontService);

  readonly text = input.required<string>();
}
