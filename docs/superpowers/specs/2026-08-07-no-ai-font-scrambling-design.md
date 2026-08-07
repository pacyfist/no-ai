# Design: font-based anti-scraping for Angular

Date: 2026-08-07
Status: implemented

## Problem

Make page text unreadable to bulk scrapers while leaving it readable to people,
packaged so it can be shared as a library.

## Approach

A substitution cipher in the DOM, undone at paint time by a font generated in
the browser.

1. A seeded PRNG builds a **derangement** of a charset — a bijection where no
   character maps to itself.
2. Text is scrambled through that map before it reaches the DOM.
3. opentype.js parses a base `.ttf` and emits a new font whose glyphs are
   addressed by the *scrambled* codepoints while drawing the *original*
   outlines. It is registered with the `FontFace` API.
4. Protected elements point at that font.

### Alternatives rejected

- **CSS-only** (flex `order` shuffling, hidden decoy spans): no font work, but a
  headless-browser scraper reading rendered text still wins, and it multiplies
  DOM nodes.
- **Private Use Area codepoints** instead of shuffling within ASCII: scraped
  text becomes obviously-broken rather than plausible-but-wrong. Rejected as the
  default because plausible wrong text is the stronger deterrent, but the
  `charset` option leaves it open to the consumer.

## Structure

Built as a library from day one — extraction after the fact leaks app
assumptions into the library.

```
projects/pacyfist/no-ai/   publishable, ng-packagr
projects/demo/             SSR demo, consumes the library via dist/
```

The demo resolves `@pacyfist/no-ai` to the built output, so app→library coupling
is a compile error.

| Unit | Responsibility | Depends on |
|---|---|---|
| `scramble-map.ts` | Derangement + text substitution. Pure | nothing |
| `font-forge.ts` | Re-address glyphs, serialise. Pure | opentype.js |
| `no-ai.config.ts` | `provideNoAi()`, `NO_AI_CONFIG` | — |
| `NoAiFontService` | Owns cipher and font; SSR guards; TransferState | above |
| `NoAiDirective` | `[noAi]` — scramble element text + apply font | service |
| `NoAiFontDirective` | `[noAiFont]` — apply font only | service |
| `NoAiPipe` | `\| noAi` — scramble a bound string | service |

### Rules that keep it extractable

1. No bundled font — the consumer supplies one that matches their body text.
2. `provideNoAi()` rather than `providedIn: 'root'`, so config is required.
3. Zero required global CSS; styles are set via `Renderer2` on the element.
4. opentype.js as a `peerDependency`.
5. The pure core is exported for non-Angular use.

## Decisions and their reasons

- **Space is excluded from the charset.** It is the only character the browser
  breaks lines at; scrambling it collapses a paragraph into one unbreakable
  word. Verified: line wrapping works, word boundaries survive.
- **A fallback stack is mandatory.** The forged font contains only charset
  glyphs, so spaces, accents, and emoji rely on per-glyph CSS fallback.
- **The map is built synchronously**, the font asynchronously. This is what lets
  directives scramble on their first render, including on the server.
- **Seed crosses via `TransferState`.** Server-rendered HTML is therefore
  scrambled — the case that matters, since most crawlers never run JS. Leaking
  the seed costs nothing: the font's `cmap` already describes the substitution.
- **`NoAiPipe` is impure.** Protection must switch off the instant the font
  fails; a pure pipe would keep serving its cached scramble because the input
  string never changed.
- **Fail open.** Any failure restores readable text. Unreadable content is worse
  than unprotected content.
- **Forge throws on a missing glyph.** Silently dropping a character would show
  readers the wrong letter with no other symptom.

## Verification

- 36 unit tests: derangement properties across 200 seeds, bijectivity,
  determinism, round-trip through the inverse, forged-glyph fidelity (bounding
  box within 1 unit of 2048, advance widths exact), directive fail-open.
- `scripts/verify-in-browser.mjs` drives real Chrome: asserts no plaintext in
  the DOM, the forged font is registered and remaps glyphs, protected text is
  visible, and the console is clean (hydration included).
- Prerendered SSR HTML inspected directly for plaintext leakage.

## Known limits

Documented in the library README rather than treated as bugs: the font is
downloadable and its `cmap` inverts the cipher, OCR defeats it, and protected
text loses screen-reader output, find-in-page, copy-paste, and kerning.
