import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeading } from '../ui/section-heading';
import { CodeBlock } from '../ui/code-block';

/** Everything needed for a decision, including a fast no. */
@Component({
  selector: 'app-take-it',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, CodeBlock],
  template: `
    <app-section-heading num="09" title="Take it" />

    <div class="grid gap-3 md:grid-cols-2">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title mb-2 text-xs">install</h3>
          <app-code-block prefix="shell" [lines]="install" />
          <p class="text-base-content/60 mt-3 text-xs leading-relaxed">
            Then add <code class="font-mono">{{ setupCall }}</code> to your application config and
            put <code class="font-mono">noAi</code> on something.
          </p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title mb-2 text-xs">facts</h3>
          <table class="table table-xs">
            <tbody>
              <tr>
                <td>peers</td>
                <td class="font-mono">Angular ^21.2, opentype.js ^2</td>
              </tr>
              <tr>
                <td>base font</td>
                <td class="font-mono">.ttf or .otf, not WOFF</td>
              </tr>
              <tr>
                <td>SSR</td>
                <td class="font-mono">supported</td>
              </tr>
              <tr>
                <td>licence</td>
                <td class="text-warning font-mono">AGPL-3.0-only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="alert alert-warning mt-3 text-sm">
      <span>
        <strong>AGPL section 13.</strong> The network clause applies to software offered to users
        over a network, which is what a web page is. Using this in a site you serve publicly means
        that site's source falls under the same terms. That is the intent, not an oversight. Better
        a fast no here than a surprise later.
      </span>
    </div>

    <p class="text-base-content/50 mt-6 text-xs">
      Source and full documentation:
      <a class="link" href="https://github.com/pacyfist/no-ai">github.com/pacyfist/no-ai</a>
    </p>
  `,
})
export class TakeIt {
  protected readonly install = ['npm install @pacyfist/no-ai opentype.js'];

  /** Held as a field so the braces are not parsed as an interpolation. */
  protected readonly setupCall = 'provideNoAi({ font })';
}
