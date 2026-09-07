import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEFAULT_LEASE_JURISDICTION, jurisdictionForProperty } from '../clauses/approval-jurisdiction';

/**
 * The library a lease is assembled from must be the library for the state the
 * property is in — on EVERY path, not just the one that renders the PDF.
 *
 * `libraryFor()` landed on 2026-09-06 and was wired into `buildLeaseDocuments`
 * and the two counsel-review surfaces. Four other call sites kept reaching for
 * `FL_LIBRARY` — the whole library, whatever the lease is for — and while
 * Florida was the only state with clauses of its own, `FL_LIBRARY` and
 * `libraryFor('US-FL')` were the same 64 objects, so nothing could be wrong.
 *
 * The moment a second state has clauses those four sites are silently wrong,
 * and each is wrong in a different direction:
 *
 *   `matter.validate`                 validates a North Carolina lease against
 *                                     Florida's clause set, so it reports
 *                                     unanswered Florida variables and misses
 *                                     the North Carolina ones.
 *   `createEnvelopeFromMatter`        runs the attorney-review gate over
 *                                     Florida clauses, then renders North
 *                                     Carolina ones. The gate and the document
 *                                     stop describing the same lease.
 *   `leases.$id.tsx`                  tells the landlord which clause each
 *                                     answer lands in, computed from a state
 *                                     the lease is not for.
 *   `clauseLibrary.approve`           looks a clause up to record sign-off
 *                                     against it.
 *
 * NOTHING WOULD HAVE BEEN RED. That is the reason these are guards on the
 * source rather than a behavioural test: the failure is a name, and by the time
 * behaviour diverges the wrong document has already been produced.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const router = read('../../server-only/trpc/lease-builder-router.ts');
const envelope = read('../server-only/create-envelope-from-matter.ts');
const renderLease = read('../render/render-lease.ts');
const matterAnswers = read('../server-only/matter-answers.ts');
const leasePage = read('../../../../apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.$id.tsx');

/** One procedure's source, to the next procedure definition. */
const proc = (source: string, name: string) => {
  const start = source.indexOf(`${name}: `);

  if (start === -1) {
    return '';
  }

  const rest = source.slice(start + name.length);
  const next = rest.search(/\n {4}\w+: (?:authenticatedProcedure|procedure)/);

  return name + (next === -1 ? rest : rest.slice(0, next));
};

describe('every path that assembles a lease scopes the library to its jurisdiction', () => {
  it('validates against the clauses that state actually has', () => {
    const validate = proc(router, 'validate');

    expect(validate).not.toBe('');
    expect(validate).toMatch(/libraryFor\(/);
    expect(validate).not.toMatch(/FL_LIBRARY/);
  });

  /*
    The one that matters most. This is the gate between an unreviewed clause and
    a third party, and it selects the clauses it checks. Checking Florida's set
    and rendering North Carolina's would let an unapproved North Carolina clause
    through a gate that never looked at it.
  */
  it('gates the send on the clauses the send will actually render', () => {
    expect(envelope).toMatch(/libraryFor\(/);
    expect(envelope).not.toMatch(/FL_LIBRARY/);
  });

  it('shows the landlord clause numbers from their own state', () => {
    expect(leasePage).toMatch(/libraryFor\(/);
    expect(leasePage).not.toMatch(/FL_LIBRARY/);
  });

  /*
    The opposite direction, and deliberately so. Staff record an approval
    against a clause of ANY jurisdiction — `admissionBlocks` is what decides
    whether this attorney may approve this one. Scoping the lookup would make a
    North Carolina clause unapprovable. It should say ALL_CLAUSES, because that
    is what it means.
  */
  it('looks an approval up across the whole library, by name', () => {
    const approve = proc(router, 'approve');

    expect(approve).toMatch(/ALL_CLAUSES/);
    expect(approve).not.toMatch(/FL_LIBRARY/);
  });

  it('leaves no path in the lease packages naming Florida to build a lease', () => {
    for (const [name, source] of [
      ['lease-builder-router.ts', router],
      ['create-envelope-from-matter.ts', envelope],
      ['render-lease.ts', renderLease],
      ['leases.$id.tsx', leasePage],
    ] as const) {
      expect(source, name).not.toMatch(/FL_LIBRARY/);
    }
  });
});

/**
 * Whose law a lease is drafted to, decided in ONE place.
 *
 * The rule — normalise the property's state, fall back to Florida — was written
 * out by hand in three files: `renderInputForMatter`, the lease page's
 * `interviewFor` call, and (missing entirely) the validate path. Three copies of
 * a fallback is how one of them ends up defaulting differently, and the symptom
 * would be a lease whose questions came from one state and whose clauses came
 * from another.
 */
describe('the jurisdiction of a lease is derived in one place', () => {
  it('reads a two-letter state as that state', () => {
    expect(jurisdictionForProperty('NC')).toBe('US-NC');
    expect(jurisdictionForProperty('FL')).toBe('US-FL');
    expect(jurisdictionForProperty('nc')).toBe('US-NC');
  });

  /*
    A property with no state recorded, and — this is the part worth seeing —
    a property in a state the library holds no clauses for. Both get Florida.
    That is FAIL-OPEN and it is not what anyone would choose; it is recorded
    here so the next person reads it as a known default rather than discovering
    it from a Georgia lease carrying a Florida radon disclosure.
  */
  it('falls back to Florida for an unrecorded or unsupported state', () => {
    expect(jurisdictionForProperty(null)).toBe(DEFAULT_LEASE_JURISDICTION);
    expect(jurisdictionForProperty(undefined)).toBe(DEFAULT_LEASE_JURISDICTION);
    expect(jurisdictionForProperty('GA')).toBe(DEFAULT_LEASE_JURISDICTION);
    expect(DEFAULT_LEASE_JURISDICTION).toBe('US-FL');
  });

  it('is what every caller uses, so the three copies cannot drift apart', () => {
    for (const [name, source] of [
      ['matter-answers.ts', matterAnswers],
      ['lease-builder-router.ts', router],
      ['leases.$id.tsx', leasePage],
    ] as const) {
      expect(source, name).toMatch(/jurisdictionForProperty\(/);
      expect(source, name).not.toMatch(/normaliseJurisdiction\([^)]*(?:propertyState|state)/);
    }
  });
});
