import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EnvironmentInjector,
  computed,
  createEnvironmentInjector,
  inject,
  input,
} from '@angular/core';
import { NoAiConfig, provideNoAi, randomSeed } from '@pacyfist/no-ai';
import { baseFontBuffer } from '../font-source';
import { SpecimenCard } from './specimen-card';

/**
 * Renders one specimen under its own `provideNoAi`.
 *
 * The seed is drawn here rather than left to the library. On the browser the
 * library falls back to the seed `TransferState` carries from the prerender, so
 * an instance without an explicit seed would silently reproduce the shell's
 * cipher and demonstrate nothing.
 */
@Component({
  selector: 'app-isolated-instance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      [ngComponentOutlet]="card"
      [ngComponentOutletEnvironmentInjector]="injector()"
      [ngComponentOutletInputs]="{ text: text() }"
    />
  `,
})
export class IsolatedInstance {
  readonly text = input.required<string>();
  readonly config = input<Partial<NoAiConfig>>({});

  protected readonly card = SpecimenCard;

  private readonly parent = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly injector = computed(() => {
    const child = createEnvironmentInjector(
      [
        provideNoAi({
          font: baseFontBuffer,
          fallbackFontFamily: "'Roboto', sans-serif",
          seed: randomSeed(),
          ...this.config(),
        }),
      ],
      this.parent,
    );
    this.destroyRef.onDestroy(() => child.destroy());
    return child;
  });
}
