import { expect, test } from '@playwright/test';

import { prisma } from '@documenso/prisma';
import { resetAllBizRethinkSingletons } from '@documenso/prisma/seed/bizrethink';
import { seedUser } from '@documenso/prisma/seed/users';

/**
 * E3 from COVERAGE-PLAN-2026-05-25.md — org creation runs overlay 041
 * trial bookkeeping for new external orgs.
 *
 * Asserts the BizrethinkOrganisationBilling row is written with:
 *   - bizrethinkInternal = false (external org)
 *   - trialStartedAt = now (within tolerance)
 *   - trialEndsAt = now + 14 days
 *
 * The OrganisationClaim "PRO" identifier isn't a single column — it's
 * represented by the flags/limits shape, so we don't assert on it here;
 * V4 unit test (start-trial-for-new-org) covers the helper logic + V14
 * covers the routing path.
 */
test.describe('BizRethink org creation — 14-day trial bookkeeping', () => {
  test.beforeEach(async () => {
    await resetAllBizRethinkSingletons();
  });

  test('seedUser creates a Personal Org that gets a BizRethink trial row', async () => {
    const before = Date.now();
    const { organisation } = await seedUser();
    const after = Date.now();

    const billing = await prisma.bizrethinkOrganisationBilling.findUnique({
      where: { organisationId: organisation.id },
    });

    expect(billing).not.toBeNull();
    expect(billing!.bizrethinkInternal).toBe(false);
    expect(billing!.trialStartedAt).not.toBeNull();
    expect(billing!.trialEndsAt).not.toBeNull();

    // trialStartedAt should be within the window [before, after].
    const startMs = billing!.trialStartedAt!.getTime();
    expect(startMs).toBeGreaterThanOrEqual(before - 1000);
    expect(startMs).toBeLessThanOrEqual(after + 1000);

    // trialEndsAt should be ~14 days after trialStartedAt.
    const endMs = billing!.trialEndsAt!.getTime();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    expect(Math.abs(endMs - startMs - fourteenDaysMs)).toBeLessThan(60 * 1000);
  });
});
