import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * React 19 removed the GLOBAL `JSX` namespace that `@types/react` used to
 * declare. `JSX.Element` now resolves only as `React.JSX.Element`, or via an
 * explicit `import type { JSX } from 'react'`.
 *
 * The 2026-09-07 upstream sync (documenso 2.16.0 -> 2.17.0) carried that
 * migration, and it broke exactly one file: `pacta-signup-hero.tsx`, which is
 * fork-owned (overlay 054). One bare `JSX.Element` cost the whole `Build App`
 * job, and it presents as `error TS2503: Cannot find namespace 'JSX'` — a
 * message that says nothing about React versions.
 *
 * This guard is a grep rather than a behavioural test on purpose: the defect is
 * a type that does not resolve, so `tsc` is the only thing that can observe it,
 * and `tsc` already runs in CI. What `tsc` cannot do is explain WHY, six months
 * from now, to whoever writes the next `JSX.Element` out of habit.
 *
 * Scoped to fork-owned files. `packages/ui/primitives/recipient-role-icons.tsx`
 * also uses the bare namespace and is upstream's; it does not fail today and
 * fixing it would need an overlay for no gain.
 */
const FORK_OWNED_FILES = ['apps/remix/app/components/general/pacta-signup-hero.tsx'];

const REPO_ROOT = join(__dirname, '..', '..', '..');

describe('React 19: no global JSX namespace in fork-owned files', () => {
  it.each(FORK_OWNED_FILES)('%s does not reference the removed global JSX namespace', (file) => {
    const source = readFileSync(join(REPO_ROOT, file), 'utf8');

    // `React.JSX.Element` and an explicit `import type { JSX }` are both fine;
    // only a BARE `JSX.` with no qualifier resolves against the removed global.
    const bare = source
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /(?<!React\.)(?<![\w.])JSX\s*\./.test(line))
      .filter(({ line }) => !/^\s*(\/\/|\*)/.test(line));

    const importsJsxType = /import\s+type\s*\{[^}]*\bJSX\b[^}]*\}\s*from\s*['"]react['"]/.test(source);

    expect(
      importsJsxType || bare.length === 0,
      `${file} uses the bare \`JSX.\` namespace at line(s) ${bare.map((b) => b.n).join(', ')} ` +
        `without importing it. React 19 removed the global; use \`React.JSX.Element\` or ` +
        `\`import type { JSX } from 'react'\`.`,
    ).toBe(true);
  });
});
