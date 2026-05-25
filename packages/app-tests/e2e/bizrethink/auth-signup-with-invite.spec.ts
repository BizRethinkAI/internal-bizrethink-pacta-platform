import { expect, test } from '@playwright/test';
import { OrganisationMemberInviteStatus } from '@prisma/client';
import { customAlphabet } from 'nanoid';

import { prisma } from '@documenso/prisma';
import { resetAllBizRethinkSingletons } from '@documenso/prisma/seed/bizrethink';
import { seedUser } from '@documenso/prisma/seed/users';

import { signSignaturePad } from '../fixtures/signature';

const nanoid = customAlphabet('1234567890abcdef', 10);

/**
 * E1 (subset) from COVERAGE-PLAN-2026-05-25.md — overlay 048 auto-claim
 * invites at signup.
 *
 * Tests: when a new user signs up with an email that matches a PENDING
 * OrganisationMemberInvite, they should be automatically added as a member
 * of the inviting org AND the invite should flip to ACCEPTED. The skip-
 * Personal-Org logic is also exercised (Personal Org is suppressed when
 * any invite was claimed).
 *
 * Domain-gate variant + requireInviteWhenDomainGated coverage are
 * separate tests (deferred — selectors for the signup-form blocked path
 * need verification first).
 */
test.describe('BizRethink overlay 048 — auto-claim invite on signup', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('signup with email matching a pending invite → invite ACCEPTED, user joined org, no Personal Org', async ({
    page,
  }) => {
    // Seed an inviting org (with an admin who issues the invite).
    const { user: inviter, organisation: invitingOrg } = await seedUser();

    // Create a pending invite for an as-yet-unregistered email.
    void inviter; // satisfy unused-var lint
    const inviteEmail = `${nanoid()}@invitee.test.documenso.com`;
    const invite = await prisma.organisationMemberInvite.create({
      data: {
        id: `inv_${nanoid()}`,
        email: inviteEmail.toLowerCase(),
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

    // Signup posts → onCreateUserHook fires → auto-claim runs.
    // User is created BEFORE email verification, and onCreateUserHook runs
    // in the same request, so by the time the response arrives we can read
    // the post-state.
    await page.waitForURL(/unverified-account|signup/, { timeout: 10_000 });

    // Allow a moment for the async onCreateUserHook .catch(err =>) path
    // to complete (it doesn't block the response).
    await page.waitForTimeout(1500);

    // Assert invite is ACCEPTED.
    const updatedInvite = await prisma.organisationMemberInvite.findUnique({
      where: { id: invite.id },
    });
    expect(updatedInvite!.status).toBe(OrganisationMemberInviteStatus.ACCEPTED);

    // Assert the new user exists.
    const newUser = await prisma.user.findFirst({
      where: { email: inviteEmail.toLowerCase() },
    });
    expect(newUser).not.toBeNull();

    // Assert the new user is now a member of the inviting org.
    const membership = await prisma.organisationMember.findFirst({
      where: {
        userId: newUser!.id,
        organisationId: invitingOrg.id,
      },
    });
    expect(membership).not.toBeNull();

    // Assert NO Personal Organisation was created for the new user (overlay
    // 048's "skip Personal Org when invite was claimed" branch).
    const personalOrgs = await prisma.organisation.count({
      where: {
        ownerUserId: newUser!.id,
        type: 'PERSONAL',
      },
    });
    expect(personalOrgs).toBe(0);
  });
});
