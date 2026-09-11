import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Dependency security floors (2026-09-10, after the external probe).
//
// Every package below had an open Dependabot advisory. Each floor is the first
// patched version. The test reads the ROOT package-lock.json — the file CI and
// the Docker image install from — so it checks what actually ships, not what
// package.json merely permits.
//
// Why a test and not just a bump: the weekly upstream sync resolves lockfile
// conflicts by taking upstream's lockfile wholesale (UPSTREAM.md). A fix that
// lived only in the lockfile would be silently reverted by the next sync. The
// floors are made durable by raised ranges and root `overrides` in package.json
// (overlay 072); this test is what notices if a sync drops them anyway.
//
// When upstream catches up, the override can go — the floor stays.

const FLOORS: Record<string, { floor: string; advisory: string }> = {
  next: {
    floor: '16.3.3',
    advisory: 'GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36 (RCE; docs + openpage-api only, not in the Pacta image)',
  },
  nodemailer: { floor: '9.1.1', advisory: 'GHSA-2x7j-588g-ccc2, -wmmp-3585-3rmp, -8m3c-c648-2xjj, -cc9r-2j5m-2m83' },
  sharp: { floor: '0.35.4', advisory: 'GHSA-rgj7-g3m4-5g8c (libheif)' },
  // Needs columns:true AND group_columns_by_name:true; bulk-send sets only the
  // first, so not exploitable here. Bumped anyway: 7.0.0 has no breaking changes.
  'csv-parse': { floor: '7.0.2', advisory: 'GHSA-8cw4-87c7-c6xx' },
  hono: { floor: '4.13.5', advisory: 'GHSA-crvj-82cr-hjcx, -g6gw-c38x-mqfc, -gqvv-2mrq-wpjv' },
  qs: { floor: '6.16.0', advisory: 'GHSA-4mjr-xmp4-gh2g, -x5fp-wj9c-mxmx' },
  morgan: { floor: '1.12.0', advisory: 'GHSA-jxfw-x594-9x9m' },
  colord: { floor: '2.9.4', advisory: 'GHSA-2wm5-q62r-hmrv' },
  '@faker-js/faker': { floor: '10.5.0', advisory: 'GHSA-qxc2-j82w-r537' },
  '@simplewebauthn/server': { floor: '13.3.2', advisory: 'GHSA-6hxq-p678-4hr2' },
  joi: { floor: '18.2.5', advisory: 'GHSA-gg4h-3hg2-grpc, -6w3j-5fw6-r9vr' },
  vitest: { floor: '4.1.11', advisory: 'GHSA-82fw-gwwq-j7x9 (dev)' },
  '@vitest/mocker': { floor: '4.1.11', advisory: 'GHSA-82fw-gwwq-j7x9 (dev)' },
};

// fflate is floored only within the 0.7 line: 0.4.x (posthog-js) and 0.8.x are
// separate major lines, unaffected by GHSA-px8p-9vwx-vf98.
const LINE_FLOORS: Record<string, { line: string; floor: string; advisory: string }> = {
  fflate: { line: '0.7.', floor: '0.7.5', advisory: 'GHSA-px8p-9vwx-vf98' },
};

// Accepted, with the reason written down (security.yml asks for exactly this
// before the npm-audit gate can become blocking). Revisit when upstream moves.
const ACCEPTED = {
  'deepmerge-ts':
    'GHSA-ggr8-5vv4-36mx. Only via @prisma/config (exact pin 7.1.5), which merges trusted config at startup; no request data reaches it. Forcing v8 risks breaking `prisma migrate deploy` at container start.',
  'ts-deepmerge':
    'GHSA-87mf-gv2c-c62c. Only via @anatine/zod-openapi (^6), which merges static schema objects while building the OpenAPI document; no request data reaches it. v8 is a major.',
  'adm-zip':
    'GHSA-xcpc-8h2w-3j85, GHSA-vwc7-r8mq-g2x9 (no patched version). Dev-only, via inngest-cli; absent from the production image.',
};

const lock = JSON.parse(readFileSync(resolve(__dirname, '../../../package-lock.json'), 'utf8')) as {
  packages: Record<string, { version?: string }>;
};

const versionsOf = (name: string) =>
  Object.entries(lock.packages)
    .filter(([key]) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`))
    .map(([key, value]) => ({ key, version: value.version ?? '' }));

const atLeast = (version: string, floor: string) => {
  const a = version.split('-')[0].split('.').map(Number);
  const b = floor.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) > (b[i] ?? 0);
    }
  }
  return true;
};

describe('dependency security floors (root package-lock.json)', () => {
  for (const [name, { floor, advisory }] of Object.entries(FLOORS)) {
    it(`${name} >= ${floor} everywhere in the lockfile (${advisory})`, () => {
      const found = versionsOf(name);
      expect(found.length, `${name} is not in the lockfile at all`).toBeGreaterThan(0);
      const below = found.filter(({ version }) => !atLeast(version, floor));
      expect(below, `${name} below ${floor}`).toEqual([]);
    });
  }

  for (const [name, { line, floor, advisory }] of Object.entries(LINE_FLOORS)) {
    it(`${name} ${line}x >= ${floor} (${advisory})`, () => {
      const below = versionsOf(name).filter(({ version }) => version.startsWith(line) && !atLeast(version, floor));
      expect(below, `${name} ${line}x below ${floor}`).toEqual([]);
    });
  }

  it('every accepted advisory names a package that is still in the lockfile', () => {
    for (const name of Object.keys(ACCEPTED)) {
      expect(versionsOf(name).length, `${name} is gone — drop it from ACCEPTED`).toBeGreaterThan(0);
    }
  });
});
