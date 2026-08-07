import {
  DOCUMENT,
  Injectable,
  PLATFORM_ID,
  TransferState,
  afterNextRender,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NO_AI_CONFIG, NoAiFontSource } from './no-ai.config';
import { ScrambleMap, buildScrambleMap, randomSeed, scrambleText } from './scramble-map';
import { forgeScrambledFont, parseBaseFont } from './font-forge';

/**
 * Carries the seed from the server render to the client so both build the same
 * cipher and hydration sees identical text.
 *
 * This does hand the seed to anyone reading the page source. That costs
 * nothing: the forged font's cmap is downloadable and already describes the
 * substitution completely. See the README on what this technique does and
 * does not defend against.
 */
const SEED_KEY = makeStateKey<number>('noAiSeed');

async function resolveFontSource(source: NoAiFontSource): Promise<ArrayBuffer> {
  if (typeof source === 'function') return source();
  if (typeof source !== 'string') return source;

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`[no-ai] base font request failed: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Owns the cipher and the generated font.
 *
 * The map is built synchronously in the constructor so directives and pipes can
 * scramble on their very first render, on the server as well as the client.
 * Only the font is loaded asynchronously, and only in a browser.
 */
@Injectable()
export class NoAiFontService {
  private readonly config = inject(NO_AI_CONFIG);
  private readonly document = inject(DOCUMENT);
  private readonly transferState = inject(TransferState);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The substitution in force for this page load. */
  readonly map: ScrambleMap;

  /** Family name of the forged font. Unique per load so nothing caches across ciphers. */
  readonly familyName: string;

  /** True once the forged font is registered and text is safe to show. */
  readonly ready = signal(false);

  /** Set when the font could not be built. The library fails open when this happens. */
  readonly failed = signal<string | null>(null);

  /**
   * Demo/debug switch. When true the forged font is withheld, exposing the raw
   * scrambled characters — what a scraper receives.
   */
  readonly revealed = signal(false);

  /** Whether scrambling applies at all. */
  readonly active = computed(() => !this.config.disabled && this.failed() === null);

  /** The `font-family` value protected elements should use. */
  readonly fontStack = computed(() =>
    this.active() && !this.revealed()
      ? `"${this.familyName}", ${this.config.fallbackFontFamily}`
      : this.config.fallbackFontFamily,
  );

  /** True while protected text should stay hidden to avoid a flash of gibberish. */
  readonly hidden = computed(
    () => this.config.hideUntilReady && this.active() && !this.revealed() && !this.ready(),
  );

  constructor() {
    const seed =
      this.config.seed ??
      (this.isBrowser ? this.transferState.get(SEED_KEY, randomSeed()) : randomSeed());

    if (!this.isBrowser) {
      this.transferState.set(SEED_KEY, seed);
    }

    this.map = buildScrambleMap(seed, this.config.charset);
    this.familyName = `NoAi-${seed.toString(36)}`;

    if (this.config.disabled) {
      this.ready.set(true);
      return;
    }

    if (this.isBrowser) {
      afterNextRender(() => void this.load());
    }
  }

  /** Scramble a string, or return it untouched when protection is off or broken. */
  scramble(text: string): string {
    return this.active() ? scrambleText(text, this.map) : text;
  }

  private async load(): Promise<void> {
    try {
      const buffer = await resolveFontSource(this.config.font);
      const forged = forgeScrambledFont(parseBaseFont(buffer), this.map, this.familyName);
      const face = new FontFace(this.familyName, forged);
      await face.load();
      this.document.fonts.add(face);
      this.ready.set(true);
    } catch (error) {
      // Fail open. Unreadable content is worse than unprotected content, so
      // `active()` flips false and every directive restores its original text.
      console.error('[no-ai] disabled — could not build the protective font.', error);
      this.failed.set((error as Error)?.message ?? String(error));
      this.ready.set(true);
    }
  }
}
