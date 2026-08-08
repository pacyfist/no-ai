import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DEFAULT_CHARSET, NoAiConfig } from '@pacyfist/no-ai';
import { SectionHeading } from '../ui/section-heading';
import { IsolatedInstance } from '../ui/isolated-instance';
import { baseFontBuffer } from '../font-source';

type Mode = 'healthy' | 'no-font' | 'missing-glyph' | 'flash';

const SAMPLE = 'The page stays usable no matter which of these you pick.';

/** Controls that genuinely break the library, rather than describing breakage. */
@Component({
  selector: 'app-breakage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading, IsolatedInstance],
  template: `
    <app-section-heading num="06" title="When it breaks" />
    <p class="text-base-content/60 mb-4 max-w-3xl text-sm leading-relaxed">
      These buttons really do break it. The library fails open by design, because unreadable content
      is worse than unprotected content, so the specimen below stays readable in every case.
    </p>

    <div class="mb-3 flex flex-wrap gap-2">
      @for (m of modes; track m.id) {
        <button class="btn btn-sm" [class.btn-primary]="mode() === m.id" (click)="mode.set(m.id)">
          {{ m.label }}
        </button>
      }
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">
          <h3 class="card-title text-xs">{{ current().label }}</h3>
          <p class="text-base-content/60 text-xs leading-relaxed">{{ current().note }}</p>
        </div>
      </div>
      <app-isolated-instance [text]="sample" [config]="config()" />
    </div>
  `,
})
export class Breakage {
  protected readonly sample = SAMPLE;
  protected readonly mode = signal<Mode>('healthy');

  protected readonly modes = [
    {
      id: 'healthy' as const,
      label: 'working',
      note: 'The baseline. The font forges, the specimen is protected, and the readout is gibberish.',
    },
    {
      id: 'no-font' as const,
      label: 'kill the font fetch',
      note: 'The base font request rejects. The library logs, sets failed(), flips active() to false, and every directive restores its readable text. The page is unharmed and merely unprotected.',
    },
    {
      id: 'missing-glyph' as const,
      label: 'charset the font cannot cover',
      note: 'The charset asks for an emoji Roboto has no glyph for. forgeScrambledFont throws NoAiFontError listing what is missing, rather than silently dropping the character and showing a reader the wrong letter. That throw is caught, so the page still fails open.',
    },
    {
      id: 'flash' as const,
      label: 'hideUntilReady off, slow font',
      note: 'The font loader is delayed by two seconds and hideUntilReady is off, so you see the flash of gibberish the setting exists to prevent. Leave it on unless a visitor without JavaScript seeing nothing is worse for you than a brief flash.',
    },
  ];

  protected readonly current = computed(() => this.modes.find((m) => m.id === this.mode())!);

  protected readonly config = computed<Partial<NoAiConfig>>(() => {
    switch (this.mode()) {
      case 'no-font':
        return { font: () => Promise.reject(new Error('deliberately broken by the demo')) };
      case 'missing-glyph':
        // U+1F600 GRINNING FACE. Roboto-Regular has no glyph for it.
        return { charset: [...DEFAULT_CHARSET, 0x1f600] };
      case 'flash':
        return {
          hideUntilReady: false,
          font: async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return baseFontBuffer();
          },
        };
      default:
        return {};
    }
  });
}
