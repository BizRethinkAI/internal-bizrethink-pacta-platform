import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { onCreateUserHook } from './create-user';

// onCreateUserHook calls helpers we want to observe without touching the DB:
// autoClaimInvitesOnSignup + hasPendingInvites (overlays 048/071) and
// createPersonalOrganisation.
const mockedAutoClaim = vi.fn();
const mockedHasPendingInvites = vi.fn();
const mockedCreatePersonalOrg = vi.fn();

vi.mock('@bizrethink/customizations/server-only/auto-claim-invites-on-signup', () => ({
  autoClaimInvitesOnSignup: (...args: unknown[]) => mockedAutoClaim(...args),
  hasPendingInvites: (...args: unknown[]) => mockedHasPendingInvites(...args),
}));

vi.mock('../organisation/create-organisation', () => ({
  createPersonalOrganisation: (...args: unknown[]) => mockedCreatePersonalOrg(...args),
}));

// A verified user (SSO new-user path) — auto-claim runs at creation.
const VERIFIED_USER = { id: 42, email: 'alice@example.com', emailVerified: new Date() } as unknown as User;
// An unverified user (email-password signup) — auto-claim is deferred to verification.
const UNVERIFIED_USER = { id: 43, email: 'bob@example.com', emailVerified: null } as unknown as User;

beforeEach(() => {
  mockedAutoClaim.mockReset();
  mockedHasPendingInvites.mockReset();
  mockedCreatePersonalOrg.mockReset();
  mockedHasPendingInvites.mockResolvedValue(false);
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
 *   - Auto-claim of invites runs in BOTH modes, for a VERIFIED user
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

    await onCreateUserHook(VERIFIED_USER);

    expect(mockedAutoClaim).toHaveBeenCalledWith({ userId: 42, userEmail: 'alice@example.com' });
    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 42 });
  });

  it('accepts a 2nd options arg (upstream contract from handle-oauth-organisation-callback-url)', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);

    await onCreateUserHook(VERIFIED_USER, { skipPersonalOrganisation: true });

    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('runs auto-claim for a verified user even when skipPersonalOrganisation=true', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);

    await onCreateUserHook(VERIFIED_USER, { skipPersonalOrganisation: true });

    expect(mockedAutoClaim).toHaveBeenCalledWith({ userId: 42, userEmail: 'alice@example.com' });
  });

  it('skips Personal Org creation when invites were accepted (overlay 048 primary path)', async () => {
    mockedAutoClaim.mockResolvedValueOnce([{ inviteId: 'x' }]);

    await onCreateUserHook(VERIFIED_USER);

    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('creates Personal Org when no invites AND skipPersonalOrganisation is false', async () => {
    mockedAutoClaim.mockResolvedValueOnce([]);
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);

    await onCreateUserHook(VERIFIED_USER, { skipPersonalOrganisation: false });

    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 42 });
  });

  it('falls back to Personal Org creation when auto-claim throws (safety net)', async () => {
    mockedAutoClaim.mockRejectedValueOnce(new Error('DB blip'));
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);

    // Silence the console.error the handler emits on failure.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await onCreateUserHook(VERIFIED_USER);

    expect(mockedCreatePersonalOrg).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

/**
 * Overlay 071: a pending invite is claimed only for a VERIFIED email.
 * Claiming at signup (before verification) let anyone who typed an invited
 * address join the inviting org. Unverified users get the claim at
 * verify-email time instead (claimInvitesOnVerification).
 */
describe('onCreateUserHook — overlay 071: claim only for a verified email', () => {
  it('unverified user → autoClaimInvitesOnSignup is NOT called', async () => {
    await onCreateUserHook(UNVERIFIED_USER);

    expect(mockedAutoClaim).not.toHaveBeenCalled();
  });

  it('unverified user + pending invite → no Personal Org (deferred to verification)', async () => {
    mockedHasPendingInvites.mockResolvedValueOnce(true);

    await onCreateUserHook(UNVERIFIED_USER);

    expect(mockedHasPendingInvites).toHaveBeenCalledWith('bob@example.com');
    expect(mockedAutoClaim).not.toHaveBeenCalled();
    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('unverified user + no pending invite → Personal Org created', async () => {
    mockedHasPendingInvites.mockResolvedValueOnce(false);
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);

    await onCreateUserHook(UNVERIFIED_USER);

    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 43 });
  });

  it('unverified user + skipPersonalOrganisation → no Personal Org, no claim', async () => {
    await onCreateUserHook(UNVERIFIED_USER, { skipPersonalOrganisation: true });

    expect(mockedAutoClaim).not.toHaveBeenCalled();
    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('unverified user + hasPendingInvites throws → Personal Org created (safety net)', async () => {
    mockedHasPendingInvites.mockRejectedValueOnce(new Error('DB blip'));
    mockedCreatePersonalOrg.mockResolvedValueOnce(undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await onCreateUserHook(UNVERIFIED_USER);

    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 43 });
    errorSpy.mockRestore();
  });

  it('verified user + invite → claimed, no Personal Org', async () => {
    mockedAutoClaim.mockResolvedValueOnce([{ inviteId: 'x' }]);

    await onCreateUserHook(VERIFIED_USER);

    expect(mockedAutoClaim).toHaveBeenCalledWith({ userId: 42, userEmail: 'alice@example.com' });
    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });
});
