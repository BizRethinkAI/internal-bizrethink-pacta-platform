import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UNRESOLVED_READINGS } from '../instance/identities';
import { MCA_JURISDICTIONS } from '../jurisdictions';
import { normalisedDigest, readSourceText, resolveSourcesDir } from '../provenance/source-text';
import { publishableProblems } from '../provenance/verify';
import { OPEN_READINGS, PRESCRIBED_READINGS } from '../readings';
import { MCA_DISCLOSURES, PRESCRIBED_FORMS } from '../registry';
import { assertSingleLibrary, conformitySurface, entryFor, envelopeShapes, MCA_LIBRARY } from '../surface/view';
import { syntheticForm } from './synthetic-form';

/*
  THE READ-ONLY CONFORMITY SURFACE.

  Every assertion in this file exists because the page it backs has one
  characteristic failure mode: looking reassuring. A state with a green
  verification date and four rows whose contents no check can read is not
  verified, and a surface that renders it with a tick is worse than no surface —
  it converts an honest gap into a claim.

  So the tests below are mostly about what the view model REFUSES to say.
*/

const surface = conformitySurface();

const entry = (slug: string) => {
  const found = surface.entries.find((e) => e.slug === slug);

  if (!found) {
    throw new Error(`${slug} is not on the conformity surface`);
  }

  return found;
};

describe('the surface reaches every state, and only through the jurisdiction filter', () => {
  it('carries one entry per encoded disclosure', () => {
    expect(surface.entries.map((e) => e.slug).sort()).toEqual(MCA_DISCLOSURES.map((d) => d.slug).sort());
  });

  it('groups by the eleven jurisdictions and invents none', () => {
    expect(surface.jurisdictions).toEqual([...MCA_JURISDICTIONS]);
    expect([...new Set(surface.entries.map((e) => e.jurisdiction))].sort()).toEqual([...MCA_JURISDICTIONS].sort());
  });

  it('never lets one state’s entry sit under another state’s heading', () => {
    for (const j of surface.jurisdictions) {
      for (const e of surface.entries.filter((x) => x.jurisdiction === j)) {
        expect(e.jurisdiction).toBe(j);
      }
    }
  });
});

/*
  THE SEPARATION THE OWNER HAD TO ASK ABOUT.

  `/admin/lease-library` grew from 65 clauses to 81 with new jurisdiction
  sections, and the question "have the MCA and lease libraries been mixed
  together?" was reasonable — the only thing keeping them apart was that nothing
  could import `mca/`. Once this page exists, unreachability stops being the
  separation, so the separation has to be asserted.

  It is not hypothetical overlap either: `US-FL` is a jurisdiction in BOTH
  libraries, so a list keyed on jurisdiction alone would merge Florida's lease
  clauses into Florida's disclosure statute without any type error at all.
*/
describe('a clause library and a disclosure library cannot share one list', () => {
  it('tags every entry with the library it came from', () => {
    expect(surface.library).toBe(MCA_LIBRARY);

    for (const e of surface.entries) {
      expect(e.library).toBe(MCA_LIBRARY);
    }
  });

  it('refuses a list carrying an entry from another library', () => {
    const foreign = { library: 'lease-clauses', slug: 'fl-security-deposit-interest' };

    expect(() => assertSingleLibrary([...surface.entries, foreign], MCA_LIBRARY)).toThrow(/lease-clauses/);
    expect(() => assertSingleLibrary([...surface.entries, foreign], MCA_LIBRARY)).toThrow(
      /fl-security-deposit-interest/,
    );
  });

  it('accepts the surface it actually builds', () => {
    expect(() => assertSingleLibrary(surface.entries, MCA_LIBRARY)).not.toThrow();
  });

  /*
    NO APPROVAL WORKFLOW, ASSERTED IN THE DATA AND NOT ONLY IN THE MARKUP.

    ADR 0008: approving 10 CCR §914 would record an attorney's name against
    California's words. The lease library's clause row carries `approval`,
    `approvedForJurisdiction` and a fingerprint the approval is pinned to. If
    any of that shape is ever copied in here — by reusing a component, or by a
    well-meant "make the two pages consistent" — this fails before the button
    does.
  */
  it('carries no field an approval could be recorded in', () => {
    for (const e of surface.entries) {
      expect(Object.keys(e).filter((k) => /approv|signoff|sign_off|reviewer|barnumber/i.test(k))).toEqual([]);
    }
  });
});

describe('displaying a spec does not publish it', () => {
  /*
    A snapshot taken inside a test is worthless here: the surface is built at
    module scope, so anything it wrote would already be in the "before". The
    specs are frozen instead, which makes the write itself throw — and this
    asserts the freeze rather than its consequences.
  */
  it('will not let anything write a status back onto a spec', () => {
    for (const spec of MCA_DISCLOSURES) {
      expect(() => {
        (spec as { status: string }).status = 'draft';
      }).toThrow(TypeError);
    }
  });

  it('will not let anything stamp a verification date onto a spec', () => {
    for (const spec of MCA_DISCLOSURES) {
      expect(() => {
        (spec.source as { verbatimVerifiedAt: string | null }).verbatimVerifiedAt = '2099-01-01';
      }).toThrow(TypeError);
    }
  });

  it('will not let anything edit a prescribed sentence', () => {
    for (const form of PRESCRIBED_FORMS) {
      expect(() => {
        (form.rows[0] as { verbatim: string | null }).verbatim = 'something we made up';
      }).toThrow(TypeError);
    }
  });

  it('does not move the publish gate', () => {
    const before = publishableProblems(MCA_DISCLOSURES);

    conformitySurface();

    expect(publishableProblems(MCA_DISCLOSURES)).toEqual(before);
    expect(MCA_DISCLOSURES.map((d) => d.status)).toEqual(MCA_DISCLOSURES.map(() => 'published'));
  });

  /*
    The gate's verdict is REPORTED, never recomputed into a friendlier answer.
    A synthetic form with a null structure date is unpublishable; the surface
    must say so rather than rendering it beside the eleven as though it were
    one of them.
  */
  it('reports an unpublishable spec as unverified rather than displaying it clean', () => {
    const unpublishable = syntheticForm({
      slug: 'synthetic-unpublishable',
      citation: '10 CCR §914',
      sourceFile: 'CA-10CCR-900-956.txt',
      status: 'published',
      rows: [{ label: 'Funding Provided', verbatim: null, onlyPrescribedContent: true }],
    });

    const built = entryFor(unpublishable);

    expect(built.publishGate.length).toBeGreaterThan(0);
    expect(built.assurance).toBe('unverified');
  });
});

/*
  THE HONEST FAILURE MODE IS A TICK.

  Three assurance levels, and the test proves all three are REACHABLE — a
  classification with an unreachable value is a classification that never
  discriminates.
*/
describe('assurance distinguishes verified from partly verified', () => {
  const caSource = readSourceText('CA-10CCR-900-956.txt');

  const fullyVerified = syntheticForm({
    slug: 'synthetic-fully-verified',
    citation: '10 CCR §914',
    sourceFile: 'CA-10CCR-900-956.txt',
    status: 'published',
    sourceDigest: normalisedDigest(caSource),
    section: {
      from: '§ 914. Sales-Based Financing Disclosure Formatting and Contents.',
      to: '§ 915. Lease Financing Disclosure Formatting and Contents.',
    },
    structureEvidence: 'source-order',
    source: {
      kind: 'regulator-prescribed-form',
      citation: '10 CCR §914',
      sourceFile: 'CA-10CCR-900-956.txt',
      verbatimVerifiedAt: '2026-09-07',
      structureVerifiedAt: '2026-09-07',
    },
    rows: [
      {
        label: 'Funding Provided',
        verbatim: 'This is how much funding [name of financer] will provide.',
        onlyPrescribedContent: true,
      },
    ],
  });

  it('a form with nothing unread is verified', () => {
    const built = entryFor(fullyVerified);

    expect(built.problems).toEqual([]);
    expect(built.digest).toBe('matches');
    expect(built.assurance).toBe('verified');
  });

  it('the same form, plus one row whose contents no check can read, is only partly verified', () => {
    const built = entryFor({
      ...fullyVerified,
      rows: [...fullyVerified.rows, { label: 'Prepayment', verbatim: null, onlyPrescribedContent: false }],
    });

    expect(built.problems).toEqual([]);
    expect(built.unreadable).toHaveLength(1);
    expect(built.assurance).toBe('partly-verified');
    expect(built.assuranceReasons.join(' ')).toMatch(/label/i);
  });

  it('a stale digest is unverified, whatever the dates say', () => {
    const built = entryFor({ ...fullyVerified, sourceDigest: 'a'.repeat(64) });

    expect(built.digest).toBe('stale');
    expect(built.assurance).toBe('unverified');
  });

  it('a source that is not vendored at all is unverified', () => {
    const built = entryFor({ ...fullyVerified, sourceFile: 'CA-10CCR-900-956.does-not-exist.txt' });

    expect(built.digest).toBe('source-missing');
    expect(built.assurance).toBe('unverified');
  });

  /*
    THE ONE THE PUBLISH GATE CANNOT SEE.

    `assertPublishable` returns nothing for a spec whose status is `draft`, and
    `verifyProvenance` skips the verbatim and structure checks when the
    corresponding date is null — correctly, since there is no claim to
    re-execute. So a draft with two null dates and an intact digest passes
    every existing check in the package while having been verified against
    nothing at all, and the surface has to say so on its own account.
  */
  it('a draft that has never been checked is unverified, though nothing else complains', () => {
    const never = syntheticForm({
      ...fullyVerified,
      slug: 'synthetic-never-checked',
      status: 'draft',
      source: {
        kind: 'regulator-prescribed-form',
        citation: '10 CCR §914',
        sourceFile: 'CA-10CCR-900-956.txt',
        verbatimVerifiedAt: null,
        structureVerifiedAt: null,
      },
    });

    const built = entryFor(never);

    expect(built.problems).toEqual([]);
    expect(built.publishGate).toEqual([]);
    expect(built.digest).toBe('matches');
    expect(built.assurance).toBe('unverified');
    expect(built.assuranceReasons).toEqual([
      'the words have never been checked against the source',
      'the rows, their labels and their order have never been checked',
    ]);
  });
});

/*
  THE REAL ELEVEN, STATED AS NUMBERS.

  ADR 0008 names five of New York's eleven rows and four of California's ten as
  rows where the regulation prescribes "a short explanation" and supplies none.
  Pinned here so the page cannot quietly start reporting a smaller number, and
  so a new unreadable row has to be noticed.
*/
describe('what the checker can only read the label of', () => {
  it('New York: five rows of eleven', () => {
    const ny = entry('ny-offer-summary');

    expect(ny.rowsTotal).toBe(11);
    expect(ny.unreadable).toHaveLength(5);
  });

  it('California: four rows of ten', () => {
    const ca = entry('ca-offer-summary');

    expect(ca.rowsTotal).toBe(10);
    expect(ca.unreadable).toHaveLength(4);
  });

  it('no state on this surface is fully verified', () => {
    expect(surface.entries.filter((e) => e.assurance === 'verified').map((e) => e.slug)).toEqual([]);
  });

  it('every state carries a reason for the level it was given', () => {
    for (const e of surface.entries) {
      expect(e.assuranceReasons.length).toBeGreaterThan(0);
    }
  });

  /*
    Every date on the surface is still being re-earned. If this goes red a
    regulator has amended something, or a source was re-vendored without a
    human re-reading it — which is the single event this package exists to
    catch.
  */
  it('every recorded digest still matches the vendored source', () => {
    expect(surface.entries.filter((e) => e.digest !== 'matches').map((e) => e.slug)).toEqual([]);
  });
});

/*
  THE VENDORED SOURCES ARE NOT IN THE PRODUCTION IMAGE.

  `docker/Dockerfile`'s runner stage copies `apps/remix/build`,
  `apps/remix/public`, `packages/tailwind-config` and the Prisma schema.
  `packages/bizrethink/mca/sources/` is not among them, so in the container
  these regulations do not exist at any path — and this module is now reachable
  from the Remix server bundle, where `__dirname` is undeclared rather than
  merely absent.

  Neither may crash. What they must do is make the surface say, for every
  state, that nothing here can be re-earned — which is the truth in that
  environment and is exactly what this package says a date without evidence is
  worth.
*/
describe('with no vendored sources, the surface degrades to unverified rather than throwing', () => {
  it('finds the real directory when it is there', () => {
    expect(resolveSourcesDir([join(__dirname, '..', 'sources')])).not.toBeNull();
  });

  it('returns null rather than throwing when every candidate is absent', () => {
    expect(resolveSourcesDir([join(__dirname, 'no-such-directory')])).toBeNull();
    expect(resolveSourcesDir([])).toBeNull();
  });

  it('reports a spec whose source cannot be read as source-missing and unverified', () => {
    const built = entryFor(
      syntheticForm({
        slug: 'synthetic-source-absent',
        citation: '10 CCR §914',
        sourceFile: 'a-file-no-production-image-contains.txt',
        status: 'published',
        source: {
          kind: 'regulator-prescribed-form',
          citation: '10 CCR §914',
          sourceFile: 'a-file-no-production-image-contains.txt',
          verbatimVerifiedAt: '2026-09-06',
          structureVerifiedAt: '2026-09-06',
        },
        rows: [{ label: 'Funding Provided', verbatim: null, onlyPrescribedContent: true }],
      }),
    );

    expect(built.digest).toBe('source-missing');
    expect(built.observedDigest).toBeNull();
    expect(built.assurance).toBe('unverified');
    expect(built.problems.map((p) => p.kind)).toContain('source');
  });
});

/*
  WHAT A RUN COULD NOT HAVE SEEN, BY ENVELOPE SHAPE.

  `instanceCoverage()` answers this for one filled envelope. The page has no
  filled envelope, so it reports the same thing for the four shapes an envelope
  can take — which is honest, because `skipped` turns on which DOCUMENTS are
  present and on nothing else.
*/
describe('the envelope shapes say which blockers each one cannot detect', () => {
  const shapes = envelopeShapes();
  const shape = (id: string) => {
    const found = shapes.find((s) => s.id === id);

    if (!found) {
      throw new Error(`${id} is not an envelope shape`);
    }

    return found;
  };

  it('an offer summary on its own cannot detect either of the two cancelling blockers', () => {
    expect(shape('offer-summary-only').undetectable).toEqual([
      'ca-finance-charge-omits-withheld-fees',
      'ca-funding-provided-is-gross-purchase-price',
    ]);
  });

  /*
    Named, not counted. A count moves for two different reasons — an identity
    was added, or an identity stopped being skipped when it should be — and the
    page's whole claim is WHICH checks did not run.
  */
  it('names exactly which identities each shape cannot decide', () => {
    expect(
      shape('offer-summary-only')
        .skipped.map((s) => s.identity)
        .sort(),
    ).toEqual([
      'amount-financed',
      'finance-charge',
      'finance-charge-floor',
      'itemization-agreement',
      'itemization-internal',
      'recipient-funds',
    ]);

    expect(
      shape('with-itemization')
        .skipped.map((s) => s.identity)
        .sort(),
    ).toEqual(['amount-financed', 'finance-charge']);

    expect(
      shape('with-agreement')
        .skipped.map((s) => s.identity)
        .sort(),
    ).toEqual(['itemization-agreement', 'itemization-internal', 'recipient-funds']);
  });

  it('says why each identity could not be decided', () => {
    for (const s of shapes) {
      for (const skipped of s.skipped) {
        expect(skipped.reason.length).toBeGreaterThan(0);
        expect(skipped.statement.length).toBeGreaterThan(0);
      }
    }
  });

  it('the agreement is what makes them detectable', () => {
    expect(shape('with-agreement').undetectable).toEqual([]);
  });

  it('a one-document envelope skips more identities than a complete one', () => {
    expect(shape('offer-summary-only').skipped.length).toBeGreaterThan(shape('complete').skipped.length);
    expect(shape('complete').skipped).toEqual([]);
  });

  it('every shape says how many identities it can decide out of how many exist', () => {
    for (const s of shapes) {
      expect(s.total).toBeGreaterThan(0);
      expect(s.evaluable + s.skipped.length).toBe(s.total);
    }
  });
});

/*
  READINGS, NOT APPROVALS.

  Eight open questions. None of them is a thing anyone approves — each is a
  place where a check runs on an assumption, and two of the five instance
  readings change verdicts. Counted so the backlog cannot grow silently, and
  each one tied to the file that pins it so a reading cannot become decorative.
*/
describe('the open counsel questions are carried as readings', () => {
  it('is exactly the three from the prescribed-form review plus the five instance readings', () => {
    expect(PRESCRIBED_READINGS.map((r) => r.id)).toEqual([
      'ca-short-explanation-asymmetry',
      'prose-described-row-order',
      'ks-prescribed-label-tolerance',
    ]);

    expect(OPEN_READINGS).toHaveLength(3 + UNRESOLVED_READINGS.length);
    expect(UNRESOLVED_READINGS).toHaveLength(5);
  });

  /*
    ADR 0009 singles these two out: "the term unit and the direction of the
    (a)(3) relative test each change verdicts". The rest widen a gap; these two
    turn a pass into a finding or the reverse, which is a different kind of
    debt and has to be visible as one.
  */
  it('marks the two readings that change a verdict rather than widening a gap', () => {
    expect(OPEN_READINGS.filter((r) => r.changesVerdicts).map((r) => r.id)).toEqual([
      'term-unit',
      'relative-tolerance-direction',
    ]);
  });

  it('carries every UNRESOLVED_READINGS id, so one added there cannot go unlisted', () => {
    const ids = OPEN_READINGS.map((r) => r.id);

    for (const r of UNRESOLVED_READINGS) {
      expect(ids).toContain(r.id);
    }
  });

  it('has no field an approval could be recorded in', () => {
    for (const r of OPEN_READINGS) {
      expect(Object.keys(r).filter((k) => /approv|author|barnumber/i.test(k))).toEqual([]);
    }
  });

  /*
    A reading whose pin has been deleted or renamed is a question nobody is
    holding open any more. Checked against the file, not asserted in prose.
  */
  it('every reading names a file that still pins it', () => {
    for (const r of OPEN_READINGS) {
      const text = readFileSync(join(__dirname, '..', r.pinnedBy.file), 'utf8');

      expect(text.includes(r.pinnedBy.marker)).toBe(true);
    }
  });
});
