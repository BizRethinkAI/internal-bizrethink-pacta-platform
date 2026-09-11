import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { isAdmin } from '@documenso/lib/utils/is-admin';

// Overlay 073 (2026-09-11): a shared admin gate for Remix route *loaders*.
//
// Why this exists: Documenso puts the admin authorization check only in the
// admin LAYOUT loader (`admin+/_layout.tsx`). Under React Router 7 single-fetch,
// a request for `/admin/<page>.data?_routes=routes/_authenticated+/admin+/<page>`
// runs that leaf loader ALONE and skips every ancestor loader — so the layout's
// check never runs. Every upstream admin leaf loader that reads tenant data
// therefore has to gate itself; this is the one place that gate lives.
//
// Returns 404 (not 403/redirect) so an anonymous or non-admin caller cannot use
// it to confirm a route exists. Matches the idiom the fork's own admin pages
// (`mca.tsx`, `mca-library.tsx`, `lease-library.tsx`) already use, factored out
// so a future upstream sync cannot silently reintroduce an unguarded loader
// without `require-admin-loader.test.ts` and the source-presence guard failing.
export const requireAdminLoader = async (request: Request) => {
  const { user } = await getOptionalSession(request);

  if (!user || !isAdmin(user)) {
    throw new Response('Not Found', { status: 404 });
  }

  return user;
};
