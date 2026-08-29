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
  /** `BizrethinkOrganisationBilling.bizrethinkInternal` for the owning org. */
  organisationIsInternal: boolean;
};

/**
 * The second, independent lock: whether a clause may be rendered into a
 * document at all.
 *
 * Access to the feature is not sufficient. Clause text that has not been
 * through attorney review renders only for a BizRethink-internal organisation,
 * so an accidental access grant cannot put unreviewed legal language in front
 * of a third party. Retired clauses never render for anyone.
 */
export const canRenderClause = ({ status, organisationIsInternal }: CanRenderClauseOptions): boolean => {
  if (status === 'published') {
    return true;
  }

  if (status === 'retired') {
    return false;
  }

  return organisationIsInternal;
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

/** Convenience wrapper for the lease builder's own gate. */
export const canAccessLeaseBuilder = async (options: Omit<GetFeatureAccessOptions, 'feature'>): Promise<boolean> =>
  await getFeatureAccess({ ...options, feature: LEASE_BUILDER_FEATURE });
