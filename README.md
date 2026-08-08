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

## Demo styling

The demo uses **Tailwind 4 + daisyUI**, set up per
[this guide](https://www.pacyfist.dev/posts/angular-19-tailwind-4-and-scss-a-modern-step-by-step-setup-guide/)
but in plain CSS rather than SCSS:

- `postcss.config.json` at the workspace root registers `@tailwindcss/postcss`
- `projects/demo/src/styles.css` does `@import "tailwindcss"` and `@plugin "daisyui"`
- daisyUI themes: `light --default`, `dark --prefersdark`

Two deviations from the guide, both deliberate:

- **`daisyui` stable, not `@beta`.** The `beta` tag now points at 5.6.0-beta.0,
  which is _older_ than stable 5.7.x — it predates daisyUI 5's release.
- **`@import "tailwindcss"`, not `@use`.** The guide's `@use` exists only to
  keep Sass happy; in plain CSS `@import` is the canonical Tailwind 4 form.

The **library itself has no Tailwind or daisyUI dependency** and never will —
it sets styles on elements via `Renderer2` precisely so consumers need no
stylesheet. daisyUI is a demo-only concern.

## Commands

```bash
npm run build:lib      # build the library — required before building the demo
npm start              # dev server for the demo on :4321
npm test               # unit tests for library + demo
npm run build:pages    # prerendered static site in dist/demo/browser
npm run verify:static  # assert the built HTML is scrambled and subpath-safe
npm run e2e            # Playwright checks against the built site (run build:pages first)
npm run e2e:ui         # the same suite in Playwright's watch UI
```

`npm start` and `npm test` both depend on the library being built first.

## Testing

Three layers, because no single one can cover this library.

**Unit tests** (`npm test`, Vitest + jsdom) cover the cipher, the font forge and
the directives. They cannot cover the central claim: jsdom has no `FontFace`, so
every unit test necessarily runs the fail-open path and never observes a forged
font at all.

**The build guard** (`npm run verify:static`) inspects bytes that never reach a
browser — that the prerendered HTML holds no plaintext, that the SSR marker and
transfer state are present, that no asset path is absolute, and that the demo
specimen's plaintext stays pinned to a single JS chunk.

**End-to-end** (`npm run e2e`, Playwright + Chromium) runs against the **built
static site** served under the real `/no-ai/` base path by `e2e/serve-static.mjs`,
so it exercises the artifact that actually ships. It is the only layer that
proves the forged font registers, that the painted glyphs differ from the
fallback, that the clipboard carries ciphertext, and that hydration does not
scramble the static form twice.

All three run in CI before the site is published.

## Deployment

The demo publishes on every push to `main` via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It is served at
**<https://www.pacyfist.dev/no-ai/>** — the account's custom domain covers
project pages, so `pacyfist.github.io/no-ai/` redirects there. Either way the
site lives under the `/no-ai/` subpath, which is what `baseHref` targets.

```bash
npm run build:pages    # prerendered static site in dist/demo/browser
npm run verify:static  # assert the built HTML is scrambled and subpath-safe
```

`verify:static` runs in CI between build and upload, so a build that would ship
readable text fails the deploy instead of publishing it. It checks that the
article never appears in plaintext, that `.protected-body` prerendered, and that
no asset path is absolute — the last one because an absolute `/fonts/…` resolves
outside the subpath, the font 404s, and the library then fails open into a
completely unprotected page that still looks fine.

The `github-pages` build configuration only carries `outputMode` and `baseHref`.
Angular configurations do not inherit, so builds name both:
`--configuration production,github-pages`.

On Windows, run `--base-href` builds from PowerShell. Git Bash rewrites a
leading-`/` argument into a Windows path, so `--base-href /no-ai/` silently
becomes `/Program Files/Git/no-ai` and prerendering fails.

The base font ships twice in the output: hashed under `media/` for the
stylesheet's `@font-face`, and under `fonts/` for the runtime forge. The
stylesheet copy has to be build-resolved so its URL survives the subpath; the
forge copy has to keep a stable name so it can be fetched against `<base href>`.

## How it works

1. A seeded PRNG builds a **derangement** of printable ASCII — every character
   maps to a different one. Space is excluded so lines can still wrap.
2. Text is scrambled through that map before it reaches the DOM, on the server
   as well as the client. The seed crosses via `TransferState`.
3. In the browser, opentype.js parses a base `.ttf`, and a new font is built
   whose glyphs are addressed by the _scrambled_ codepoints while drawing the
   _original_ outlines. It is registered with the `FontFace` API.
4. Protected elements point at that font. Readers see the real words.

See the [library README](projects/pacyfist/no-ai/README.md) for what this does
and does not defend against — it is a cost increase for scrapers, not secrecy.

## License

**AGPL-3.0-only** — see [LICENSE](LICENSE). The AGPL's network clause reaches
software served over a network, so a public site using this library is covered.
Deliberate; weigh it before adopting.

`Roboto-Regular.ttf` is vendored twice — once as a demo asset, once as a library
test fixture that must survive the library being extracted into its own repo.
Both copies are Copyright Google LLC under the **Apache License 2.0**, not the
AGPL, with the license text beside each:

- [`projects/demo/public/fonts/Roboto-LICENSE.txt`](projects/demo/public/fonts/Roboto-LICENSE.txt)
- [`projects/pacyfist/no-ai/testing/Roboto-LICENSE.txt`](projects/pacyfist/no-ai/testing/Roboto-LICENSE.txt)
