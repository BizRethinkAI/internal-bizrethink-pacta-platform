#!/usr/bin/env node
/**
 * Regenerate `font-data.ts` from the .ttf files beside it.
 *
 * The renderer embeds its typefaces as base64 rather than reading them from
 * disk, because the runtime image does not contain `packages/bizrethink` and
 * the bundler rewrites `import.meta.url` to the bundle's own directory. A path
 * resolved at runtime pointed into `build/server/hono/...` and every lease PDF
 * returned 500. Bytes in the bundle cannot be in the wrong place.
 *
 * Run this after replacing a .ttf. The generated file is committed.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages/bizrethink/lease/render/fonts');

const FACES = [
  ['TINOS_REGULAR', 'Tinos-Regular.ttf'],
  ['TINOS_ITALIC', 'Tinos-Italic.ttf'],
  ['SANS_REGULAR', 'SourceSans3-Regular.ttf'],
  ['SANS_SEMIBOLD', 'SourceSans3-SemiBold.ttf'],
];

const header = `/* eslint-disable */
// GENERATED — do not edit. Rebuild with \`node scripts/inline-fonts.mjs\`.
//
// The typefaces as base64 data URLs, not file paths.
//
// WHY BYTES AND NOT A PATH. The runtime image copies \`apps/remix/build\` and a
// handful of configs; \`packages/bizrethink\` source is not in the container at
// all. On top of that the bundler rewrites \`import.meta.url\` to the bundle's
// own location, so a path resolved from this module pointed at
// \`build/server/hono/packages/bizrethink/...\` — a directory that has never
// existed. Every lease PDF in production returned 500 with ENOENT.
//
// A path can be wrong in a way that only production discovers. Bytes cannot.
// react-pdf accepts a data URL directly (\`isDataUrl\` in @react-pdf/font), so
// the fonts travel inside the bundle and no filesystem is consulted at render
// time.
//
// The .ttf files stay in this directory: they are the source these strings are
// generated from, and the OFL licences beside them refer to those files.

`;

const body = FACES.map(([name, file]) => {
  const bytes = readFileSync(join(DIR, file));
  return `/** ${file} — ${statSync(join(DIR, file)).size.toLocaleString('en-US')} bytes */\nexport const ${name} =\n  'data:font/truetype;base64,${bytes.toString('base64')}';\n`;
}).join('\n');

writeFileSync(join(DIR, 'font-data.ts'), header + body + '\n');
console.log(`font-data.ts regenerated from ${FACES.length} faces`);
