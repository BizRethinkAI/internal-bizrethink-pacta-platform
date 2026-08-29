import { prisma } from '@documenso/prisma';

/**
 * Per-organisation and per-user feature gating, DB-backed.
 *
 * Deliberately not an env var: instance configuration in this codebase lives
 * in the database and is administered through /admin, so a gate that shipped
 * as `BIZRETHINK_ENABLE_*` would be the one piece of config an admin could not
 * see or change without a redeploy.
 *
 * Used by the lease builder, which stays internal until per-state attorney
 * review lands. The model is feature-generic so the next gated feature does
 * not need its own table.
 */

export const LEASE_BUILDER_FEATURE = 'lease-builder';

/**
 * Lock 2's own key. Permission to render clause text that has NOT been through
 * attorney review.
 *
 * Separate from `LEASE_BUILDER_FEATURE` on purpose — the two locks answer
 * different questions ("may you open this?" versus "may unreviewed legal text
 * reach paper?") and must be able to diverge.
 *
 * Named for what it permits rather than for who holds it. Lock 2 previously
 * read `BizrethinkOrganisationBilling.bizrethinkInternal`, a column created for
 * BILLING: its migration stamps the 8 organisations predating the SaaS layer so
 * the trial-expire cron skips them and the banner reads "BizRethink Internal".
 * It said nothing about legal review, and by 2026-08-29 it had drifted onto
 * 7 organisations, four of them auto-created personal ones — each silently
 * holding permission to render unreviewed legal language.
 */
export const LEASE_CLAUSE_DRAFT_FEATURE = 'lease-clause-draft-rendering';

export type FeatureGrant = {
  enabled: boolean;
};

export type ResolveFeatureAccessOptions = {
  /** Grant recorded against this specific user, if any. */
  userGrant: FeatureGrant | null;
  /** Grant recorded against the user's organisation, if any. */
  orgGrant: FeatureGrant | null;
};

/**
 * Deny by default. A user-level row always wins over the organisation's — in
 * both directions, so a single person can be granted access ahead of their org
 * or revoked without disabling everyone else.
 */
export const resolveFeatureAccess = ({ userGrant, orgGrant }: ResolveFeatureAccessOptions): boolean => {
  if (userGrant) {
    return userGrant.enabled;
  }

  if (orgGrant) {
    return orgGrant.enabled;
  }

  return false;
};

export type ClauseStatus = 'draft' | 'review' | 'published' | 'retired';

export type CanRenderClauseOptions = {
  status: ClauseStatus;
  /**
   * Whether this organisation may render clause text that has not been through
   * attorney review. Comes from the `lease-clause-draft-rendering` grant, NOT
   * from a billing flag.
   */
  draftRenderingAllowed: boolean;
};

/**
 * The second, independent lock: whether a clause may be rendered into a
 * document at all.
 *
 * Access to the feature is not sufficient. Clause text that has not been
 * through attorney review renders only where draft rendering is explicitly
 * granted, so an accidental access grant cannot put unreviewed legal language
 * in front of a third party. Retired clauses never render for anyone.
 *
 * This lock's whole job is to survive a mistake in lock 1, which is why it has
 * its own grant rather than borrowing a flag set for another reason.
 */
export const canRenderClause = ({ status, draftRenderingAllowed }: CanRenderClauseOptions): boolean => {
  if (status === 'published') {
    return true;
  }

  if (status === 'retired') {
    return false;
  }

  return draftRenderingAllowed;
};

export type GetFeatureAccessOptions = {
  feature: string;
  organisationId: string;
  userId: number;
};

/**
 * Look up both grants and resolve them. Returns false when neither exists.
 */
export const getFeatureAccess = async ({
  feature,
  organisationId,
  userId,
}: GetFeatureAccessOptions): Promise<boolean> => {
  const [userRow, orgRow] = await Promise.all([
    prisma.bizrethinkFeatureAccess.findUnique({
      where: { feature_scope_scopeId: { feature, scope: 'user', scopeId: String(userId) } },
      select: { enabled: true },
    }),
    prisma.bizrethinkFeatureAccess.findUnique({
      where: { feature_scope_scopeId: { feature, scope: 'organisation', scopeId: organisationId } },
      select: { enabled: true },
    }),
  ]);

  return resolveFeatureAccess({ userGrant: userRow, orgGrant: orgRow });
};

/** Convenience wrapper for the lease builder's own gate (lock 1). */
export const canAccessLeaseBuilder = async (options: Omit<GetFeatureAccessOptions, 'feature'>): Promise<boolean> =>
  await getFeatureAccess({ ...options, feature: LEASE_BUILDER_FEATURE });

/** Convenience wrapper for lock 2 — may unreviewed clause text be rendered? */
export const canRenderDraftClauses = async (options: Omit<GetFeatureAccessOptions, 'feature'>): Promise<boolean> =>
  await getFeatureAccess({ ...options, feature: LEASE_CLAUSE_DRAFT_FEATURE });
