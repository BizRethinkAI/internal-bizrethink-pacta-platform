import { leaseBuilderTeamUrls } from '@bizrethink/customizations/lease/nav';
import { useSession } from '@documenso/lib/client-only/providers/session';
import { trpc } from '@documenso/trpc/react';
import { useMemo } from 'react';

/**
 * The team URLs whose Leases nav entry should be shown.
 *
 * `canAccessLeaseBuilder` is server-only and the nav renders in the browser,
 * so the gate has to cross that boundary somehow. It crosses as a read of the
 * gate itself — `bizrethink.leaseBuilder.access` calls the same function every
 * lease route's loader calls — rather than as a copy of the rule. The nav and
 * the route it points at cannot disagree, because there is one answer and the
 * nav is asking for it.
 *
 * The alternatives, and why not:
 *
 *   - Put the flag on the organisation session. It is the shape that fits, but
 *     `getOrganisationSession` re-runs on every navigation and on window focus,
 *     so it would add two grant lookups per organisation per navigation to the
 *     hottest query in the app, to render one link. It also means patching
 *     upstream's session query AND its zod response schema — four upstream
 *     files instead of two.
 *   - Thread it through a route loader. The nav is rendered by
 *     `_authenticated+/_layout.tsx`, which sets `shouldRevalidate = () => false`
 *     — its loader does not re-run when you switch teams, so a boolean threaded
 *     through it would describe whichever team you first landed on.
 *   - Re-derive the flag client-side from something already in the session (a
 *     claim flag, the billing row). That is the second source of truth this is
 *     written to avoid.
 *
 * Cost is one cached query per session. Consequence is that the entry appears
 * on hydration rather than in the server-rendered HTML, which is why the
 * pending state denies: appearing a moment late is better than appearing and
 * then vanishing.
 */
export const useLeaseBuilderTeamUrls = (): string[] => {
  const { organisations } = useSession();

  const { data } = trpc.bizrethink.leaseBuilder.access.useQuery(undefined, {
    // The grant changes when an admin flips it, which is not something that
    // needs to be noticed within a page view.
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(
    () => leaseBuilderTeamUrls({ organisations, organisationIds: data?.organisationIds }),
    [organisations, data],
  );
};
