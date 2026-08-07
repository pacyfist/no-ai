import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NoAiFontService } from '@pacyfist/no-ai';

/** Live readout of whether protection is on, plus the switch that withholds it. */
@Component({
  selector: 'app-status-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (noAi.failed(); as reason) {
      <div role="alert" class="alert alert-warning alert-soft mb-4">
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v3m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
        </svg>
        <div>
          <div class="font-semibold">Protection off</div>
          <div class="text-sm opacity-80">
            The font could not be built, so text renders normally. {{ reason }}
          </div>
        </div>
      </div>
    } @else if (noAi.ready()) {
      <div role="alert" class="alert alert-success alert-soft mb-4">
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          />
        </svg>
        <div>
          <div class="font-semibold">Protection active</div>
          <div class="text-sm opacity-80">
            Font <code class="kbd kbd-xs">{{ noAi.familyName }}</code> generated from
            {{ noAi.map.forward.size }} remapped glyphs.
          </div>
        </div>
      </div>
    } @else {
      <div role="alert" class="alert mb-4">
        <span class="loading loading-spinner loading-sm"></span>
        <span class="font-semibold">Building the font…</span>
      </div>
    }

    <div class="form-control mb-8">
      <label class="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          class="toggle toggle-warning"
          [checked]="noAi.revealed()"
          (change)="toggleReveal($event)"
        />
        <!-- Scoped deliberately: this drives the shell's service only. The
             configuration cards each own a separate instance and are unaffected,
             so a page-wide claim here would be false. -->
        <span class="label-text"
          >Withhold the generated font from this page's protected text &mdash; show me the raw
          characters</span
        >
      </label>
    </div>
  `,
})
export class StatusBanner {
  protected readonly noAi = inject(NoAiFontService);

  protected toggleReveal(event: Event): void {
    this.noAi.revealed.set((event.target as HTMLInputElement).checked);
  }
}
