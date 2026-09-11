import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Overlay 073 (2026-09-11): every admin leaf loader must gate itself.
//
// Documenso's admin authorization lives only in `admin+/_layout.tsx`. React
// Router 7 single-fetch lets a caller run one leaf loader without its ancestors
// (`/admin/<page>.data?_routes=routes/_authenticated+/admin+/<page>`), so the
// layout check is skipped and any unguarded leaf loader returns tenant data to
// anyone. See A-01 in the 2026-09-10 security audit.
//
// This scans the admin route directory and fails if any route that exports a
// loader does not gate it — either the fork helper `requireAdminLoader`
// (overlay 073) or the pre-existing `isAdmin(...)` self-check the fork's own
// admin pages use. A future upstream sync that adds a new admin page therefore
// cannot ship an anonymous-readable loader without turning this red.

const ADMIN_DIR = resolve(__dirname, '../../../apps/remix/app/routes/_authenticated+/admin+');

// The layout carries the shared check itself and is not a leaf; +types are generated.
const NOT_A_LEAF = new Set(['_layout.tsx']);

const adminRouteFiles = readdirSync(ADMIN_DIR).filter((name) => name.endsWith('.tsx') && !NOT_A_LEAF.has(name));

const hasLoader = (src: string) => /export\s+(async\s+function\s+loader|const\s+loader\s*=)/.test(src);

const isGated = (src: string) => src.includes('requireAdminLoader(') || /isAdmin\s*\(/.test(src);

describe('admin leaf loaders are gated (A-01 / overlay 073)', () => {
  it('found the admin route directory with leaf routes', () => {
    expect(adminRouteFiles.length).toBeGreaterThan(5);
  });

  for (const name of adminRouteFiles) {
    const src = readFileSync(resolve(ADMIN_DIR, name), 'utf8');
    if (!hasLoader(src)) {
      continue;
    }

    it(`${name} gates its loader`, () => {
      expect(
        isGated(src),
        `${name} exports a loader but neither calls requireAdminLoader nor checks isAdmin — ` +
          `it is anonymously readable via the single-fetch .data?_routes= path (A-01).`,
      ).toBe(true);
    });
  }
});
