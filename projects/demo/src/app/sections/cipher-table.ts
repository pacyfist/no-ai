import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  signal,
} from '@angular/core';
import { buildScrambleMap, randomSeed } from '@pacyfist/no-ai';
import { SectionHeading } from '../ui/section-heading';

interface Pair {
  readonly from: string;
  readonly to: string;
}

/**
 * The substitution table, built from a seed drawn in the browser.
 *
 * Deliberately does not use the shell's map. The deployed site is prerendered,
 * so the shell's seed is identical for every visitor, and a table built from it
 * could not show what a per-load cipher looks like.
 *
 * The seed is drawn only after the first render and held in a nullable signal,
 * never in a field initialiser, so prerender never bakes one seed into the
 * static HTML while the browser draws a different one on top of it. A skeleton
 * fills the card until the seed is set.
 */
@Component({
  selector: 'app-cipher-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionHeading],
  template: `
    <app-section-heading num="02" title="The cipher" />
    <p class="text-base-content/60 mb-4 max-w-3xl text-sm leading-relaxed">
      The substitution this instance drew. No character maps to itself, which the library guarantees
      by construction: a plain shuffle leaves some letters in place, so it swaps those out
      afterwards. Space is excluded on purpose, because it is the only character the browser can
      break a line at.
    </p>

    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-4">
        @if (seed(); as currentSeed) {
          <div class="mb-3 flex flex-wrap items-center gap-3">
            <button class="btn btn-sm btn-primary" (click)="redraw()">draw a new cipher</button>
            <span class="font-mono text-xs">seed {{ currentSeed }}</span>
            <span class="badge badge-ghost badge-sm">{{ pairs().length }} pairs</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-xs font-mono">
              <tbody>
                @for (row of rows(); track $index) {
                  <tr>
                    @for (pair of row; track pair.from) {
                      <td class="whitespace-nowrap">
                        {{ pair.from }} <span class="text-base-content/40">-&gt;</span>
                        <span class="text-primary">{{ pair.to }}</span>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="flex flex-col gap-3">
            <div class="skeleton h-8 w-64"></div>
            <div class="skeleton h-52 w-full"></div>
          </div>
        }
      </div>
    </div>

    <p class="text-base-content/50 mt-3 text-xs leading-relaxed">
      Full disclosure: the page's own specimen does not get a fresh cipher like this one. The site
      is prerendered as static files, so one seed is baked in at build time and every visitor sees
      it. This table runs its own client-side instance to show what a per-load cipher looks like.
    </p>
  `,
})
export class CipherTable {
  private static readonly SHOWN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  private static readonly PER_ROW = 8;

  protected readonly seed = signal<number | null>(null);

  protected readonly pairs = computed<readonly Pair[]>(() => {
    const seed = this.seed();
    if (seed === null) return [];
    const map = buildScrambleMap(seed);
    return [...CipherTable.SHOWN].map((from) => ({
      from,
      to: String.fromCodePoint(map.forward.get(from.codePointAt(0)!)!),
    }));
  });

  protected readonly rows = computed<readonly (readonly Pair[])[]>(() => {
    const all = this.pairs();
    const out: Pair[][] = [];
    for (let i = 0; i < all.length; i += CipherTable.PER_ROW) {
      out.push(all.slice(i, i + CipherTable.PER_ROW));
    }
    return out;
  });

  constructor() {
    afterNextRender(() => this.seed.set(randomSeed()));
  }

  protected redraw(): void {
    this.seed.set(randomSeed());
  }
}
