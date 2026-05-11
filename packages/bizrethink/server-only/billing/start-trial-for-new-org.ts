import { prisma } from '@documenso/prisma';

/**
 * Trial window length for newly-created external orgs. 14 days is industry
 * standard for B2B SaaS; long enough for prospects to evaluate Pro features,
 * short enough to avoid free-hosting cost creep. See ~/.claude/plans/pacta-
 * saas-billing.md for the original deferral reasoning.
 */
const TRIAL_DAYS = 14;

type StartTrialForNewOrgOptions = {
  organisationId: string;
  /**
   * If true, the org is a BizRethink-operated internal org (Personal, BizRethink
   * AI, MFG, MORG CAP, plus future team-member personal orgs). Skips trial
   * setup — internal orgs stay on the BIZRETHINK claim indefinitely.
   *
   * If false (default), creates a new BizrethinkOrganisationBilling row with
   * trialStartedAt=now() and trialEndsAt=now()+14d. Pair this with setting the
   * org's OrganisationClaim flags to the PRO tier at org-creation time so the
   * trial window actually grants Pro features. The trial-expire-sweep cron job
   * (Phase 2 of the SaaS plan) will downgrade the OrganisationClaim to FREE
   * when trialEndsAt < now() AND no active Stripe Subscription exists.
   */
  internal?: boolean;
};

/**
 * Idempotent setup of the BizRethink billing extension row for a newly-created
 * organisation. Call this AFTER `createOrganisation` succeeds — relies on the
 * organisation row existing because organisationId is a foreign-key-style
 * unique reference (no @relation per additive-fork convention; FK integrity
 * enforced at the app layer).
 *
 * Behaviour:
 *   - For external orgs (default): creates a row with trial dates set.
 *   - For internal orgs: creates a row with bizrethinkInternal=true and no
 *     trial dates (these orgs are not on a trial — they're on BIZRETHINK
 *     claim permanently).
 *   - If the row already exists (e.g., race condition or retry), the
 *     `upsert` keeps existing trial dates intact so we don't accidentally
 *     reset a trial mid-period.
 */
export async function startTrialForNewOrg({
  organisationId,
  internal = false,
}: StartTrialForNewOrgOptions): Promise<void> {
  const now = new Date();
  const trialEndsAt = internal ? null : new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.bizrethinkOrganisationBilling.upsert({
    where: { organisationId },
    create: {
      organisationId,
      bizrethinkInternal: internal,
      trialStartedAt: internal ? null : now,
      trialEndsAt,
    },
    update: {
      // Only update bizrethinkInternal if explicitly changing — preserves
      // trial dates on retry. The trial-expire-sweep cron is the only thing
      // that should clear trial dates.
      bizrethinkInternal: internal,
    },
  });
}
