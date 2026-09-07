/**
 * Which team URLs may show the Leases nav entry.
 *
 * The lease builder is gated per ORGANISATION, but the thing the nav renders
 * is a per-TEAM link — `/t/:teamUrl/leases`. The server answers the question it
 * can answer on its own ("which of your organisations hold the feature"); this
 * turns that into the answer the nav needs, using the organisation/team tree
 * the session already carries. No second round trip, and nothing about the
 * flag is decided here.
 *
 * Split out of the hook so the mapping — the part that can be wrong — is
 * testable without a renderer.
 */

export type LeaseBuilderNavOrganisation = {
  id: string;
  teams: { url: string }[];
};

export type LeaseBuilderTeamUrlsOptions = {
  /** The organisations and teams from the session. */
  organisations: LeaseBuilderNavOrganisation[];
  /**
   * Organisation ids the server says hold the lease builder. `undefined` while
   * the query is in flight — which reads as "no", not as "not yet decided".
   * An entry that appears and then disappears is worse than one that appears a
   * moment late, and the route 404s either way.
   */
  organisationIds: string[] | undefined;
};

export const leaseBuilderTeamUrls = ({ organisations, organisationIds }: LeaseBuilderTeamUrlsOptions): string[] => {
  if (!organisationIds || organisationIds.length === 0) {
    return [];
  }

  const granted = new Set(organisationIds);

  return organisations
    .filter((organisation) => granted.has(organisation.id))
    .flatMap((organisation) => organisation.teams.map((team) => team.url));
};
