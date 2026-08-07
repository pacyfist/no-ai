# Demo GitHub Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the demo as a sectioned showcase of every `@pacyfist/no-ai` feature and publish it to `https://pacyfist.github.io/no-ai/`.

**Architecture:** `app.ts` becomes a thin shell composing standalone section components under `projects/demo/src/app/sections/`, one section per idea. A shared `font-source.ts` fetches the base `.ttf` once and resolves it against `<base href>`. A new `github-pages` build configuration emits a prerendered static site, and a GitHub Actions workflow publishes it after a guard script verifies the built HTML is actually scrambled.

**Tech Stack:** Angular 21 (standalone, signals, zoneless — there is no `zone.js` dependency), Tailwind 4 + daisyUI 5, Vitest via `@angular/build:unit-test` with jsdom, ng-packagr, opentype.js, Puppeteer for real-browser checks.

## Global Constraints

- **Deployment target:** `https://pacyfist.github.io/no-ai/`. Base href is `/no-ai/`. Every asset path must survive that subpath.
- **The library is never modified.** Only `projects/demo/**`, `scripts/**`, `.github/**`, `angular.json`, `package.json`, `README.md`. The library must stay extractable into its own repo.
- **No new runtime dependencies.** Tailwind/daisyUI are demo-only; the library must keep working with no stylesheet.
- **License is AGPL-3.0-only.** The install section states it plainly, above the install command.
- **Commit style:** Conventional Commits, one line, lowercase, no body. Run `npx prettier --write <files>` and re-stage before every commit.
- **Local builds that pass `--base-href` must run in PowerShell, not Git Bash.** MSYS rewrites a leading-`/` argument into a Windows path: `--base-href /no-ai/` silently becomes `/Program Files/Git/no-ai` and the build fails during prerender. CI runs on `ubuntu-latest`, which is unaffected.
- **Copy:** "scraper", never "scrapper". A scrapper dismantles ships.
- **`npm run build:lib` must run before any demo build or test.** The demo imports `@pacyfist/no-ai` through a path alias pointing at `dist/`.

### Verified facts this plan depends on

Checked against this workspace before writing; do not re-litigate:

- `outputMode` is a plain string enum option (`static` | `server`) in `@angular/build:application`, so it is overridable per configuration.
- `outputMode: "static"` coexists with the existing `ssr.entry`. The build emits `dist/demo/server/` as a prerender byproduct; **publish `dist/demo/browser/` only**.
- Prerendering already scrambles: the built `index.html` contains no `quick brown fox`, and `.protected-body` carries ciphertext plus `visibility: hidden`.
- The bug this plan fixes: built CSS keeps `url(/fonts/Roboto-Regular.ttf)` and the JS bundle keeps the string `/fonts/Roboto-Regular.ttf`, while the font deploys to `/no-ai/fonts/`. On Pages both 404, the font never forges, and the library fails open into a fully unprotected page.
- `NgComponentOutlet` input alias is `ngComponentOutletEnvironmentInjector`; `createEnvironmentInjector(providers, parent, debugName?)` accepts `EnvironmentProviders`.
- Vitest globals are enabled, but library specs import `describe/expect/it` from `vitest` explicitly. Match that.
- `projects/demo/src/app/app.spec.ts` currently asserts `'What an AI reads'` while the working tree says `'What a scrapper sees'` — **this test fails right now**. Task 5 replaces it.

---

## File Structure

| File                                                  | Responsibility                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `projects/demo/src/app/font-source.ts`                | Resolve asset URLs against `<base href>`; fetch the base `.ttf` once, shared by shell and lab |
| `projects/demo/src/app/app.ts` / `.html`              | Shell only: navbar, hero, footer, section composition                                         |
| `projects/demo/src/app/sections/code-block.ts`        | Presentational snippet renderer                                                               |
| `projects/demo/src/app/sections/status-banner.ts`     | Font ready / failed / loading state + reveal toggle                                           |
| `projects/demo/src/app/sections/proof-section.ts`     | Human view + paste-back box, with the a11y mitigation                                         |
| `projects/demo/src/app/sections/raw-html-section.ts`  | Re-fetch own URL, show served bytes, pinned-seed caveat                                       |
| `projects/demo/src/app/sections/api-section.ts`       | The three template APIs, live beside source                                                   |
| `projects/demo/src/app/sections/config-lab.ts`        | Four child-injector cards, deferred to viewport                                               |
| `projects/demo/src/app/sections/config-card.ts`       | One protected sample, instantiated per injector                                               |
| `projects/demo/src/app/sections/tradeoffs-section.ts` | Stops / Does not stop / Costs you                                                             |
| `projects/demo/src/app/sections/install-section.ts`   | License, install command, peer deps, links                                                    |
| `scripts/verify-static-build.mjs`                     | Guard: built output is scrambled and has no absolute asset paths                              |
| `.github/workflows/deploy.yml`                        | Build, guard, publish to Pages                                                                |

Sections use inline `template:` — each is one file holding one idea, which keeps them reviewable in isolation. The shell keeps `templateUrl` as it has today.

---

### Task 1: Shared font source and subpath-safe asset paths

Fixes the deploy-blocking bug. Produces the loader every later task reuses.

**Files:**

- Create: `projects/demo/src/app/font-source.ts`
- Create: `projects/demo/src/app/font-source.spec.ts`
- Modify: `projects/demo/src/app/app.config.ts:13-18`
- Modify: `projects/demo/src/styles.css:14`

**Interfaces:**

- Consumes: nothing.
- Produces: `assetUrl(path: string): string`, `baseFontBuffer(): Promise<ArrayBuffer>`, `resetBaseFontBuffer(): void`. Tasks 8 and 9 import `baseFontBuffer`.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/font-source.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, baseFontBuffer, resetBaseFontBuffer } from './font-source';

function setBaseHref(href: string): void {
  document.head.querySelector('base')?.remove();
  const base = document.createElement('base');
  base.setAttribute('href', href);
  document.head.prepend(base);
}

describe('font-source', () => {
  beforeEach(() => resetBaseFontBuffer());
  afterEach(() => {
    vi.unstubAllGlobals();
    document.head.querySelector('base')?.remove();
  });

  it('resolves asset paths against the base href, not the document root', () => {
    setBaseHref('/no-ai/');
    expect(assetUrl('fonts/Roboto-Regular.ttf')).toBe(
      new URL('/no-ai/fonts/Roboto-Regular.ttf', location.origin).href,
    );
  });

  it('resolves against the root when the app is served from the root', () => {
    setBaseHref('/');
    expect(assetUrl('fonts/Roboto-Regular.ttf')).toBe(
      new URL('/fonts/Roboto-Regular.ttf', location.origin).href,
    );
  });

  it('fetches the base font exactly once no matter how many callers ask', async () => {
    setBaseHref('/no-ai/');
    const fetchMock = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([baseFontBuffer(), baseFontBuffer()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/no-ai/fonts/Roboto-Regular.ttf');
    expect(a.byteLength).toBe(8);
    expect(b.byteLength).toBe(8);
  });

  it('rejects with the status when the font cannot be fetched', async () => {
    setBaseHref('/no-ai/');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(baseFontBuffer()).rejects.toThrow('404');
  });

  it('does not cache a failed fetch', async () => {
    setBaseHref('/no-ai/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(baseFontBuffer()).rejects.toThrow('500');
    await expect(baseFontBuffer()).resolves.toBeInstanceOf(ArrayBuffer);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:lib && npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./font-source`.

- [ ] **Step 3: Write the implementation**

Create `projects/demo/src/app/font-source.ts`:

```ts
/** The base font, relative to `<base href>`. */
const FONT_PATH = 'fonts/Roboto-Regular.ttf';

let pending: Promise<ArrayBuffer> | undefined;

/**
 * Resolve an asset path against `<base href>`.
 *
 * `fetch` resolves relative strings against the document URL rather than the
 * base href, which differ the moment the app is served from a subpath such as
 * /no-ai/. Going through `document.baseURI` keeps one string correct on both.
 */
export function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

/**
 * The base font bytes, fetched at most once per page.
 *
 * The shell and every config-lab card forge their own font from these same
 * bytes, so the .ttf crosses the network a single time. A failed fetch is not
 * cached — the next caller retries.
 */
export function baseFontBuffer(): Promise<ArrayBuffer> {
  pending ??= fetch(assetUrl(FONT_PATH))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`base font request failed: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .catch((error) => {
      pending = undefined;
      throw error;
    });

  return pending;
}

/** Drops the cached fetch. Tests only. */
export function resetBaseFontBuffer(): void {
  pending = undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test demo --watch=false`
Expected: the five `font-source` tests PASS. `app.spec.ts` still fails on the `'What an AI reads'` assertion — expected, Task 5 replaces it.

- [ ] **Step 5: Point the app config at the shared loader**

Modify `projects/demo/src/app/app.config.ts` — replace the `provideNoAi` call:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideNoAi } from '@pacyfist/no-ai';
import { baseFontBuffer } from './font-source';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideNoAi({
      // A loader rather than a URL: the string form would be fetched relative to
      // the document, which breaks under the /no-ai/ base href on Pages.
      font: baseFontBuffer,
      fallbackFontFamily: "'Roboto', sans-serif",
    }),
  ],
};
```

- [ ] **Step 6: Make the stylesheet's font URL relative**

Modify `projects/demo/src/styles.css` line 14 — inside the existing `@font-face`, change `src`:

```css
src: url('fonts/Roboto-Regular.ttf') format('truetype');
```

CSS URLs resolve against the stylesheet's own location, so this is correct at both `/` and `/no-ai/`.

- [ ] **Step 7: Verify the built output no longer contains absolute font paths**

Run in **PowerShell**:

```powershell
npm run build:lib; npx ng build demo --configuration production --output-mode static --base-href /no-ai/
Select-String -Path dist/demo/browser/*.css -Pattern 'url\(/fonts'
Select-String -Path dist/demo/browser/*.js -Pattern '/fonts/Roboto'
```

Expected: both `Select-String` calls print nothing. Before this task they matched.

- [ ] **Step 8: Commit**

```bash
npx prettier --write projects/demo/src/app/font-source.ts projects/demo/src/app/font-source.spec.ts projects/demo/src/app/app.config.ts projects/demo/src/styles.css
git add projects/demo/src/app/font-source.ts projects/demo/src/app/font-source.spec.ts projects/demo/src/app/app.config.ts projects/demo/src/styles.css
git commit -m "fix: resolve the base font against base href"
```

---

### Task 2: Static build configuration, output guard, and deploy workflow

Makes the site publishable and makes a silently-unprotected page a build failure.

**Files:**

- Modify: `angular.json` — add a `github-pages` configuration under `projects.demo.architect.build.configurations`
- Create: `scripts/verify-static-build.mjs`
- Modify: `package.json` — add `build:pages` and `verify:static` scripts
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` — document deployment and the one-time Pages setting

**Interfaces:**

- Consumes: Task 1's relative asset paths.
- Produces: `npm run build:pages` (emits `dist/demo/browser`), `npm run verify:static`.

- [ ] **Step 1: Write the failing guard**

Create `scripts/verify-static-build.mjs`:

```js
/**
 * Guard the built static site before it is published.
 *
 * The page's entire claim is that the HTML a crawler downloads is scrambled. A
 * misconfiguration — prerendering off, the directive not running on the server,
 * a stale `disabled` flag — would ship a page that loudly asserts something
 * false about itself while looking perfectly normal in a browser. No visual
 * review catches that, so it is checked here.
 *
 * Usage: node scripts/verify-static-build.mjs [distDir] [baseHref]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist/demo/browser';
const BASE_HREF = process.argv[3] ?? '/no-ai/';

/** A phrase that appears only in the protected article body. */
const PLAINTEXT = 'quick brown fox';

const failures = [];
const check = (ok, message) => void (ok || failures.push(message));

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const files = readdirSync(DIST);
const read = (predicate) =>
  files.filter(predicate).map((name) => ({ name, text: readFileSync(join(DIST, name), 'utf8') }));

check(
  html.includes(`<base href="${BASE_HREF}">`),
  `index.html is missing <base href="${BASE_HREF}">`,
);

check(
  !html.toLowerCase().includes(PLAINTEXT),
  `index.html leaks the protected article in plaintext ("${PLAINTEXT}") — ` +
    'prerendering is not scrambling',
);

check(
  html.includes('protected-body'),
  'index.html has no .protected-body element — the proof section did not prerender',
);

for (const { name, text } of read((f) => f.endsWith('.css'))) {
  check(
    !text.includes('url(/fonts'),
    `${name} references /fonts absolutely; it will 404 under ${BASE_HREF}`,
  );
}

for (const { name, text } of read((f) => f.endsWith('.js'))) {
  check(
    !text.includes('/fonts/Roboto'),
    `${name} hardcodes /fonts/Roboto; it will 404 under ${BASE_HREF}`,
  );
}

if (failures.length) {
  console.error('FAIL\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

console.log(`PASS — ${DIST} is scrambled and subpath-safe for ${BASE_HREF}`);
```

- [ ] **Step 2: Run the guard against a fresh build to verify it passes**

Run in **PowerShell**:

```powershell
npm run build:lib; npx ng build demo --configuration production --output-mode static --base-href /no-ai/
node scripts/verify-static-build.mjs
```

Expected: `PASS — dist/demo/browser is scrambled and subpath-safe for /no-ai/`.

- [ ] **Step 3: Prove the guard actually catches the regression**

Temporarily revert Task 1's CSS fix (`url('fonts/…')` back to `url('/fonts/…')`), rebuild, and run the guard.
Expected: `FAIL` naming the `.css` file. Then restore the fix and rebuild. Do not commit the temporary revert.

- [ ] **Step 4: Add the build configuration**

Modify `angular.json` — inside `projects.demo.architect.build.configurations`, after the `development` block:

```jsonc
"github-pages": {
  "outputMode": "static",
  "baseHref": "/no-ai/"
}
```

Angular configurations do not inherit from one another, so builds must name both: `--configuration production,github-pages`. Later configurations win, which keeps `production`'s budgets and output hashing without duplicating them.

- [ ] **Step 5: Add the npm scripts**

Modify `package.json` `scripts`:

```json
"build:pages": "npm run build:lib && ng build demo --configuration production,github-pages",
"verify:static": "node scripts/verify-static-build.mjs"
```

- [ ] **Step 6: Run the scripts end to end**

Run in **PowerShell**: `npm run build:pages; npm run verify:static`
Expected: build completes with `Prerendered 1 static route.`, then `PASS`.

- [ ] **Step 7: Write the workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy demo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

# Let a newer push supersede an in-flight deploy, but never cancel one midway.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Build library and static site
        run: npm run build:pages

      - name: Verify the built HTML is scrambled
        run: npm run verify:static

      - name: Add SPA fallback and disable Jekyll
        run: |
          cp dist/demo/browser/index.html dist/demo/browser/404.html
          touch dist/demo/browser/.nojekyll

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/demo/browser

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Note it uploads `dist/demo/browser`, not `dist/demo` — `outputMode: static` still emits a `server/` directory as a prerender byproduct, and publishing it would leak the server bundles.

- [ ] **Step 8: Document deployment in the README**

Modify `README.md` — add after the existing `## Commands` block:

````markdown
## Deployment

The demo publishes to <https://pacyfist.github.io/no-ai/> on every push to
`main`, via `.github/workflows/deploy.yml`.

```bash
npm run build:pages    # prerendered static site in dist/demo/browser
npm run verify:static  # assert the built HTML is scrambled and subpath-safe
```

`verify:static` runs in CI between build and upload, so a build that would ship
readable text fails the deploy instead of publishing it.

**One-time setup:** in repo Settings → Pages, set Source to **GitHub Actions**.

On Windows, run `--base-href` builds from PowerShell. Git Bash rewrites a
leading-`/` argument into a Windows path, so `--base-href /no-ai/` becomes
`/Program Files/Git/no-ai` and prerendering fails.
````

- [ ] **Step 9: Commit**

```bash
npx prettier --write angular.json package.json README.md .github/workflows/deploy.yml
git add angular.json package.json README.md scripts/verify-static-build.mjs .github/workflows/deploy.yml
git commit -m "ci: publish the demo to github pages"
```

---

### Task 3: Code block component

**Files:**

- Create: `projects/demo/src/app/sections/code-block.ts`
- Create: `projects/demo/src/app/sections/code-block.spec.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `CodeBlock` with `selector: 'app-code-block'` and inputs `code: string` (required) and `language: string` (default `'html'`). Tasks 7, 8, 9 import it.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/code-block.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CodeBlock } from './code-block';

@Component({
  template: `<app-code-block [code]="snippet" language="ts" />`,
  imports: [CodeBlock],
})
class Host {
  readonly snippet = '<p noAi>Hello</p>';
}

describe('CodeBlock', () => {
  it('renders the snippet verbatim without interpreting it as markup', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const pre = fixture.nativeElement.querySelector('pre') as HTMLElement;

    expect(pre.textContent?.trim()).toBe('<p noAi>Hello</p>');
    expect(pre.querySelector('p')).toBeNull();
  });

  it('labels the snippet with its language', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./code-block`.

- [ ] **Step 3: Write the implementation**

Create `projects/demo/src/app/sections/code-block.ts`:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A snippet, rendered as text. Interpolation keeps markup from being parsed. */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-base-300/40 border-base-300 relative rounded-lg border">
      <span
        class="text-base-content/40 absolute top-2 right-3 font-mono text-[0.65rem] tracking-widest uppercase"
        >{{ language() }}</span
      >
      <pre
        class="overflow-x-auto p-4 pt-6 font-mono text-xs leading-relaxed"
      ><code>{{ code() }}</code></pre>
    </div>
  `,
})
export class CodeBlock {
  readonly code = input.required<string>();
  readonly language = input('html');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test demo --watch=false`
Expected: both `CodeBlock` tests PASS.

- [ ] **Step 5: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/code-block.ts projects/demo/src/app/sections/code-block.spec.ts
git add projects/demo/src/app/sections/code-block.ts projects/demo/src/app/sections/code-block.spec.ts
git commit -m "feat: add code block component"
```

---

### Task 4: Status banner

Extracts the alert and reveal toggle from `app.html` into a section, unchanged in behaviour.

**Files:**

- Create: `projects/demo/src/app/sections/status-banner.ts`
- Create: `projects/demo/src/app/sections/status-banner.spec.ts`
- Modify: `projects/demo/src/app/app.html:19-73` (replace the alert blocks and the toggle with `<app-status-banner />`)
- Modify: `projects/demo/src/app/app.ts` (import `StatusBanner`, drop `toggleReveal`)

**Interfaces:**

- Consumes: nothing.
- Produces: `StatusBanner` with `selector: 'app-status-banner'`, no inputs.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/status-banner.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { NoAiFontService, provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { StatusBanner } from './status-banner';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true })],
  });
  const fixture = TestBed.createComponent(StatusBanner);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('StatusBanner', () => {
  it('reports the generated font once it is ready', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Protection active');
    expect(el.textContent).toContain(TestBed.inject(NoAiFontService).familyName);
  });

  it('reports the reason when the font could not be built', () => {
    const { fixture, el } = setup();
    TestBed.inject(NoAiFontService).failed.set('no FontFace in jsdom');
    fixture.detectChanges();

    expect(el.textContent).toContain('Protection off');
    expect(el.textContent).toContain('no FontFace in jsdom');
  });

  it('drives the reveal signal from the toggle', () => {
    const { fixture, el } = setup();
    const service = TestBed.inject(NoAiFontService);
    const toggle = el.querySelector('input[type=checkbox]') as HTMLInputElement;

    expect(service.revealed()).toBe(false);

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(service.revealed()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./status-banner`.

- [ ] **Step 3: Write the implementation**

Create `projects/demo/src/app/sections/status-banner.ts`. Move the three alert branches and the toggle out of `app.html:19-73` verbatim, then wire the toggle handler:

```ts
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
        <span class="label-text"
          >Withhold the generated font &mdash; show me the raw characters</span
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
```

- [ ] **Step 4: Wire it into the shell**

Modify `projects/demo/src/app/app.html` — delete lines 19-73 (the three `@if` alert branches and the `form-control` toggle block) and put in their place:

```html
<app-status-banner />
```

Modify `projects/demo/src/app/app.ts` — add `StatusBanner` to `imports`, and delete the now-unused `toggleReveal` method.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test demo --watch=false`
Expected: the three `StatusBanner` tests PASS. `app.spec.ts` still fails on `'What an AI reads'` — Task 5 replaces it.

- [ ] **Step 6: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/status-banner.ts projects/demo/src/app/sections/status-banner.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git add projects/demo/src/app/sections/status-banner.ts projects/demo/src/app/sections/status-banner.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git commit -m "refactor: move the status banner into its own section"
```

---

### Task 5: Proof section

The copy-paste demonstration, plus the accessibility mitigation the library README tells consumers to use. Also retires the stale `app.spec.ts` assertions and the "scrapper" typo.

**Files:**

- Create: `projects/demo/src/app/sections/proof-section.ts`
- Create: `projects/demo/src/app/sections/proof-section.spec.ts`
- Modify: `projects/demo/src/app/app.html` (replace the two-card grid with `<app-proof-section />`)
- Modify: `projects/demo/src/app/app.ts` (drop `headline`, `article`, `pasted`, `hasPaste`, `pasteIsReadable`, `onPaste`, `clearPaste`)
- Modify: `projects/demo/src/app/app.spec.ts` (drop the assertions that moved)

**Interfaces:**

- Consumes: nothing.
- Produces: `ProofSection` with `selector: 'app-proof-section'`, and the exported constant `PROTECTED_ARTICLE: string` — the article text, which Task 6 highlights and `scripts/verify-static-build.mjs` greps for.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/proof-section.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { NoAiFontService, provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { PROTECTED_ARTICLE, ProofSection } from './proof-section';

function setup(disabled = true) {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled })],
  });
  const fixture = TestBed.createComponent(ProofSection);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ProofSection', () => {
  it('offers a paste target and the protected paragraph', () => {
    const { el } = setup();
    expect(el.querySelector('.protected-body')).toBeTruthy();
    expect(el.querySelector('textarea.dom-dump')).toBeTruthy();
  });

  it('hides the protected paragraph from assistive technology and offers a readable copy', () => {
    const { el } = setup();
    const protectedEl = el.querySelector('.protected-body') as HTMLElement;
    const readable = el.querySelector('.sr-only') as HTMLElement;

    expect(protectedEl.getAttribute('aria-hidden')).toBe('true');
    expect(readable.textContent).toContain(PROTECTED_ARTICLE);
  });

  it('labels the panel for the reveal state', () => {
    const { fixture, el } = setup();
    const title = () => el.querySelector('.card-title')?.textContent?.trim();

    expect(title()).toBe('What a human reads');

    TestBed.inject(NoAiFontService).revealed.set(true);
    fixture.detectChanges();
    expect(title()).toBe('What a scraper sees');
  });

  it('flags a paste that came through intact', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = PROTECTED_ARTICLE;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.textContent).toContain('came through intact');
  });

  it('flags a paste that arrived scrambled', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = "Kf~0 |0#: e(0 9'6Z";
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.textContent).toContain('unusable');
  });

  it('clears the paste', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;

    textarea.value = 'anything';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./proof-section`.

- [ ] **Step 3: Write the implementation**

Create `projects/demo/src/app/sections/proof-section.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiFontService, NoAiPipe } from '@pacyfist/no-ai';

/** The sample the whole page is built around. Task 6 and the build guard read it. */
export const PROTECTED_ARTICLE =
  'The quick brown fox jumps over the lazy dog. Pack my box with five dozen ' +
  'liquor jugs. How vexingly quick daft zebras jump! 0123456789 — this ' +
  'paragraph is stored in the DOM as gibberish and repaired by a font that ' +
  'was generated in your browser a moment ago.';

const PROTECTED_HEADLINE = 'Everything below this line is protected';

@Component({
  selector: 'app-proof-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective, NoAiFontDirective, NoAiPipe],
  template: `
    <div class="grid gap-5 lg:grid-cols-2">
      <div class="card bg-base-100 border-base-300 border shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-base-content/60 text-xs tracking-widest uppercase">
            {{ noAi.revealed() ? 'What a scraper sees' : 'What a human reads' }}
          </h2>
          <h3 class="mt-1 text-lg font-semibold" noAiFont aria-hidden="true">
            {{ headline | noAi }}
          </h3>
          <p class="protected-body leading-relaxed" aria-hidden="true" [noAi]="article"></p>

          <!-- Protected text reads as gibberish to a screen reader. The library
               README tells consumers to pair it with an accessible copy; the
               demo should do what it recommends. -->
          <p class="sr-only">{{ headline }} {{ article }}</p>

          <div class="divider my-2"></div>
          <p class="text-base-content/60 text-sm">
            Select this paragraph and copy it, then paste it on the right.
          </p>
        </div>
      </div>

      <div class="card bg-base-100 border-base-300 border shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-base-content/60 text-xs tracking-widest uppercase">
            Paste it back here
            @if (hasPaste()) {
              @if (pasteIsReadable()) {
                <span class="badge badge-error badge-soft badge-xs ml-1 normal-case"
                  >came through intact</span
                >
              } @else {
                <span class="badge badge-warning badge-soft badge-xs ml-1 normal-case"
                  >unusable</span
                >
              }
            }
          </h2>

          <textarea
            class="textarea dom-dump mt-1 min-h-40 w-full flex-1 font-mono text-sm leading-relaxed"
            placeholder="Paste the copied paragraph here…"
            aria-label="Paste the copied paragraph"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            [value]="pasted()"
            (input)="onPaste($event)"
          ></textarea>

          @if (hasPaste()) {
            <div class="mt-2 flex items-center justify-between gap-2">
              <span class="text-base-content/60 text-xs"
                >{{ pasted().length }} characters pasted</span
              >
              <button type="button" class="btn btn-ghost btn-xs" (click)="clearPaste()">
                Clear
              </button>
            </div>
          }

          <div class="divider my-2"></div>
          <p class="text-base-content/60 text-sm">
            The clipboard carries the DOM's characters, not the glyphs you saw. This is the same
            string an HTML parser or a crawler receives.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ProofSection {
  protected readonly noAi = inject(NoAiFontService);

  protected readonly headline = PROTECTED_HEADLINE;
  protected readonly article = PROTECTED_ARTICLE;

  /** Whatever the visitor pasted back after copying the protected paragraph. */
  protected readonly pasted = signal('');

  protected readonly hasPaste = computed(() => this.pasted().trim().length > 0);

  /**
   * Whether the clipboard round-trip survived — true only if protection is off
   * or broken, which is exactly what makes the comparison worth showing.
   */
  protected readonly pasteIsReadable = computed(
    () => this.hasPaste() && this.pasted().trim() === this.article.trim(),
  );

  protected onPaste(event: Event): void {
    this.pasted.set((event.target as HTMLTextAreaElement).value);
  }

  protected clearPaste(): void {
    this.pasted.set('');
  }
}
```

- [ ] **Step 4: Wire it into the shell and shrink `app.ts`**

Modify `projects/demo/src/app/app.html` — replace the whole `<div class="grid gap-5 lg:grid-cols-2">…</div>` block with:

```html
<app-proof-section />
```

Modify `projects/demo/src/app/app.ts` — add `ProofSection` to `imports`; delete `headline`, `article`, `pasted`, `hasPaste`, `pasteIsReadable`, `onPaste`, `clearPaste`, and the now-unused `NoAiDirective`, `NoAiFontDirective`, `NoAiPipe`, `computed`, `signal` imports.

Modify `projects/demo/src/app/app.spec.ts` — delete the `shows the protected paragraph and a paste target` and `labels the left panel for the reveal state` tests. They now live in `proof-section.spec.ts`, and the second one asserts copy this task deleted.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test demo --watch=false`
Expected: all tests PASS, including the previously-failing `app.spec.ts` — the stale `'What an AI reads'` assertion is gone.

- [ ] **Step 6: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/proof-section.ts projects/demo/src/app/sections/proof-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts projects/demo/src/app/app.spec.ts
git add projects/demo/src/app/sections/proof-section.ts projects/demo/src/app/sections/proof-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts projects/demo/src/app/app.spec.ts
git commit -m "feat: add proof section with an accessible copy"
```

---

### Task 6: Raw HTML section

Shows the bytes the server actually served, and states the pinned-seed caveat.

**Files:**

- Create: `projects/demo/src/app/sections/raw-html-section.ts`
- Create: `projects/demo/src/app/sections/raw-html-section.spec.ts`
- Modify: `projects/demo/src/app/app.html` (add `<app-raw-html-section />` after the proof section)
- Modify: `projects/demo/src/app/app.ts` (import it)

**Interfaces:**

- Consumes: `PROTECTED_ARTICLE` from Task 5 (not directly — it locates `protected-body` in the markup).
- Produces: `RawHtmlSection` with `selector: 'app-raw-html-section'`, and `excerptAround(html: string, marker: string, radius?: number): string` exported for testing.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/raw-html-section.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RawHtmlSection, excerptAround } from './raw-html-section';

const SERVED = `<html><body><p class="protected-body">Kf~0 |0#: e(0 9'6Z</p></body></html>`;

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true })],
  });
  const fixture = TestBed.createComponent(RawHtmlSection);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('excerptAround', () => {
  it('returns a window centred on the marker', () => {
    const html = `${'a'.repeat(500)}MARKER${'b'.repeat(500)}`;
    const excerpt = excerptAround(html, 'MARKER', 20);

    expect(excerpt).toContain('MARKER');
    expect(excerpt.length).toBeLessThan(html.length);
  });

  it('falls back to the head of the document when the marker is absent', () => {
    expect(excerptAround('no marker here', 'MARKER', 5)).toContain('no ma');
  });
});

describe('RawHtmlSection', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the bytes the server returned for this URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(SERVED, { status: 200 })),
    );
    const { el } = await setup();

    expect(el.querySelector('pre')?.textContent).toContain("Kf~0 |0#: e(0 9'6Z");
  });

  it('warns and falls back to the DOM when the page cannot be re-fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    const { el } = await setup();

    expect(el.textContent).toContain('Could not re-fetch');
  });

  it('states that static hosting pins the cipher', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(SERVED, { status: 200 })),
    );
    const { el } = await setup();

    expect(el.textContent).toContain('same substitution');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./raw-html-section`.

- [ ] **Step 3: Write the implementation**

Create `projects/demo/src/app/sections/raw-html-section.ts`:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  signal,
} from '@angular/core';

const MARKER = 'protected-body';

/** A readable window of `html` centred on `marker`, or its head if absent. */
export function excerptAround(html: string, marker: string, radius = 400): string {
  const at = html.indexOf(marker);
  if (at === -1) return html.slice(0, radius * 2);

  const start = Math.max(0, at - radius);
  const end = Math.min(html.length, at + radius);
  return `${start > 0 ? '…' : ''}${html.slice(start, end)}${end < html.length ? '…' : ''}`;
}

/**
 * Re-fetches this very URL and shows what came back.
 *
 * That response is the literal file the host served — the same bytes a crawler
 * downloads — which is only true because the route is prerendered.
 */
@Component({
  selector: 'app-raw-html-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-10">
      <h2 class="mb-2 text-xl font-bold">What the server actually sent</h2>
      <p class="text-base-content/70 mb-4 max-w-3xl">
        This page re-requested its own URL and printed the response. No JavaScript ran on it — it is
        the same HTML a crawler receives.
      </p>

      @if (warning(); as message) {
        <div role="alert" class="alert alert-warning alert-soft mb-3">
          <span class="text-sm">{{ message }}</span>
        </div>
      }

      @if (source(); as html) {
        <div class="bg-base-300/40 border-base-300 rounded-lg border">
          <pre
            class="dom-dump max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed"
          ><code>{{ excerpt() }}</code></pre>
        </div>
      } @else {
        <div class="alert">
          <span class="loading loading-spinner loading-sm"></span>
          <span class="text-sm">Fetching this page…</span>
        </div>
      }

      <p class="text-base-content/60 mt-3 max-w-3xl text-sm">
        One caveat this page owes you: it is statically prerendered, so the cipher was fixed when
        the site was built. Every visitor gets the same substitution, which frequency analysis
        solves once and reuses forever. A server rendering per request draws a fresh cipher each
        time; static hosting cannot.
      </p>
    </section>
  `,
})
export class RawHtmlSection {
  protected readonly source = signal<string | null>(null);
  protected readonly warning = signal<string | null>(null);

  protected readonly excerpt = computed(() => excerptAround(this.source() ?? '', MARKER));

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      const response = await fetch(location.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      this.source.set(await response.text());
    } catch (error) {
      this.warning.set(
        `Could not re-fetch this page (${(error as Error).message}). Showing the ` +
          'text held in the DOM instead — the same characters, one step later.',
      );
      this.source.set(document.querySelector(`.${MARKER}`)?.textContent ?? '');
    }
  }
}
```

- [ ] **Step 4: Wire it into the shell**

Modify `projects/demo/src/app/app.html` — after `<app-proof-section />`, add:

```html
<app-raw-html-section />
```

Modify `projects/demo/src/app/app.ts` — add `RawHtmlSection` to `imports`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test demo --watch=false`
Expected: all five new tests PASS, plus everything from Tasks 1-5.

- [ ] **Step 6: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/raw-html-section.ts projects/demo/src/app/sections/raw-html-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git add projects/demo/src/app/sections/raw-html-section.ts projects/demo/src/app/sections/raw-html-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git commit -m "feat: show the served html and the pinned seed caveat"
```

---

### Task 7: API section

**Files:**

- Create: `projects/demo/src/app/sections/api-section.ts`
- Create: `projects/demo/src/app/sections/api-section.spec.ts`
- Modify: `projects/demo/src/app/app.html`, `projects/demo/src/app/app.ts`

**Interfaces:**

- Consumes: `CodeBlock` from Task 3.
- Produces: `ApiSection` with `selector: 'app-api-section'`.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/api-section.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { ApiSection } from './api-section';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true })],
  });
  const fixture = TestBed.createComponent(ApiSection);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ApiSection', () => {
  it('demonstrates all three template APIs', () => {
    const el = setup();
    expect(el.querySelectorAll('.api-demo').length).toBe(3);
  });

  it('shows the source for each demo', () => {
    const el = setup();
    const snippets = [...el.querySelectorAll('pre')].map((p) => p.textContent ?? '');

    expect(snippets.some((s) => s.includes('<p noAi>'))).toBe(true);
    expect(snippets.some((s) => s.includes('[noAi]='))).toBe(true);
    expect(snippets.some((s) => s.includes('| noAi'))).toBe(true);
  });

  it('explains why the pipe needs noAiFont instead of the directive', () => {
    const el = setup();
    expect(el.textContent).toContain('textContent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./api-section`.

- [ ] **Step 3: Write the implementation**

Create `projects/demo/src/app/sections/api-section.ts`:

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NoAiDirective, NoAiFontDirective, NoAiPipe } from '@pacyfist/no-ai';
import { CodeBlock } from './code-block';

@Component({
  selector: 'app-api-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective, NoAiFontDirective, NoAiPipe, CodeBlock],
  template: `
    <section class="mt-10">
      <h2 class="mb-2 text-xl font-bold">Three ways to protect text</h2>
      <p class="text-base-content/70 mb-4 max-w-3xl">
        Each panel below is live. The rendered text is on top; the source that produced it is
        underneath.
      </p>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-5">
            <h3 class="text-base-content/60 text-xs tracking-widest uppercase">Static text</h3>
            <p class="api-demo leading-relaxed" noAi aria-hidden="true">
              The directive takes the element's own content.
            </p>
            <p class="sr-only">The directive takes the element's own content.</p>
            <app-code-block code="<p noAi>The directive takes the element's own content.</p>" />
          </div>
        </div>

        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-5">
            <h3 class="text-base-content/60 text-xs tracking-widest uppercase">Bound string</h3>
            <p class="api-demo leading-relaxed" aria-hidden="true" [noAi]="body()"></p>
            <p class="sr-only">{{ body() }}</p>
            <app-code-block code='<p [noAi]="body()"></p>' />
          </div>
        </div>

        <div class="card bg-base-100 border-base-300 border">
          <div class="card-body gap-3 p-5">
            <h3 class="text-base-content/60 text-xs tracking-widest uppercase">Interpolated</h3>
            <p class="api-demo leading-relaxed" noAiFont aria-hidden="true">{{ title() | noAi }}</p>
            <p class="sr-only">{{ title() }}</p>
            <app-code-block code="<p noAiFont>{{ '{{' }} title() | noAi {{ '}}' }}</p>" />
          </div>
        </div>
      </div>

      <p class="text-base-content/60 mt-4 max-w-3xl text-sm">
        Use the pipe with <code class="kbd kbd-xs">noAiFont</code> whenever Angular interpolates the
        text. The directive owns the element's <code class="kbd kbd-xs">textContent</code>, so
        putting it on an interpolated element makes the two fight over it.
      </p>
    </section>
  `,
})
export class ApiSection {
  protected readonly body = signal('A string handed to the directive as an input.');
  protected readonly title = signal('Interpolated, then piped through noAi.');
}
```

- [ ] **Step 4: Wire it into the shell**

Modify `projects/demo/src/app/app.html` — after `<app-raw-html-section />`, add `<app-api-section />`. Modify `projects/demo/src/app/app.ts` — add `ApiSection` to `imports`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test demo --watch=false`
Expected: the three `ApiSection` tests PASS.

- [ ] **Step 6: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/api-section.ts projects/demo/src/app/sections/api-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git add projects/demo/src/app/sections/api-section.ts projects/demo/src/app/sections/api-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git commit -m "feat: add api section showing all three directives"
```

---

### Task 8: Config lab

Four cards, each running a real `provideNoAi` in its own environment injector.

**Files:**

- Create: `projects/demo/src/app/sections/config-card.ts`
- Create: `projects/demo/src/app/sections/config-lab.ts`
- Create: `projects/demo/src/app/sections/config-lab.spec.ts`
- Modify: `projects/demo/src/app/app.html`, `projects/demo/src/app/app.ts`

**Interfaces:**

- Consumes: `baseFontBuffer` (Task 1), `CodeBlock` (Task 3).
- Produces: `ConfigLab` with `selector: 'app-config-lab'`; `ConfigCard` with required input `text: string`.

**Critical:** the lab must never run during prerender. `NoAiFontService` writes the seed to one shared `TransferState` key whenever it is not in a browser, so four extra services on the server would clobber the shell's seed and break hydration. `@defer (on viewport)` renders only its `@placeholder` on the server, which is what keeps them out.

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/config-lab.spec.ts`:

```ts
import {
  EnvironmentInjector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoAiFontService, provideNoAi } from '@pacyfist/no-ai';
import { describe, expect, it } from 'vitest';
import { LAB_CARDS } from './config-lab';

describe('LAB_CARDS', () => {
  it('covers every configuration option the README documents', () => {
    const keys = LAB_CARDS.flatMap((card) => Object.keys(card.config));

    expect(keys).toContain('seed');
    expect(keys).toContain('disabled');
    expect(keys).toContain('charset');
    expect(keys).toContain('hideUntilReady');
  });

  it('gives every card its own title and snippet', () => {
    expect(new Set(LAB_CARDS.map((c) => c.title)).size).toBe(LAB_CARDS.length);
    expect(LAB_CARDS.every((c) => c.code.includes('provideNoAi'))).toBe(true);
  });

  it('builds an isolated service per card, each honouring its own config', () => {
    TestBed.configureTestingModule({
      providers: [provideNoAi({ font: new ArrayBuffer(0), seed: 999, disabled: true })],
    });
    const parent = TestBed.inject(EnvironmentInjector);
    const shell = TestBed.inject(NoAiFontService);

    const services = LAB_CARDS.map((card) => {
      const child = createEnvironmentInjector([provideNoAi(card.config)], parent);
      return runInInjectionContext(child, () => child.get(NoAiFontService));
    });

    // Each card got its own instance, distinct from the shell's.
    expect(new Set(services).size).toBe(LAB_CARDS.length);
    expect(services).not.toContain(shell);

    const pinned = LAB_CARDS.findIndex((c) => c.config.seed === 12345);
    expect(services[pinned].familyName).toBe(`NoAi-${(12345).toString(36)}`);

    const killed = LAB_CARDS.findIndex((c) => c.config.disabled === true);
    expect(services[killed].active()).toBe(false);

    const digits = LAB_CARDS.findIndex((c) => c.config.charset !== undefined);
    expect(services[digits].map.forward.size).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./config-lab`.

- [ ] **Step 3: Write the card component**

Create `projects/demo/src/app/sections/config-card.ts`:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NoAiDirective } from '@pacyfist/no-ai';

/**
 * One protected sample. Instantiated once per child EnvironmentInjector, so the
 * `NoAiDirective` inside it resolves whichever `NoAiFontService` that injector
 * provides rather than the shell's.
 */
@Component({
  selector: 'app-config-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NoAiDirective],
  template: `
    <p class="config-sample leading-relaxed" aria-hidden="true" [noAi]="text()"></p>
    <p class="sr-only">{{ text() }}</p>
  `,
})
export class ConfigCard {
  readonly text = input.required<string>();
}
```

- [ ] **Step 4: Write the lab component**

Create `projects/demo/src/app/sections/config-lab.ts`:

```ts
import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  OnDestroy,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { provideNoAi } from '@pacyfist/no-ai';
import type { NoAiConfig } from '@pacyfist/no-ai';
import { baseFontBuffer } from '../font-source';
import { CodeBlock } from './code-block';
import { ConfigCard } from './config-card';

export interface LabCard {
  title: string;
  explains: string;
  sample: string;
  code: string;
  config: NoAiConfig;
}

const DIGITS = Array.from({ length: 10 }, (_, i) => 0x30 + i);

/** Every card shares the one fetched .ttf, so the font crosses the wire once. */
export const LAB_CARDS: readonly LabCard[] = [
  {
    title: 'Pinned cipher',
    explains:
      'Reload the page: this card keeps the same substitution while the rest of the page draws a new one. For tests and reproducible builds only — a constant cipher is solved once and reused forever.',
    sample: 'The same substitution on every single page load.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  seed: 12345,\n})`,
    config: { font: baseFontBuffer, fallbackFontFamily: "'Roboto', sans-serif", seed: 12345 },
  },
  {
    title: 'Kill switch',
    explains:
      'Nothing is scrambled and no font is forged. Flip this per environment when you want the feature off without removing the directives.',
    sample: 'Untouched text, readable by everything including scrapers.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  disabled: true,\n})`,
    config: { font: baseFontBuffer, fallbackFontFamily: "'Roboto', sans-serif", disabled: true },
  },
  {
    title: 'Narrow charset',
    explains:
      'Only the ten digits are in the cipher, so letters pass through untouched. Useful when just the numbers matter — prices, counts, phone numbers.',
    sample: 'Order 8391 shipped on 2026-08-07 for 429 units.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  charset: [0x30, /* … */ 0x39],\n})`,
    config: { font: baseFontBuffer, fallbackFontFamily: "'Roboto', sans-serif", charset: DIGITS },
  },
  {
    title: 'No hiding',
    explains:
      'Protected text paints immediately instead of waiting for the font, so a reader may glimpse raw ciphertext. The trade is that visitors without JavaScript see the scrambled text rather than nothing at all.',
    sample: 'Visible from the first frame, gibberish included.',
    code: `provideNoAi({\n  font: baseFontBuffer,\n  hideUntilReady: false,\n})`,
    config: {
      font: baseFontBuffer,
      fallbackFontFamily: "'Roboto', sans-serif",
      hideUntilReady: false,
    },
  },
];

@Component({
  selector: 'app-config-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, CodeBlock],
  template: `
    <section class="mt-10">
      <h2 class="mb-2 text-xl font-bold">Configuration, running live</h2>
      <p class="text-base-content/70 mb-4 max-w-3xl">
        Each card below is a separate instance of the library with its own settings — a real child
        injector, not a mock.
      </p>

      @defer (on viewport) {
        <div class="grid gap-4 md:grid-cols-2">
          @for (card of cards; track card.title) {
            <div class="card bg-base-100 border-base-300 border">
              <div class="card-body gap-3 p-5">
                <h3 class="text-base-content/60 text-xs tracking-widest uppercase">
                  {{ card.title }}
                </h3>
                <ng-container
                  *ngComponentOutlet="
                    ConfigCard;
                    environmentInjector: injectorFor(card);
                    inputs: { text: card.sample }
                  "
                />
                <p class="text-base-content/60 text-sm">{{ card.explains }}</p>
                <app-code-block [code]="card.code" language="ts" />
              </div>
            </div>
          }
        </div>
      } @placeholder {
        <div
          class="text-base-content/50 border-base-300 rounded-lg border border-dashed p-8 text-sm"
        >
          Scroll down to build four more fonts…
        </div>
      }
    </section>
  `,
})
export class ConfigLab implements OnDestroy {
  private readonly parent = inject(EnvironmentInjector);
  private readonly injectors = new Map<string, EnvironmentInjector>();

  protected readonly ConfigCard = ConfigCard;
  protected readonly cards = LAB_CARDS;

  /**
   * One injector per card, created once and reused. Building a fresh one per
   * change detection pass would forge a new font every cycle.
   */
  protected injectorFor(card: LabCard): EnvironmentInjector {
    let injector = this.injectors.get(card.title);
    if (!injector) {
      injector = createEnvironmentInjector(
        [provideNoAi(card.config)],
        this.parent,
        `no-ai:${card.title}`,
      );
      this.injectors.set(card.title, injector);
    }
    return injector;
  }

  ngOnDestroy(): void {
    this.injectors.forEach((injector) => injector.destroy());
    this.injectors.clear();
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test demo --watch=false`
Expected: the three `LAB_CARDS` tests PASS.

- [ ] **Step 6: Wire it into the shell and confirm it stays out of the prerender**

Modify `projects/demo/src/app/app.html` — after `<app-api-section />`, add `<app-config-lab />`. Modify `projects/demo/src/app/app.ts` — add `ConfigLab` to `imports`.

Run in **PowerShell**: `npm run build:pages`

```powershell
Select-String -Path dist/demo/browser/index.html -Pattern 'Scroll down to build four more fonts'
Select-String -Path dist/demo/browser/index.html -Pattern 'config-sample'
```

Expected: the first matches (the placeholder prerendered), the second prints nothing (no card instantiated on the server). If `config-sample` appears, the defer block is running during prerender and hydration will break — stop and fix before continuing.

- [ ] **Step 7: Verify hydration in a real browser**

Run `npm start`, then in another shell `npm run verify:browser`.
Expected: `PASS`, with `console errors: none`. A hydration mismatch would surface here as an NG0500-series error.

- [ ] **Step 8: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/config-lab.ts projects/demo/src/app/sections/config-card.ts projects/demo/src/app/sections/config-lab.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git add projects/demo/src/app/sections/config-lab.ts projects/demo/src/app/sections/config-card.ts projects/demo/src/app/sections/config-lab.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts
git commit -m "feat: add live config lab with isolated injectors"
```

---

### Task 9: Trade-offs, install section, and shell polish

Finishes the page: moves the remaining inline markup out, adds the install/license section, and gives the document a real title.

**Files:**

- Create: `projects/demo/src/app/sections/tradeoffs-section.ts`
- Create: `projects/demo/src/app/sections/install-section.ts`
- Create: `projects/demo/src/app/sections/install-section.spec.ts`
- Modify: `projects/demo/src/app/app.html` (final shell), `projects/demo/src/app/app.ts`, `projects/demo/src/app/app.spec.ts`
- Modify: `projects/demo/src/index.html`

**Interfaces:**

- Consumes: `CodeBlock` (Task 3).
- Produces: `TradeoffsSection` (`app-tradeoffs-section`), `InstallSection` (`app-install-section`).

- [ ] **Step 1: Write the failing test**

Create `projects/demo/src/app/sections/install-section.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InstallSection } from './install-section';

function setup() {
  const fixture = TestBed.createComponent(InstallSection);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('InstallSection', () => {
  it('states the license before the install command', () => {
    const el = setup();
    const text = el.textContent ?? '';

    expect(text).toContain('AGPL-3.0-only');
    expect(text.indexOf('AGPL-3.0-only')).toBeLessThan(text.indexOf('npm install'));
  });

  it('warns that the network clause covers a served site', () => {
    expect(setup().textContent).toContain('network');
  });

  it('names opentype.js as a peer dependency and links to the repository', () => {
    const el = setup();
    expect(el.textContent).toContain('opentype.js');
    expect(el.querySelector('a[href*="github.com/pacyfist/no-ai"]')).toBeTruthy();
  });

  it('does not link to npm, since the package is not published', () => {
    expect(setup().querySelector('a[href*="npmjs.com"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test demo --watch=false`
Expected: FAIL — cannot resolve `./install-section`.

- [ ] **Step 3: Write the trade-offs section**

Create `projects/demo/src/app/sections/tradeoffs-section.ts` — move the three cards out of `app.html` verbatim:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-tradeoffs-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-10">
      <h2 class="mb-4 text-xl font-bold">What this actually buys you</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="card bg-base-100 border-success/30 border">
          <div class="card-body p-5">
            <span class="badge badge-success badge-soft badge-sm mb-1">Stops</span>
            <p class="text-base-content/80 text-sm leading-relaxed">
              Bulk text extraction: <code class="kbd kbd-xs">fetch</code> plus an HTML parse,
              <code class="kbd kbd-xs">innerText</code> scraping, copy-paste into a chat window. The
              server-rendered HTML is scrambled too, so crawlers that never run JavaScript get
              nothing readable.
            </p>
          </div>
        </div>
        <div class="card bg-base-100 border-error/30 border">
          <div class="card-body p-5">
            <span class="badge badge-error badge-soft badge-sm mb-1">Does not stop</span>
            <p class="text-base-content/80 text-sm leading-relaxed">
              A determined adversary. The generated font is downloadable and its
              <code class="kbd kbd-xs">cmap</code> describes the substitution completely &mdash;
              anyone willing to parse it can invert the cipher. Rendering the page and running OCR
              also defeats it.
            </p>
          </div>
        </div>
        <div class="card bg-base-100 border-warning/30 border">
          <div class="card-body p-5">
            <span class="badge badge-warning badge-soft badge-sm mb-1">Costs you</span>
            <p class="text-base-content/80 text-sm leading-relaxed">
              Screen-reader output, in-page search, and copy-paste on protected text. That is the
              same mechanism, not a bug. Protect article bodies; leave navigation, headings, and
              anything assistive technology needs alone.
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class TradeoffsSection {}
```

- [ ] **Step 4: Write the install section**

Create `projects/demo/src/app/sections/install-section.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CodeBlock } from './code-block';

const SETUP = `import { provideNoAi } from '@pacyfist/no-ai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNoAi({
      font: 'fonts/Roboto-Regular.ttf',
      fallbackFontFamily: "'Roboto', sans-serif",
    }),
  ],
};`;

@Component({
  selector: 'app-install-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlock],
  template: `
    <section class="mt-10">
      <h2 class="mb-4 text-xl font-bold">Using it</h2>

      <div role="alert" class="alert alert-info alert-soft mb-4">
        <div>
          <div class="font-semibold">Licensed AGPL-3.0-only</div>
          <div class="text-sm opacity-80">
            The AGPL's network clause covers software offered to users over a network, which is what
            a web page is. Serving a public site that uses this library puts that site's source
            under the same terms. Deliberate — weigh it before adopting.
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 class="text-base-content/60 mb-2 text-xs tracking-widest uppercase">Install</h3>
          <app-code-block code="npm install @pacyfist/no-ai opentype.js" language="bash" />
          <p class="text-base-content/60 mt-3 text-sm">
            <code class="kbd kbd-xs">opentype.js</code> is a peer dependency, so you pick the
            version. You also supply a base font as <code class="kbd kbd-xs">.ttf</code> or
            <code class="kbd kbd-xs">.otf</code> — opentype.js cannot read WOFF or WOFF2 — and it
            should be the typeface your body text already uses.
          </p>
        </div>

        <div>
          <h3 class="text-base-content/60 mb-2 text-xs tracking-widest uppercase">Set up</h3>
          <app-code-block [code]="setup" language="ts" />
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <a
          class="btn btn-primary btn-sm"
          href="https://github.com/pacyfist/no-ai"
          rel="noopener"
          target="_blank"
          >Source on GitHub</a
        >
        <a
          class="btn btn-ghost btn-sm"
          href="https://github.com/pacyfist/no-ai/blob/main/projects/pacyfist/no-ai/README.md"
          rel="noopener"
          target="_blank"
          >Library README</a
        >
        <span class="text-base-content/50 text-sm">Not yet published to npm.</span>
      </div>
    </section>
  `,
})
export class InstallSection {
  protected readonly setup = SETUP;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx ng test demo --watch=false`
Expected: the four `InstallSection` tests PASS.

- [ ] **Step 6: Finish the shell**

Replace `projects/demo/src/app/app.html` entirely:

```html
<div class="bg-base-200 min-h-screen">
  <div class="navbar bg-base-100 border-base-300 border-b">
    <div class="mx-auto flex w-full max-w-5xl items-center justify-between px-2">
      <span class="font-mono text-sm font-semibold">&#64;pacyfist/no-ai</span>
      <div class="flex items-center gap-2">
        <span class="badge badge-soft badge-primary badge-sm">Angular {{ angularVersion }}</span>
        <a
          class="btn btn-ghost btn-xs"
          href="https://github.com/pacyfist/no-ai"
          rel="noopener"
          target="_blank"
          >GitHub</a
        >
      </div>
    </div>
  </div>

  <main class="mx-auto w-full max-w-5xl px-4 py-10">
    <header class="mb-8">
      <h1 class="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">Text a scraper can't read</h1>
      <p class="text-base-content/70 max-w-3xl text-lg">
        The paragraph below is stored in the DOM as a substitution cipher. A font built in your
        browser at page load maps the scrambled codepoints back to the right glyph outlines, so you
        read the original words while <code class="kbd kbd-sm">innerText</code> hands out nonsense.
      </p>
    </header>

    <app-status-banner />
    <app-proof-section />
    <app-raw-html-section />
    <app-api-section />
    <app-config-lab />
    <app-tradeoffs-section />
    <app-install-section />
  </main>

  <footer class="footer footer-center text-base-content/60 border-base-300 mt-10 border-t p-6">
    <p class="text-sm">
      &#64;pacyfist/no-ai &mdash; AGPL-3.0-only. Roboto is Apache-2.0, Copyright Google LLC.
    </p>
  </footer>
</div>
```

Replace `projects/demo/src/app/app.ts`:

```ts
import { Component, VERSION } from '@angular/core';
import { ApiSection } from './sections/api-section';
import { ConfigLab } from './sections/config-lab';
import { InstallSection } from './sections/install-section';
import { ProofSection } from './sections/proof-section';
import { RawHtmlSection } from './sections/raw-html-section';
import { StatusBanner } from './sections/status-banner';
import { TradeoffsSection } from './sections/tradeoffs-section';

/** Shell only. Every demonstration lives in a section component. */
@Component({
  selector: 'app-root',
  imports: [
    StatusBanner,
    ProofSection,
    RawHtmlSection,
    ApiSection,
    ConfigLab,
    TradeoffsSection,
    InstallSection,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly angularVersion = VERSION.major;
}
```

Replace the body of `projects/demo/src/app/app.spec.ts` with shell-level assertions only:

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoAi } from '@pacyfist/no-ai';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // jsdom has no FontFace, so the real font never loads here. `disabled`
        // keeps the component on the fail-open path instead of racing it.
        provideNoAi({ font: new ArrayBuffer(0), seed: 1, disabled: true }),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('leaves the unprotected headline readable', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      "Text a scraper can't read",
    );
  });

  it('composes every section', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    for (const selector of [
      'app-status-banner',
      'app-proof-section',
      'app-raw-html-section',
      'app-api-section',
      'app-config-lab',
      'app-tradeoffs-section',
      'app-install-section',
    ]) {
      expect(el.querySelector(selector), selector).toBeTruthy();
    }
  });
});
```

- [ ] **Step 7: Give the document a real title**

Replace the `<head>` contents of `projects/demo/src/index.html`:

```html
<meta charset="utf-8" />
<title>no-ai — text a scraper can't read</title>
<base href="/" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta
  name="description"
  content="An Angular library that stores text in the DOM as a substitution cipher and repairs it on screen with a font generated at runtime, so bulk scrapers extract gibberish."
/>
<meta property="og:type" content="website" />
<meta property="og:title" content="no-ai — text a scraper can't read" />
<meta
  property="og:description"
  content="Text stored as a cipher, repaired on screen by a font built in your browser. Live demo."
/>
<meta property="og:url" content="https://pacyfist.github.io/no-ai/" />
<meta name="twitter:card" content="summary" />
<link rel="icon" type="image/x-icon" href="favicon.ico" />
```

`<base href="/" />` stays as written — the build rewrites it from `--base-href`.

- [ ] **Step 8: Run the full suite and build**

Run: `npm test`
Expected: library and demo suites both PASS.

Run in **PowerShell**: `npm run build:pages; npm run verify:static`
Expected: `Prerendered 1 static route.` then `PASS`.

- [ ] **Step 9: Verify in a real browser**

Run `npm start`, then `npm run verify:browser` in another shell.
Expected: `PASS` with no console errors. Check `scripts/demo-screenshot.png` and confirm every section rendered and no text reads as gibberish on screen.

- [ ] **Step 10: Commit**

```bash
npx prettier --write projects/demo/src/app/sections/tradeoffs-section.ts projects/demo/src/app/sections/install-section.ts projects/demo/src/app/sections/install-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts projects/demo/src/app/app.spec.ts projects/demo/src/index.html
git add projects/demo/src/app/sections/tradeoffs-section.ts projects/demo/src/app/sections/install-section.ts projects/demo/src/app/sections/install-section.spec.ts projects/demo/src/app/app.html projects/demo/src/app/app.ts projects/demo/src/app/app.spec.ts projects/demo/src/index.html
git commit -m "feat: finish the showcase page and shell"
```

---

## After the plan

Push to `main` and the workflow deploys. Then, outside this plan:

- Set repo Settings → Pages → Source to **GitHub Actions** (one-time).
- File a library issue: `NoAiFontService` writes `TransferState` under one shared key, so nesting `provideNoAi` corrupts the parent's seed during SSR. Fix is to scope the key per injector.
- Consider updating the GitHub repo description — it says "Angular service that confuses AI scrappers"; the shipped surface is two directives, a pipe, a service, and a framework-free cipher core.
