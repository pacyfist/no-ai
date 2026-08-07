import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiPipe } from '@pacyfist/no-ai';
import { CodeBlock } from './code-block';

const STATIC_SAMPLE = "The directive takes the element's own content.";
const PIPE_SNIPPET = '<p noAiFont>{{ title() | noAi }}</p>';

@Component({
  selector: 'app-api-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective, NoAiFontDirective, NoAiPipe, CodeBlock],
  template: `
    <section class="mt-10">
      <h2 class="mb-2 text-xl font-bold">Three ways to protect text</h2>
      <p class="text-base-content/70 mb-4 max-w-3xl">
        Each panel below is live. The rendered text is on top; the source that produced it is
        underneath.
      </p>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-5">
            <h3 class="text-base-content/60 text-xs tracking-widest uppercase">Static text</h3>
            <p class="api-demo leading-relaxed" noAi aria-hidden="true">
              The directive takes the element's own content.
            </p>
            <p class="sr-only">{{ staticSample }}</p>
            <app-code-block code="<p noAi>The directive takes the element's own content.</p>" />
          </div>
        </div>

        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-5">
            <h3 class="text-base-content/60 text-xs tracking-widest uppercase">Bound string</h3>
            <p class="api-demo leading-relaxed" aria-hidden="true" [noAi]="body()"></p>
            <p class="sr-only">{{ body() }}</p>
            <app-code-block code='<p [noAi]="body()"></p>' />
          </div>
        </div>

        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-5">
            <h3 class="text-base-content/60 text-xs tracking-widest uppercase">Interpolated</h3>
            <p class="api-demo leading-relaxed" noAiFont aria-hidden="true">{{ title() | noAi }}</p>
            <p class="sr-only">{{ title() }}</p>
            <app-code-block [code]="pipeSnippet" />
          </div>
        </div>
      </div>

      <p class="text-base-content/60 mt-4 max-w-3xl text-sm">
        Use the pipe with <code class="kbd kbd-xs">noAiFont</code> whenever Angular interpolates the
        text. The directive owns the element's <code class="kbd kbd-xs">textContent</code>, so
        putting it on an interpolated element makes the two fight over it.
      </p>
    </section>
  `,
})
export class ApiSection {
  protected readonly staticSample = STATIC_SAMPLE;
  protected readonly pipeSnippet = PIPE_SNIPPET;

  protected readonly body = signal('A string handed to the directive as an input.');
  protected readonly title = signal('Interpolated, then piped through noAi.');
}
