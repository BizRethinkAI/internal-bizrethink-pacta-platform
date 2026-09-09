// Entry point for the @bizrethink/customizations package.
//
// THE MCA VERTICAL'S PUBLIC SURFACE, AND NOTHING ELSE'S.
//
// Until now this file exported `{}` and every consumer reached in by subpath —
// `@bizrethink/customizations/lease/clauses/...`, and so on. That works, and it
// left `mca/` in a state nobody noticed: eleven states, 22 test files, a
// provenance gate and a set of instance checks that NOTHING COULD IMPORT.
//
// That had a consequence past tidiness. The lease library at
// `/admin/lease-library` grew from 65 clauses to 81 with new jurisdiction
// sections, and the owner asked whether the MCA and lease libraries had been
// mixed together. They had not — but the only thing keeping them apart was that
// `mca/` was unreachable, and separation by unreachability is not separation by
// design. See docs/adr/0008-mca-is-two-surfaces-not-one.md.
//
// So the vertical gets a named export surface here, deliberately narrow. What
// is exported is what a caller outside the package may hold:
//
//   - the jurisdiction axis, and the FILTER that is the only sanctioned way to
//     reach a spec (README rule 5 — a caller that imports `CA_OFFER_SUMMARY`
//     directly is back in the position that shipped California's form carrying
//     New York's sentence);
//   - the read-only conformity view model behind `/admin/mca`;
//   - the open counsel readings.
//
// The individual specs are NOT re-exported here, on purpose.
//
// Nothing from `lease/` is exported from this file. The two verticals share
// `provenance/` and nothing else, and a root export that offered both under one
// namespace would be the first step back towards one list.

// READS THE FILESYSTEM, for the same reason and with the same rule as the
// conformity surface above. `mcaLibrarySurface` reaches `mca/clauses/documents`
// and `mca/clauses/examination`, both of which import `node:fs` — one to digest
// the vendored agreements, the other to read the review register. Import it
// ONLY from server code, through
// `apps/remix/app/utils/bizrethink-mca-library.server.ts`.
//
// The types beside it are erased at compile time and are safe to import
// anywhere, which is what lets the route render without pulling the module in.
export {
  type McaLibraryClauseView,
  type McaLibraryFindingView,
  type McaLibraryInstrumentView,
  mcaLibrarySurface,
  type SourceState,
} from './mca/clauses/surface/view';
export {
  JURISDICTION_NAMES,
  MCA_JURISDICTIONS,
  type McaJurisdiction,
} from './mca/jurisdictions';
export { OPEN_READINGS, type OpenReading } from './mca/readings';
export { disclosuresFor } from './mca/registry';
// READS THE FILESYSTEM *AND* THE DATABASE. `mcaLibraryPage` is
// `mcaLibrarySurface` plus the approval rows and the counsel links — the whole
// of what `/admin/mca-library` renders, in one read, so the clause list and the
// approval badges cannot disagree because one refetched and the other did not.
//
// Same rule as everything above it: server code only, through
// `apps/remix/app/utils/bizrethink-mca-library.server.ts`. The types beside it
// are erased at compile time and are safe to import anywhere.
export {
  type McaCounselFindingView,
  type McaLibraryApprovalView,
  type McaLibraryPageClause,
  type McaLibraryReviewView,
  mcaLibraryPage,
} from './mca/server-only/library-page';
// READS THE FILESYSTEM. `conformitySurface` and `envelopeShapes` reach
// `mca/provenance/source-text.ts`, which imports `node:fs`, `node:path` and
// `node:crypto` to re-earn every verification date against the vendored
// statutes. Import them ONLY from server code — a Remix route must go through
// a `.server.ts` module (see
// `apps/remix/app/utils/bizrethink-mca-conformity.server.ts`), because
// importing them into a route directly and using them only in the `loader`
// puts `node:fs` in the CLIENT bundle and fails the build. That is not
// hypothetical: it is how PR #118 first went red.
export {
  type Assurance,
  assertSingleLibrary,
  type ConformityEntry,
  type ConformityKind,
  type ConformitySummary,
  type ConformitySurface,
  conformitySurface,
  type DigestState,
  type EnvelopeShapeReport,
  envelopeShapes,
  MCA_LIBRARY,
  type Unreadable,
} from './mca/surface/view';
