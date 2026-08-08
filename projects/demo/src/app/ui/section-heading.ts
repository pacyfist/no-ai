import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The numbered rule that opens each section. */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="divider mt-16 mb-4 text-xs tracking-[0.16em] uppercase">
      <span class="text-primary font-mono">{{ num() }}</span>
      <span>{{ title() }}</span>
    </div>
  `,
})
export class SectionHeading {
  readonly num = input.required<string>();
  readonly title = input.required<string>();
}
