# no-ai

Angular workspace for **[@pacyfist/no-ai](projects/pacyfist/no-ai/README.md)** — a
library that scrambles text in the DOM and repairs it on screen with a font
generated at runtime, so bulk scrapers extract gibberish.

## Layout

```
projects/
  pacyfist/no-ai/   the publishable library (ng-packagr)
  demo/             SSR demo app, consumes the library as an outside user would
scripts/            real-browser verification helpers
```

The demo imports `@pacyfist/no-ai` through the workspace path alias, which
resolves to the **built** library in `dist/`. That is deliberate: it makes any
accidental coupling between the app and the library a compile error, so the
library stays extractable into its own repo.

## Commands

```bash
npm run build:lib      # build the library — required before building the demo
npm start              # dev server for the demo on :4321
npm test               # unit tests for library + demo
npm run verify:browser # end-to-end check in real Chrome (dev server must be running)
```

`npm start` and `npm test` both depend on the library being built first.

## How it works

1. A seeded PRNG builds a **derangement** of printable ASCII — every character
   maps to a different one. Space is excluded so lines can still wrap.
2. Text is scrambled through that map before it reaches the DOM, on the server
   as well as the client. The seed crosses via `TransferState`.
3. In the browser, opentype.js parses a base `.ttf`, and a new font is built
   whose glyphs are addressed by the *scrambled* codepoints while drawing the
   *original* outlines. It is registered with the `FontFace` API.
4. Protected elements point at that font. Readers see the real words.

See the [library README](projects/pacyfist/no-ai/README.md) for what this does
and does not defend against — it is a cost increase for scrapers, not secrecy.
