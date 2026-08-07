# @pacyfist/no-ai

Text in the DOM is stored as a substitution cipher. A font generated in the
browser at page load maps the scrambled codepoints back to the correct glyph
outlines. A reader sees the original words; anything reading `textContent` gets
gibberish.

```html
<p noAi>The quick brown fox jumps over the lazy dog.</p>
```

```
rendered:  The quick brown fox jumps over the lazy dog.
innerText: k(0 fhY~x :#X`& +X| Hh{]; Xo0# e(0 9'6Z 8X2=
```

## Install

```bash
npm install @pacyfist/no-ai opentype.js
```

`opentype.js` is a peer dependency, so you control the version.

You also need a base font as a **`.ttf` or `.otf`** — opentype.js cannot read
WOFF or WOFF2. Use the same typeface your body text uses, or protected text will
look different from everything around it.

## Setup

```ts
import { provideNoAi } from '@pacyfist/no-ai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNoAi({
      font: '/fonts/Roboto-Regular.ttf',
      fallbackFontFamily: "'Roboto', sans-serif",
    }),
  ],
};
```

| Option | Default | Purpose |
|---|---|---|
| `font` | *required* | URL, `ArrayBuffer`, or `() => Promise<ArrayBuffer>` |
| `fallbackFontFamily` | `'sans-serif'` | Renders characters outside the charset — spaces, accents, emoji |
| `charset` | printable ASCII, no space | Codepoints the cipher covers |
| `seed` | random per page load | Pin the cipher. Tests and reproducible builds only |
| `hideUntilReady` | `true` | Keep protected text invisible until the font lands |
| `disabled` | `false` | Turn everything off, per environment |

## Usage

**Static text** — the directive takes the element's own content:

```html
<p noAi>Text a scraper should not be able to read.</p>
```

**Bound text** — the pipe scrambles, `noAiFont` supplies the font:

```html
<h1 noAiFont>{{ title() | noAi }}</h1>
<p [noAi]="article().body"></p>
```

Use `[noAi]` for content you hand it directly, and the pipe plus `noAiFont` when
Angular interpolates the text. Putting the directive on an element Angular also
interpolates into makes the two fight over `textContent`.

**Runtime state:**

```ts
const noAi = inject(NoAiFontService);

noAi.ready();      // font registered
noAi.failed();     // error message, or null
noAi.active();     // protection actually in force
noAi.revealed.set(true);  // withhold the font — see the raw characters
```

## Server-side rendering

Supported, and this is where the technique earns its keep: most crawlers read
the server-rendered HTML and never execute JavaScript.

The cipher is built synchronously from a seed, so the server renders scrambled
text directly into the HTML. The seed travels to the client through Angular's
`TransferState`, both sides derive the same cipher, and hydration sees identical
text.

## What this actually defends against

**Stops** bulk text extraction — `fetch` plus an HTML parse, `innerText`
scraping, copy-pasting a page into a chat window, and crawlers that don't run
JavaScript.

**Does not stop** a determined adversary. The generated font is downloadable
and its `cmap` describes the substitution completely, so anyone willing to parse
it can invert the cipher in a few lines. Rendering the page and running OCR
defeats it too. This raises the cost of scraping; it does not make content
secret. Do not use it as an access control.

**Costs you**, on protected text only:

- Screen readers announce gibberish
- Browser find-in-page (Ctrl+F) does not match
- Copy-paste yields the scrambled string
- No kerning — the generated font carries no `kern`/`GPOS` table (visually
  negligible for body text, measurable on pairs like `AV` at display sizes)

Those are the same mechanism, not bugs. Protect article bodies. Leave
navigation, headings, and anything assistive technology needs alone.

## Failure behaviour

If the font cannot be fetched, parsed, or forged, the library **fails open**:
`active()` goes false, every directive restores its readable text, and the page
renders normally. Unreadable content is worse than unprotected content.

`forgeScrambledFont` throws instead when the base font lacks a glyph for a
charset character — silently dropping it would show readers the wrong letter
with no other symptom.

## Using the cipher outside Angular

The core is framework-free and exported:

```ts
import { buildScrambleMap, scrambleText, forgeScrambledFont } from '@pacyfist/no-ai';

const map = buildScrambleMap(12345);
scrambleText('Hello, world', map);
```

Useful for pre-scrambling static content in a build step.

## License

MIT. The base font is yours to supply and license.
