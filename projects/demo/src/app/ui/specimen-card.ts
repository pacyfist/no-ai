import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NoAiDirective, NoAiFontService } from '@pacyfist/no-ai';

/**
 * One protected sample plus its own status.
 *
 * Instantiated once per child EnvironmentInjector, so `NoAiDirective` inside it
 * resolves that injector's `NoAiFontService` rather than the shell's.
 *
 * `aria-hidden` is applied only while this instance actually ciphers. A
 * disabled or failed instance renders ordinary readable text, and hiding that
 * from assistive technology would impose the cost without the protection.
 */
@Component({
  selector: 'app-specimen-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective],
  template: `
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-4">
        <h3 class="card-title justify-between text-xs">
          This instance
          <span class="badge badge-ghost badge-sm">
            {{ noAi.failed() ? 'failed open' : noAi.active() ? 'protected' : 'disabled' }}
          </span>
        </h3>
        <p class="sr-only">
          A protected specimen follows. It is stored scrambled and repaired on screen by a generated
          font, so it is deliberately unreadable in the page source.
        </p>
        <p
          class="text-sm leading-relaxed"
          [attr.aria-hidden]="noAi.active() ? 'true' : null"
          [noAi]="text()"
        ></p>
        @if (noAi.failed(); as message) {
          <p class="text-warning mt-2 font-mono text-xs break-all">{{ message }}</p>
        }
        <p class="text-base-content/50 mt-2 font-mono text-xs">seed {{ noAi.map.seed }}</p>
      </div>
    </div>
  `,
})
export class SpecimenCard {
  protected readonly noAi = inject(NoAiFontService);
  readonly text = input.required<string>();
}
