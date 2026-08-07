# Design: demo page as a published GitHub Page

Date: 2026-08-07
Status: approved, not implemented

## Problem

The demo app proves the core trick — protected text reads correctly on screen
and copies out as gibberish — but it does not show most of the library's
surface, and it cannot be published at all. It builds as a Node server
(`outputMode: "server"`), and its `base href` and font paths assume the site is
served from the domain root.

Turn it into a single-page showcase that a visitor can poke at, and publish it
at `https://pacyfist.github.io/no-ai/`.

## Deployment target

Repo `pacyfist/no-ai`, public, default branch `main`. Project page, so the site
is served from the `/no-ai/` subpath. Every path in the build must survive that.

`@pacyfist/no-ai` is **not on npm yet**. The install section shows the intended
command but links only to GitHub — no npm badge, no link to a package page that
returns 404.

## What the page shows

One route, one scrolling page, composed of standalone section components in
`projects/demo/src/app/sections/`. `app.ts` becomes a shell — navbar, header,
footer — that composes them.

The current template is 178 lines holding every concern at once. The new content
would roughly triple that, so it splits:

| Component                    | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `status-banner`              | ready / failed / loading alert, plus the reveal toggle             |
| `proof-section`              | human view beside the paste-back box (existing content, tightened) |
| `raw-html-section`           | the bytes a crawler actually downloads                             |
| `api-section`                | the three template APIs, each rendered live beside its snippet     |
| `config-lab` + `config-card` | one live card per config option                                    |
| `tradeoffs-section`          | Stops / Does not stop / Costs you (existing content)               |
| `install-section`            | install command, peer deps, base-font requirement, GitHub link     |

A presentational `code-block` component renders snippets for `api-section`,
`config-lab` and `install-section`.

Each section owns one idea, takes no inputs beyond what it renders, and reads
runtime state from `NoAiFontService` directly. They can be understood and tested
one at a time.

### `raw-html-section`

`fetch(location.href)` against the page's own URL, then display the response
text with the protected paragraph's scrambled run highlighted.

That response is the literal file GitHub Pages served, which makes it the
strongest proof available — it works precisely because the route is prerendered.
If the fetch fails, fall back to dumping `textContent` of the protected element,
which shows the same characters from a weaker vantage point.

### `api-section`

Three pairs of live render + source:

- `<p noAi>` — directive takes the element's own content
- `<p [noAi]="article()">` — directive takes a bound string
- `<h3 noAiFont>{{ title() | noAi }}</h3>` — pipe scrambles, `noAiFont` supplies
  the font

The third exists because the directive and an interpolation both own
`textContent` and would fight. The page should say that where a reader is
looking at all three.

### `config-lab`

Four cards, each running a genuinely different configuration:

| Card           | Config                      | Shows                                     |
| -------------- | --------------------------- | ----------------------------------------- |
| Pinned cipher  | `seed: 12345`               | Same substitution on every reload         |
| Kill switch    | `disabled: true`            | Text renders untouched                    |
| Narrow charset | `charset` limited to digits | Only numbers cipher; letters pass through |
| No hiding      | `hideUntilReady: false`     | The flash of gibberish you trade away     |

`provideNoAi` returns `EnvironmentProviders` and lists `NoAiFontService` among
them, so a child `EnvironmentInjector` created with `createEnvironmentInjector`
gets its own service instance with its own config. Each card is rendered through
`ngComponentOutlet` with that injector. No library change is required.

All four share one cached `ArrayBuffer` — the `.ttf` is fetched once for the
whole page, not five times.

**The lab must render browser-only.** `NoAiFontService` writes the seed to
`TransferState` under a single shared key, unconditionally, whenever it is not
in a browser:

```ts
if (!this.isBrowser) this.transferState.set(SEED_KEY, seed);
```

Four child services running during prerender would each write that one key.
Last writer wins, the shell's seed is clobbered, and the headline demo
mismatches on hydration. Wrapping the lab in `@defer (on viewport)` keeps it out
of the prerender entirely, and has the side benefit of deferring four font
forges until the visitor scrolls to them.

This is a sharp edge in the library, not only in the demo: any app nesting
`provideNoAi` hits it. Out of scope here — record it as a follow-up issue
against the library, since the fix is to scope the state key per injector and
that deserves its own change.

### The pinned-seed caveat, stated on the page

Static hosting bakes the seed at build time. Every visitor to the published page
receives the **same** substitution — exactly what the `seed` option's own doc
comment warns against:

> A constant seed means every visitor and every crawl sees the same
> substitution, which is trivially solvable once by frequency analysis and
> reusable forever after.

Real SSR reseeds per request; static site generation cannot. The page carries a
short, plain note saying so, near the raw-HTML section where a reader is already
thinking about what the server sent.

The rest of the page trades on being honest about what the technique does not
do. Omitting this would undercut that.

## Accessibility

Protected demo text gets `aria-hidden="true"` alongside a visually hidden
readable copy. The library README tells consumers screen readers announce
gibberish on protected text; the demo should model the mitigation it recommends
rather than inflict the problem on visitors who came to read about it.

The reveal toggle, paste box and all navigation stay unprotected and fully
accessible.

## Build and deployment

### Static build configuration

A new `github-pages` configuration on the `demo` build target holding only the
two options that differ:

```jsonc
"github-pages": {
  "outputMode": "static",
  "baseHref": "/no-ai/"
}
```

Angular configurations do not inherit from one another, so the build runs both:
`ng build demo --configuration production,github-pages`. Later configurations
win on conflicts, and `production`'s budgets and output hashing are kept rather
than duplicated.

The existing server build is left alone, so `npm run serve:ssr:demo` keeps
working. `app.routes.server.ts` already uses `RenderMode.Prerender`, so the
single route prerenders as-is.

Two assumptions to verify first, both cheap to check and both with a known
fallback:

- That `outputMode` is overridable per configuration. If the builder rejects it,
  `github-pages` becomes a standalone configuration duplicating `production`'s
  options.
- That `outputMode: "static"` tolerates the `ssr.entry` pointing at `server.ts`.
  If it does not, the fallback is a second build target for the static site,
  leaving the server target untouched.

### Path fixes for the `/no-ai/` subpath

Two absolute paths break under a subpath, and they break differently:

- **`styles.css`** — `url('/fonts/Roboto-Regular.ttf')` becomes
  `url('fonts/Roboto-Regular.ttf')`. CSS URLs resolve against the stylesheet's
  own location, which is correct at both `/` and `/no-ai/`.
- **`app.config.ts`** — `font: '/fonts/Roboto-Regular.ttf'` becomes a loader
  function resolving `new URL('fonts/Roboto-Regular.ttf', document.baseURI)` and
  caching the resulting `ArrayBuffer` promise. `fetch` resolves relative strings
  against the document URL rather than `base href`, so relying on a bare
  relative string would be correct today and wrong the moment a nested route
  appears.

That loader is the same shared-buffer helper `config-lab` needs. One helper,
two consumers.

### `index.html`

Real `<title>`, meta description, and Open Graph tags. It currently says
`Demo`, which is what a shared link would show.

### Workflow

`.github/workflows/deploy.yml`, on push to `main`:

1. `actions/checkout`, `actions/setup-node` with npm cache
2. `npm ci`
3. `npm run build:lib`
4. `ng build demo --configuration production,github-pages`
5. Copy `index.html` to `404.html`; create `.nojekyll`
6. `actions/upload-pages-artifact` from `dist/demo/browser`
7. `actions/deploy-pages`

Permissions `pages: write` and `id-token: write`, with a concurrency group so
overlapping pushes do not race. Pages source must be set to "GitHub Actions" in
repo settings — a one-time manual step, noted in the README.

`404.html` matters even for a single-route app: GitHub Pages serves it for any
unknown path, and serving the app there keeps deep links working. `.nojekyll`
stops Jekyll from dropping files whose names begin with an underscore.

## Testing

Each new section component gets a spec; `app.spec.ts` is split to match the new
component boundaries.

Beyond that, one guard earns its place: a check that the **built static output**
contains no plaintext of the protected paragraph. Assert that
`dist/demo/browser/index.html` does not contain the readable article string.

The page's entire claim is that the served HTML is scrambled. A build
misconfiguration — prerendering disabled, the directive not running on the
server, `disabled` left true — would ship a page that loudly asserts something
false about itself while looking completely normal. This is the one failure mode
no visual review catches.

Implemented as a Node script run against `dist/`, sitting beside the existing
`scripts/verify-in-browser.mjs`, and wired into the deploy workflow between
build and upload so a regression fails the deploy rather than publishing.

## Out of scope

- Fixing the shared `TransferState` key in the library (follow-up issue)
- Publishing `@pacyfist/no-ai` to npm
- Multiple routes or a docs site — the README stays the reference
- Editing the GitHub repo description, which is the owner's to change

## Copy fixes

`app.html` currently reads `What a scrapper sees`. A scrapper dismantles ships.
It becomes `What a scraper sees`.
