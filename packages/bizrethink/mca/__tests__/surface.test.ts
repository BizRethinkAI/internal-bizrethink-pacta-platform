import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentStatute } from '../content/types';
import { UNRESOLVED_READINGS } from '../instance/identities';
import { MCA_JURISDICTIONS } from '../jurisdictions';
import type { ItemizationForm } from '../prescribed/itemization';
import type { PrescribedForm } from '../prescribed/types';
import { READING_GOES_STALE_AFTER_DAYS } from '../provenance/reading-age';
import { normalisedDigest, readSourceText, resolveSourcesDir } from '../provenance/source-text';
import type { McaDisclosure } from '../provenance/verify';
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

/*
  A FIXED CLOCK FOR EVERY ASSERTION THAT TURNS ON ONE.

  `entryFor` takes `now` because a reading's age is a function of it, and a view
  model that read the wall clock would have a stale branch reachable only by
  waiting six months — a branch nobody has tested. It also keeps this suite from
  going red on a calendar rather than on a change: an assertion that a synthetic
  form is "verified" would start failing 181 days after it was written, on a PR
  that touched nothing.
*/
const NOW = new Date('2026-09-08T12:00:00Z');

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

  it('a matching digest and fresh reading do not establish the source origin', () => {
    // Utah now has a recorded official retrieval. Virginia's local form remains
    // the real unrecorded-source fixture until its separate correction lands.
    const sourceFile = 'VA-Disclosure-Form.txt';
    const built = entryFor(
      {
        ...fullyVerified,
        sourceFile,
        sourceDigest: normalisedDigest(readSourceText(sourceFile)),
      },
      { now: NOW },
    );

    expect(built.digest).toBe('matches');
    expect(built.freshness).toBe('fresh');
    expect(built.origin).toBe('origin-not-recorded');
    // This synthetic form also has unrelated section/row mismatches. Pin the
    // origin verdict separately; source-origin.test.ts isolates the header rules.
    expect(built.assurance).toBe('unverified');
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
  WHAT "VERIFIED" WAS QUIETLY MEANING, AND WHAT IT MEANS NOW.

  Until this change the word on a card was earned by one comparison: the sha256
  of OUR VENDORED COPY still matches what the spec recorded. That answers "has
  anyone edited our copy?" and a reader takes it to answer two other questions
  it cannot touch.

    STALENESS. A regulator amends the rule; our file does not move; the digest
    matches; the card stays green about text that is now wrong. Nothing in this
    package can see an amendment. What it can state is how old the reading is.

    SOURCE STRENGTH. Georgia was "verified" against a browser capture of
    law.justia.com that was also incomplete — subsection (a)'s definitions were
    absent, so "advance fee", the term the broker prohibition turns on, was
    defined nowhere in what we held. Its card was indistinguishable from
    California's.

  Both now feed the same three-level `Assurance`. No fourth level: the ladder
  already means "nothing re-executes this" / "part of this is unread" /
  "everything a check can reach was re-found", and an unrecorded origin and an
  ageing reading are both the middle rung. What they are not is `verified`.
*/
describe('assurance also turns on where the text came from and how old the reading is', () => {
  /*
    THE ONE SYNTHETIC THAT CAN STILL REACH `verified`.

    Built on Georgia's file rather than California's, because Georgia's is one
    of the two in `sources/` that records a retrieval from the publisher that
    enacted the text. That is the whole demonstration: after this change the top
    level is reachable only by a source somebody can trace, and the file that
    reaches it is the one that was re-vendored *because* it had been a secondary
    capture.
  */
  const txSource = readSourceText('TX-Fin-Code-Ch-398.txt');

  const tracedToItsPublisher = syntheticForm({
    slug: 'synthetic-official-publisher',
    citation: 'Tex. Fin. Code §398.001',
    jurisdiction: 'US-TX',
    sourceFile: 'TX-Fin-Code-Ch-398.txt',
    status: 'published',
    sourceDigest: normalisedDigest(txSource),
    section: {
      from: 'SUBCHAPTER A. GENERAL PROVISIONS',
      to: 'SUBCHAPTER B. REGULATION AND DISCLOSURE REQUIREMENTS',
    },
    structureEvidence: 'source-order',
    source: {
      kind: 'regulator-prescribed-form',
      citation: 'Tex. Fin. Code §398.001',
      sourceFile: 'TX-Fin-Code-Ch-398.txt',
      verbatimVerifiedAt: '2026-09-07',
      structureVerifiedAt: '2026-09-07',
    },
    rows: [
      {
        label: 'Disbursement amount',
        verbatim: '"Disbursement amount" means the amounts paid to the recipient or on the recipient\'s behalf.',
        onlyPrescribedContent: true,
      },
    ],
  });

  it('a traceable source, read this week and with nothing unread, is verified', () => {
    const built = entryFor(tracedToItsPublisher, { now: NOW });

    expect(built.problems).toEqual([]);
    expect(built.digest).toBe('matches');
    expect(built.origin).toBe('official-publisher');
    expect(built.freshness).toBe('fresh');
    expect(built.assurance).toBe('verified');
  });

  /*
    THE DEFAULT IS THE DERIVED ONE.

    `entryFor` accepts an origin so the secondary-publisher branch is reachable
    at all — no file in `sources/` is one, and putting a fake statute there to
    make a test go green would be a worse thing than an untested branch. This
    asserts the seam is only a seam: with nothing passed, the verdict comes off
    the bytes on disk, and it names the URL it came from.
  */
  it('derives the origin from the vendored file when nothing is passed', () => {
    const built = entryFor(tracedToItsPublisher);

    expect(built.origin).toBe('official-publisher');
    expect(built.originEvidence).toMatch(/capitol\.texas\.gov/);
  });

  it('the same form, read seven months ago, stops being verified', () => {
    const built = entryFor(
      {
        ...tracedToItsPublisher,
        source: {
          kind: 'regulator-prescribed-form',
          citation: 'Tex. Fin. Code §398.001',
          sourceFile: 'TX-Fin-Code-Ch-398.txt',
          verbatimVerifiedAt: '2026-01-01',
          structureVerifiedAt: '2026-01-01',
        },
      },
      { now: NOW },
    );

    expect(built.problems).toEqual([]);
    expect(built.digest).toBe('matches');
    expect(built.freshness).toBe('stale');
    expect(built.daysSinceRead).toBe(250);
    expect(built.assurance).toBe('partly-verified');
    expect(built.assuranceReasons.join(' ')).toMatch(new RegExp(`${READING_GOES_STALE_AFTER_DAYS} days`));
  });

  /*
    A reading is as current as its OLDER half. A form whose words were re-read
    last week and whose rows were last checked in January has not been read
    since January — the two dates are claims about different things and the page
    may not quote the flattering one.
  */
  it('ages a form by its older date', () => {
    const built = entryFor(
      {
        ...tracedToItsPublisher,
        source: {
          kind: 'regulator-prescribed-form',
          citation: 'Tex. Fin. Code §398.001',
          sourceFile: 'TX-Fin-Code-Ch-398.txt',
          verbatimVerifiedAt: '2026-09-07',
          structureVerifiedAt: '2026-01-01',
        },
      },
      { now: NOW },
    );

    expect(built.lastReadAt).toBe('2026-01-01');
    expect(built.freshness).toBe('stale');
  });

  /*
    THE GEORGIA CASE ITSELF, WHICH IS THE ONLY ONE THAT IS BLOCKING.

    An unrecorded origin leaves a reader unable to re-check a claim. A
    secondary publisher is a claim that has been checked and has failed: the
    text we hold is a reproduction, and the one time this package was in that
    position the reproduction was missing an entire subsection. So it lands
    beside a stale digest and a missing file rather than beside an unread row.
  */
  it('a source from a publisher that reproduces the law is unverified, not partly verified', () => {
    const built = entryFor(tracedToItsPublisher, {
      now: NOW,
      origin: {
        origin: 'secondary-publisher',
        evidence: 'Retrieved 2026-08-01 from https://law.justia.com/codes/georgia/',
        why: 'the retrieval names a publisher that reproduces the law rather than enacting or codifying it',
      },
    });

    expect(built.assurance).toBe('unverified');
    expect(built.assuranceReasons.join(' ')).toMatch(/justia/);
  });

  /*
    A DATE THAT IS NOT A DATE.

    `assertPublishable` asks whether a date is PRESENT, and "soon" is present.
    Before this it would have passed the gate, produced no provenance problem,
    and rendered as verified.
  */
  it('refuses a verification date that is not a date', () => {
    const built = entryFor(
      {
        ...tracedToItsPublisher,
        source: {
          kind: 'regulator-prescribed-form',
          citation: 'Tex. Fin. Code §398.001',
          sourceFile: 'TX-Fin-Code-Ch-398.txt',
          verbatimVerifiedAt: 'soon',
          structureVerifiedAt: '2026-09-07',
        },
      },
      { now: NOW },
    );

    expect(built.freshness).toBe('never-read');
    expect(built.assurance).toBe('unverified');
    expect(built.assuranceReasons.join(' ')).toMatch(/"soon"/);
  });
});

/*
  THE SUMMARY LINE, COMPUTED WHERE IT CAN BE ASSERTED.

  The route used to count these itself — `entries.filter(e => e.assurance !==
  'verified').length` in the `.tsx` — which is a view model in a file no test
  runs. The number at the top of the page is the one sentence most readers take
  away, so it is the last thing that should live where nothing checks it.
*/
describe('the top line says what the cards say', () => {
  const summary = surface.summary;

  it('counts the entries it was built from', () => {
    expect(summary.total).toBe(surface.entries.length);
    expect(summary.verified + summary.partlyVerified + summary.unverified).toBe(summary.total);
  });

  it('agrees with the cards, level by level', () => {
    const at = (level: string) => surface.entries.filter((e) => e.assurance === level).length;

    expect(summary.verified).toBe(at('verified'));
    expect(summary.partlyVerified).toBe(at('partly-verified'));
    expect(summary.unverified).toBe(at('unverified'));
  });

  /*
    TWO OF THE ELEVEN FILES RECORD WHERE THEY CAME FROM, and both were
    re-vendored after a defect was found in what preceded them: Georgia's was a
    law.justia.com capture missing subsection (a), Texas's disclosure had been
    built from a bill analysis rather than the statute.

    Named rather than counted. A count moves when a source is re-vendored
    properly and when a new source arrives without a header, and those call for
    opposite responses.
  */
  it('names the disclosures whose source records a retrieval from its publisher', () => {
    expect(
      surface.entries
        .filter((e) => e.origin === 'official-publisher')
        .map((e) => e.slug)
        .sort(),
    ).toEqual([
      'ca-itemization',
      'ca-lease-financing',
      'ca-offer-summary',
      'ct-disclosure',
      'fl-disclosure',
      'ga-disclosure',
      'ks-disclosure',
      'la-disclosure',
      'mo-disclosure',
      'ny-itemization',
      'ny-lease-financing',
      'ny-offer-summary',
      'tx-disclosure',
      'ut-disclosure',
    ]);

    /*
      Utah now records the September 12 audit's official retrieval. Virginia's
      local form still awaits its separate correction. This changes the source
      origin count, not the content/conformity assurance assigned to either form.
    */
    expect(summary.fromOfficialPublisher).toBe(14);
    expect(summary.fromSecondaryPublisher).toBe(0);
    expect(summary.originNotRecorded).toBe(summary.total - 14);
  });

  it('carries the threshold it judged staleness by, so the page states the number it used', () => {
    expect(summary.staleAfterDays).toBe(READING_GOES_STALE_AFTER_DAYS);
  });

  /*
    THE COUNTS MUST BE ABLE TO MOVE. Built at a date past every verification
    date on the surface, which is a date that will arrive on its own — the point
    of the whole change is that the page notices when it does.
  */
  it('reports every state as stale once the readings age past the threshold', () => {
    const later = conformitySurface(new Date('2028-01-01T12:00:00Z'));

    expect(later.summary.staleReadings).toBe(later.summary.total);
    expect(later.summary.verified).toBe(0);
    expect(later.entries.every((e) => e.freshness === 'stale')).toBe(true);

    // On a card that is only PARTLY verified the age is the reason it is not
    // verified, so it has to be said. On an unverified one the reasons are the
    // blocking ones and an ageing reading is not among them — a state nothing
    // re-executes is not additionally interesting for being six months old.
    for (const e of later.entries.filter((x) => x.assurance === 'partly-verified')) {
      expect(e.assuranceReasons.join(' ')).toMatch(/last read/i);
    }
  });

  /*
    Fixed clock, not `new Date()`. Every verification date on the surface was
    earned in September 2026, so a wall-clock assertion here would go red 181
    days from now on a pull request that touched nothing — a test that fails on
    a calendar teaches people to ignore it. What it pins is real: on the day
    this was written, no reading on the surface was older than the threshold.
  */
  it('reports none of them stale on the day this was written', () => {
    expect(conformitySurface(NOW).summary.staleReadings).toBe(0);
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
  THE THIRD SHAPE.

  #119 added `ItemizationForm` — made of `lines`, counted by
  `itemizationCoverage()` — beside `PrescribedForm` (`rows`) and
  `ContentStatute` (`requirements`). This surface assumed exactly two, and sent
  an itemization down the content-statute branch where `.requirements` does not
  exist.

  NOTE HOW THAT PRESENTED, because it is the argument for the typecheck gate:
  the suite went green on code that does not compile. vitest strips types, so
  only `tsc` saw it, and neither PR failed alone — only the combination did.

  The itemization is its own CARD, not a section of California's. It is a
  separate document, sent to the merchant separately, compelled by its own
  regulation (§956, not §914) and checked by its own checker. Folding it into
  its parent state's card buries all of that; leaving it off the page recreates
  exactly the blind spot this surface exists to close — two documents merchants
  receive, unverified and unmentioned.
*/
describe('the Itemization of Amount Financed gets a card of its own', () => {
  it('is on the surface as a first-class entry, not folded into its state', () => {
    expect(surface.entries.filter((e) => e.kind === 'itemization').map((e) => e.slug)).toEqual([
      'ca-itemization',
      'ny-itemization',
    ]);
  });

  it('carries the regulation that compels it, which is not its state\u2019s offer-summary rule', () => {
    expect(entry('ca-itemization').citation).toBe('10 CCR \u00a7956');
    expect(entry('ny-itemization').citation).toBe('23 NYCRR \u00a7600.17');

    // The card next to it on the same state is a DIFFERENT regulation. If these
    // ever agree, the two documents have been conflated.
    expect(entry('ca-offer-summary').citation).not.toBe(entry('ca-itemization').citation);
  });

  /*
    \u00a7956(a)(3) and \u00a7600.17(a)(3) require a line per third-party payee and word
    none of it, so that line's text is ours on a document that is otherwise the
    regulator's. One line of six, on each. It belongs on the card exactly the
    way an unread row does.
  */
  it('shows the payee line the regulation requires and does not word', () => {
    for (const slug of ['ca-itemization', 'ny-itemization']) {
      const e = entry(slug);

      expect(e.rowsTotal).toBe(6);
      expect(e.unreadable).toHaveLength(1);
      expect(e.unreadable[0]?.why).toMatch(/\(a\)\(3\)/);
    }
  });

  it('is partly verified \u2014 never verified \u2014 while that line is unread', () => {
    for (const slug of ['ca-itemization', 'ny-itemization']) {
      const e = entry(slug);

      expect(e.problems).toEqual([]);
      expect(e.digest).toBe('matches');
      expect(e.verbatimVerifiedAt).not.toBeNull();
      expect(e.structureVerifiedAt).not.toBeNull();
      expect(e.structureApplicable).toBe(true);
      expect(e.assurance).toBe('partly-verified');
    }
  });

  /*
    Unlike CA/NY offer summaries, an itemization's line ORDER is machine-checked:
    \u00a7956(a)(1)-(6) enumerate the lines in the order they appear and \u00a7956(b)
    prints worked examples in the same order. If this ever reads
    'prose-described' the structure date has quietly stopped being re-earned.
  */
  it('has its line order re-executed rather than resting on a human reading', () => {
    expect(entry('ca-itemization').structureEvidence).toBe('source-order');
    expect(entry('ny-itemization').structureEvidence).toBe('source-order');
  });
});

/*
  A FOURTH SHAPE MUST NOT RENDER AS AN EMPTY CARD.

  The bug #119 exposed was not that the itemization was mishandled; it was that
  a binary `prescribed ? \u2026 : \u2026` had no way to say "I do not know what this is".
  A card with zero rows and zero unread lines reads as a clean document, which
  is the failure mode this whole page is built against — one level up.

  Two guards, because they catch different things. The `never` assignment fails
  the TYPECHECK when a fourth member joins the `McaDisclosure` union, and CI now
  runs that as a blocking step. The throw catches an object that satisfies none
  of the three at runtime.
*/
/*
  A COMPILE-TIME PIN ON THE UNION ITSELF.

  The runtime throw below covers an object that is none of the three shapes.
  It cannot cover the other direction: a fourth member joining `McaDisclosure`,
  which is a type-level event no test can observe — vitest strips types, which
  is precisely how the itemization reached `.requirements` with 519 tests green.

  `shapeOf`'s `never` assignment catches that, but nothing proved the `never`
  assignment was still there; deleting it left every test passing. This is that
  proof. It stops compiling if `McaDisclosure` and the three handled shapes ever
  stop being the same set, in EITHER direction, and CI runs
  `tsc -p tsconfig.typecheck.json` as a blocking step.
*/
type HandledShapes = PrescribedForm | ItemizationForm | ContentStatute;

type SameSet<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

const everyShapeHasACard: SameSet<McaDisclosure, HandledShapes> = true;

describe('the surface handles every shape the library can hold', () => {
  it('is pinned at the type level, and this asserts the pin was evaluated', () => {
    expect(everyShapeHasACard).toBe(true);
  });
});

describe('a shape the page cannot render fails loudly', () => {
  it('refuses a spec that is none of the three shapes', () => {
    const alien = {
      slug: 'alien-shape',
      citation: 'nowhere',
      jurisdiction: 'US-CA',
      sourceFile: 'CA-10CCR-900-956.txt',
      sourceDigest: 'x',
      section: null,
      status: 'draft',
      source: { kind: 'attorney-drafted', author: null },
    } as unknown as Parameters<typeof entryFor>[0];

    expect(() => entryFor(alien)).toThrow(/alien-shape/);
    expect(() => entryFor(alien)).toThrow(/no card/i);
  });

  it('gives every entry on the real surface one of the three known shapes', () => {
    const kinds = new Set(surface.entries.map((e) => e.kind));

    expect([...kinds].sort()).toEqual(['content-statute', 'itemization', 'prescribed-form']);

    for (const e of surface.entries) {
      expect(e.rowsTotal).toBeGreaterThan(0);
      expect(e.assuranceReasons.length).toBeGreaterThan(0);
    }
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
