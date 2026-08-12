import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Regression guard for the dev-mode-in-production incident (2026-08-12).
 *
 * overlay 033 (Sentry server instrumentation) rewrote the final launch line of
 * `docker/start.sh` from upstream's `npm run start` — which was
 * `cross-env NODE_ENV=production node build/server/main.js` — to a raw
 * `node --import ./build/server/instrument.mjs build/server/main.js`, dropping
 * `NODE_ENV=production`. With NODE_ENV unset, Node resolves react-router's
 * `development` export condition, so the container served the DEV build in
 * production: every 404 dumped a ~10-line internal stack trace, amplifying bot
 * scanner noise ~10x in the logs (and running the slower unoptimized build).
 *
 * The launch command MUST run the server in production mode.
 */
describe('docker/start.sh — production launch mode', () => {
  const startShPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docker/start.sh');
  const script = readFileSync(startShPath, 'utf8');

  // The line that actually boots the server (references the built entrypoint).
  const launchLine = script
    .split('\n')
    .find((line) => line.includes('build/server/main.js') && !line.trimStart().startsWith('#'));

  it('has a server launch line', () => {
    expect(launchLine, 'expected a non-comment line launching build/server/main.js').toBeDefined();
  });

  it('boots the server with NODE_ENV=production', () => {
    // Either set inline on the launch line, or exported earlier in the script.
    const launchIndex = script.indexOf('build/server/main.js');
    const preamble = script.slice(0, launchIndex);
    const setsProductionInline = /NODE_ENV=production\b/.test(launchLine ?? '');
    const setsProductionEarlier = /^\s*(export\s+)?NODE_ENV=production\b/m.test(preamble);

    expect(
      setsProductionInline || setsProductionEarlier,
      'docker/start.sh must set NODE_ENV=production so react-router serves the production build (not the verbose dev build)',
    ).toBe(true);
  });

  it('does not launch the react-router dev server in the container', () => {
    expect(/react-router\s+dev/.test(script)).toBe(false);
  });
});
