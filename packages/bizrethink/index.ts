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

export {
  JURISDICTION_NAMES,
  MCA_JURISDICTIONS,
  type McaJurisdiction,
} from './mca/jurisdictions';
export { OPEN_READINGS, type OpenReading } from './mca/readings';
export { disclosuresFor } from './mca/registry';
export {
  type Assurance,
  assertSingleLibrary,
  type ConformityEntry,
  type ConformitySurface,
  conformitySurface,
  type DigestState,
  type EnvelopeShapeReport,
  envelopeShapes,
  MCA_LIBRARY,
  type Unreadable,
} from './mca/surface/view';
