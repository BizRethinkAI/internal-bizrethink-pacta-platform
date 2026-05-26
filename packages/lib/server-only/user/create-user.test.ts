import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { onCreateUserHook } from './create-user';

// onCreateUserHook calls two helpers we want to observe without touching
// the DB: autoClaimInvitesOnSignup (overlay 048) and createPersonalOrganisation.
const mockedAutoClaim = vi.fn();
const mockedCreatePersonalOrg = vi.fn();

vi.mock('@bizrethink/customizations/server-only/auto-claim-invites-on-signup', () => ({
  autoClaimInvitesOnSignup: (...args: unknown[]) => mockedAutoClaim(...args),
}));

vi.mock('../organisation/create-organisation', () => ({
  createPersonalOrganisation: (...args: unknown[]) => mockedCreatePersonalOrg(...args),
}));

const TEST_USER = { id: 42, email: 'alice@example.com' } as unknown as User;

beforeEach(() => {
  mockedAutoClaim.mockReset();
  mockedCreatePersonalOrg.mockReset();
});

/**
 * Upstream-sync regression suite (added 2026-05-25 after PR #1 deploy fail).
 *
 * PR #1's merge brought in upstream's `handle-oauth-organisation-callback-url.ts`
 * which calls `onCreateUserHook(user, { skipPersonalOrganisation })` — 2 args.
 * Our overlay 048 signature was 1-arg, so tsc failed. The fix added a 2nd
 * optional `options` arg + the `OnCreateUserHookOptions` type.
 *
 * These tests pin both contracts:
 *   - The 1-arg call still works (preserves backward compat for our own callers)
 *   - The 2-arg call honours `skipPersonalOrganisation`
 *   - Auto-claim of invites (overlay 048's behaviour) runs in BOTH modes
 *   - Personal Org creation is gated by BOTH `!skipPersonalOrganisation`
 *     AND `accepted.length === 0`
 *
 * If a future upstream rename/refactor breaks this, fix the hook signature
 * before pushing — see UPSTREAM.md §"Pre-merge gates".
 */
describe('onCreateUserHook — overlay 048 + post-merge 2-arg signature', () => {
  it('accepts a single user arg (backward-compat with our own callers)', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);

    await onCreateUserHook(TEST_USER);

    expect(mockedAutoClaim).toHaveBeenCalledWith({ userId: 42, userEmail: 'alice@example.com' });
    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 42 });
  });

  it('accepts a 2nd options arg (upstream contract from handle-oauth-organisation-callback-url)', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);

    await onCreateUserHook(TEST_USER, { skipPersonalOrganisation: true });

    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('runs auto-claim even when skipPersonalOrganisation=true (overlay 048: universal invite consumption)', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);

    await onCreateUserHook(TEST_USER, { skipPersonalOrganisation: true });

    expect(mockedAutoClaim).toHaveBeenCalledWith({ userId: 42, userEmail: 'alice@example.com' });
  });

  it('skips Personal Org creation when invites were accepted (overlay 048 primary path)', async () => {
    mockedAutoClaim.mockResolvedValueOnce([{ inviteId: 'x' }]);

    await onCreateUserHook(TEST_USER);

    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('creates Personal Org when no invites AND skipPersonalOrganisation is false', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);

    await onCreateUserHook(TEST_USER, { skipPersonalOrganisation: false });

    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 42 });
  });

  it('falls back to Personal Org creation when auto-claim throws (safety net)', async () => {
    mockedAutoClaim.mockRejectedValueOnce(new Error('DB blip'));
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);

    // Silence the console.error the handler emits on failure.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await onCreateUserHook(TEST_USER);

    expect(mockedCreatePersonalOrg).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
