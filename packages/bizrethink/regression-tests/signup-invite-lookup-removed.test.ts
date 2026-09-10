import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { bizrethinkRouter } from '../server-only/trpc/router';

/**
 * `bizrethink.signupInvite.lookup` must not come back.
 *
 * It was a PUBLIC tRPC procedure: given any email address it returned the
 * organisation name and role of every pending invite for that address. That
 * is an enumeration oracle — "which of my targets has been invited where" —
 * and it was called by an external party on 2026-09-10.
 *
 * Its only consumer was the signup form's inline invite preview (overlay
 * 048c). The upstream invite page (/organisation/invite/<token>) already
 * shows the organisation name server-side from the token, which only the
 * invitee holds, so nothing replaces it.
 */

const REPO = join(__dirname, '../../..');

/** Code only: comments may legitimately explain why the thing is gone. */
const code = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('signup invite lookup is removed', () => {
  it('the bizrethink tRPC router has no signupInvite namespace', () => {
    const def = bizrethinkRouter._def as unknown as {
      record: Record<string, unknown>;
      procedures: Record<string, unknown>;
    };

    expect(Object.keys(def.record)).not.toContain('signupInvite');
    expect(Object.keys(def.procedures).filter((path) => path.startsWith('signupInvite'))).toEqual([]);
  });

  it('the router module is deleted', () => {
    expect(existsSync(join(REPO, 'packages/bizrethink/server-only/trpc/signup-invite-router.ts'))).toBe(false);
  });

  it('the signup form no longer calls the lookup', () => {
    const signup = code(join(REPO, 'apps/remix/app/components/forms/signup.tsx'));

    expect(signup).not.toContain('signupInvite');
    expect(signup).not.toContain('PendingInvitePreview');
  });
});
