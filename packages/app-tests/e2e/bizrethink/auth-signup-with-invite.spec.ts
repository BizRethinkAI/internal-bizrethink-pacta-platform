import { expect, test } from '@playwright/test';
import { OrganisationMemberInviteStatus } from '@prisma/client';
import { customAlphabet } from 'nanoid';

import { prisma } from '@documenso/prisma';
import { resetAllBizRethinkSingletons, seedSiteSettingsSignup } from '@documenso/prisma/seed/bizrethink';
import { extractUserVerificationToken, seedUser } from '@documenso/prisma/seed/users';

import { signSignaturePad } from '../fixtures/signature';

const nanoid = customAlphabet('1234567890abcdef', 10);

/**
 * E1 (subset) from COVERAGE-PLAN-2026-05-25.md — overlay 048 auto-claim
 * invites, amended by overlay 071: the claim waits for email verification.
 *
 * Tests: when a new user signs up with an email that matches a PENDING
 * OrganisationMemberInvite, NOTHING is claimed at signup (anyone can type an
 * invited address). Once the user clicks the verification link, the invite
 * flips to ACCEPTED and they join the inviting org. No Personal Org is
 * created at either step (it is deferred at signup, and skipped at
 * verification because an invite was claimed).
 *
 * Domain-gate variant + requireInviteWhenDomainGated coverage are
 * separate tests (deferred — selectors for the signup-form blocked path
 * need verification first).
 */
test.describe('BizRethink overlays 048 + 071 — invite claimed on email verification', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('signup with an invited email → invite stays PENDING until the email is verified, then ACCEPTED', async ({
    page,
  }) => {
    // Signup fails closed in this fork, so open it explicitly.
    await seedSiteSettingsSignup();

    // Seed an inviting org (with an admin who issues the invite).
    const { organisation: invitingOrg } = await seedUser();

    // Create a pending invite for an as-yet-unregistered email.
    const inviteEmail = `${nanoid()}@invitee.test.documenso.com`.toLowerCase();
    const invite = await prisma.organisationMemberInvite.create({
      data: {
        id: `inv_${nanoid()}`,
        email: inviteEmail,
        organisationId: invitingOrg.id,
        organisationRole: 'MEMBER',
        status: OrganisationMemberInviteStatus.PENDING,
        token: nanoid(),
      },
    });

    // Signup with that exact email.
    const password = 'Password123#';
    const fullName = `Invitee ${nanoid()}`;

    await page.goto('/signup');
    await page.getByLabel('Name').fill(fullName);
    await page.getByLabel('Email').fill(inviteEmail);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await signSignaturePad(page);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    await page.waitForURL('/unverified-account');

    // Wait to ensure the user + verification token are written.
    await page.waitForTimeout(2000);

    const newUser = await prisma.user.findFirstOrThrow({
      where: { email: inviteEmail },
    });

    // Before verification: invite still PENDING, no membership, no Personal Org.
    const inviteBeforeVerify = await prisma.organisationMemberInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(inviteBeforeVerify.status).toBe(OrganisationMemberInviteStatus.PENDING);

    const membershipBeforeVerify = await prisma.organisationMember.findFirst({
      where: { userId: newUser.id, organisationId: invitingOrg.id },
    });
    expect(membershipBeforeVerify).toBeNull();

    const personalOrgsBeforeVerify = await prisma.organisation.count({
      where: { ownerUserId: newUser.id, type: 'PERSONAL' },
    });
    expect(personalOrgsBeforeVerify).toBe(0);

    // Verify the email.
    const { token } = await extractUserVerificationToken(inviteEmail);

    await page.goto(`/verify-email/${token}`);
    await expect(page.getByRole('heading')).toContainText('Email Confirmed!');

    // After verification: invite ACCEPTED, user joined the org, still no Personal Org.
    const inviteAfterVerify = await prisma.organisationMemberInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(inviteAfterVerify.status).toBe(OrganisationMemberInviteStatus.ACCEPTED);

    const membershipAfterVerify = await prisma.organisationMember.findFirst({
      where: { userId: newUser.id, organisationId: invitingOrg.id },
    });
    expect(membershipAfterVerify).not.toBeNull();

    const personalOrgsAfterVerify = await prisma.organisation.count({
      where: { ownerUserId: newUser.id, type: 'PERSONAL' },
    });
    expect(personalOrgsAfterVerify).toBe(0);
  });
});
