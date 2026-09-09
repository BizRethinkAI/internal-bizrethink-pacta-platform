import { mcaLibraryPage } from '@bizrethink/customizations';

/**
 * The server-only half of `/admin/mca-library`.
 *
 * SAME MECHANISM, SAME REASON as `bizrethink-mca-conformity.server.ts`, and the
 * reason is worth repeating rather than cross-referencing: `mcaLibraryPage`
 * reaches `node:fs` — `mca/clauses/examination.ts` reads the vendored review
 * register and `mca/clauses/documents.ts` digests the vendored agreements — so
 * importing it into the route module puts `node:fs` in the CLIENT bundle and
 * fails the build.
 *
 * Using it only inside `loader` is not enough. That was tried on `/admin/mca`
 * and PR #118 went red on it: relying on the bundler's dead-code elimination is
 * relying on an optimisation for correctness. The `.server.ts` suffix is the
 * mechanism that actually guarantees it — the React Router Vite plugin replaces
 * such a module with a stub in the client build.
 *
 * IT NOW READS THE DATABASE TOO — the approval rows and the counsel links —
 * which is a second reason for this file rather than a weakening of the first.
 * `prisma` in a route module is no more welcome in the browser bundle than
 * `node:fs` is.
 *
 * Nothing else belongs here. The route imports its TYPES directly from
 * `@bizrethink/customizations`, which are erased at compile time.
 */
export const buildMcaLibraryView = async () => await mcaLibraryPage();
