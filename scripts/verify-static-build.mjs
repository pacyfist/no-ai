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
