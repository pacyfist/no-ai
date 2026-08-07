import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A snippet, rendered as text. Interpolation keeps markup from being parsed. */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-base-300/40 border-base-300 relative rounded-lg border">
      <span
        class="text-base-content/40 absolute top-2 right-3 font-mono text-[0.65rem] tracking-widest uppercase"
        >{{ language() }}</span
      >
      <pre
        class="overflow-x-auto p-4 pt-6 font-mono text-xs leading-relaxed"
      ><code>{{ code() }}</code></pre>
    </div>
  `,
})
export class CodeBlock {
  readonly code = input.required<string>();
  readonly language = input('html');
}
