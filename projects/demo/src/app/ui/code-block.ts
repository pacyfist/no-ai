import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A daisyUI `mockup-code` block.
 *
 * `prefix` picks the gutter: line numbers for markup, a `$` for shell commands.
 */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mockup-code w-full text-xs">
      @for (line of lines(); track $index) {
        <pre
          [attr.data-prefix]="prefix() === 'shell' ? '$' : $index + 1"
        ><code>{{ line }}</code></pre>
      }
    </div>
  `,
})
export class CodeBlock {
  readonly lines = input.required<readonly string[]>();
  readonly prefix = input<'number' | 'shell'>('number');
}
