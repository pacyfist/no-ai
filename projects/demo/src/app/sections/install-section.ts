import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CodeBlock } from './code-block';

const SETUP = `import { provideNoAi } from '@pacyfist/no-ai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNoAi({
      font: 'fonts/Roboto-Regular.ttf',
      fallbackFontFamily: "'Roboto', sans-serif",
    }),
  ],
};`;

@Component({
  selector: 'app-install-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlock],
  template: `
    <section class="mt-10">
      <h2 class="mb-4 text-xl font-bold">Using it</h2>

      <div role="alert" class="alert alert-info alert-soft mb-4">
        <div>
          <div class="font-semibold">Licensed AGPL-3.0-only</div>
          <div class="text-sm opacity-80">
            The AGPL's network clause covers software offered to users over a network, which is what
            a web page is. Serving a public site that uses this library puts that site's source
            under the same terms. Deliberate &mdash; weigh it before adopting.
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 class="text-base-content/60 mb-2 text-xs tracking-widest uppercase">Install</h3>
          <app-code-block code="npm install @pacyfist/no-ai opentype.js" language="bash" />
          <p class="text-base-content/60 mt-3 text-sm">
            <code class="kbd kbd-xs">opentype.js</code> is a peer dependency, so you pick the
            version. You also supply a base font as <code class="kbd kbd-xs">.ttf</code> or
            <code class="kbd kbd-xs">.otf</code> &mdash; opentype.js cannot read WOFF or WOFF2
            &mdash; and it should be the typeface your body text already uses.
          </p>
        </div>

        <div>
          <h3 class="text-base-content/60 mb-2 text-xs tracking-widest uppercase">Set up</h3>
          <app-code-block [code]="setup" language="ts" />
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <a
          class="btn btn-primary btn-sm"
          href="https://github.com/pacyfist/no-ai"
          rel="noopener"
          target="_blank"
          >Source on GitHub</a
        >
        <a
          class="btn btn-ghost btn-sm"
          href="https://github.com/pacyfist/no-ai/blob/main/projects/pacyfist/no-ai/README.md"
          rel="noopener"
          target="_blank"
          >Library README</a
        >
        <span class="text-base-content/50 text-sm">Not yet published to npm.</span>
      </div>
    </section>
  `,
})
export class InstallSection {
  protected readonly setup = SETUP;
}
