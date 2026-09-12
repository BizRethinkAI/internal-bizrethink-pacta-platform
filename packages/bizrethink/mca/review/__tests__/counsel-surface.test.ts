import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mcaLibraryFingerprint } from '../../clauses/approval';
import { outstandingFindingsFor, REVIEWS } from '../../clauses/examination';
import { MCA_INSTRUMENTS, type McaInstrument } from '../../clauses/instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../../clauses/library';
import { LOMBARD } from '../../clauses/parties';
import { counselReviewView } from '../counsel-view';
import type { McaLibraryReview } from '../link';

/**
 * WHAT AN ATTORNEY SEES, ASSERTED — for the first time.
 *
 * 2,476 tests asserted things about this package and not one of them asserted
 * anything about this page. The defects below were found by the owner opening
 * the link, which is the whole reason this file exists: a decided ADR sat
 * unimplemented in front of outside counsel for a day and nothing was red.
 *
 * WHAT WAS ACTUALLY ON THE PAGE, and what each `describe` below is pinned to:
 *
 *   - **Findings from the two document reviews, rendered as annotations under
 *     the clause they concern.** [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md)
 *     decided on 2026-09-10 that they are drafting input and *"stop being shown
 *     to a reviewing attorney"*. The code change never happened.
 *   - **Those findings audited `Lombard_FRPA_v4`, and every FRPA clause has
 *     since been rewritten**, so the notes describe text that no longer exists.
 *     Under §2.1 the clause now reads *"Merchant makes no representation or
 *     warranty as to the fair market value of the Purchased Receipts"* and the
 *     note beneath it said §2.1 *"makes the merchant agree that the Purchase
 *     Price equals the fair market value of the Receipts"*. The annotation
 *     asserted the opposite of the clause it sat under.
 *   - **Two of them named `CONTRACT_INDEX.md`**, an internal working paper, and
 *     told outside counsel our own entity records are *"unverified"*.
 *   - **A briefing paragraph pointed her at them**: *"40 of the 100 clauses
 *     below carry a finding that nothing has yet disposed of"* — which to an
 *     attorney reads as "40% of this agreement has known unresolved problems
 *     and you are being asked to approve it anyway".
 *   - **A numbering sentence in the baseline-fidelity framing ADR 0012
 *     retired**: *"Clause numbers are the document's own, never invented"*, plus
 *     a count — forty — that was never the count of unnumbered clauses. It is
 *     the count of clauses carrying no HEADING. Twenty-nine carry no number.
 *
 * WHY THE PROPERTIES ARE STATED OVER THE SET. Six agreements go out on these
 * links. A property asserted about the FRPA alone is the one that misses the
 * seventh document, and the leaked filename happened to be on the FRPA only by
 * accident of which clause a reviewer had looked at.
 *
 * AND WHY EACH DETECTOR IS PROVED TO FIRE. A guard that has not been shown to
 * fail is not evidence — this repo added a CI guard the day before this file was
 * written, in a job where it could never have run, and its author's own test
 * passed because it exercised the logic by hand instead of the step. The first
 * `describe` runs every detector here against the real strings that were on the
 * page, so a detector that stops discriminating fails rather than passing
 * silently.
 */

/*
  ── The detectors ──────────────────────────────────────────────────────────

  A filename with an extension anybody in this repository would recognise, and
  a path into this repository or its sibling. `(?![\w-])` matters: clause slugs
  look like `frpa.d-b-a-names-4-9`, and a naive `\.ts\b` matches the middle of
  one.
*/
const INTERNAL_FILE = /[\w-]+\.(?:md|mdx|ts|tsx|json|yml|yaml|docx|pdf|txt|csv|sql|sh|py)(?![\w-])/i;

const INTERNAL_PATH =
  /(?:packages|apps|docs|scripts|overlays|node_modules)\/[\w./-]+|lombard-contracts|change-notes|CONTRACT_INDEX|REVIEW-0\d/i;

/** Every string anywhere in the payload, keys included. */
const everyString = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(everyString);
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [key, ...everyString(child)]);
  }

  return [];
};

/** Every property name anywhere in the payload. */
const everyKey = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(everyKey);
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [key, ...everyKey(child)]);
  }

  return [];
};

const reviewFor = (instrument: McaInstrument, pinnedTo: 'now' | 'something else'): McaLibraryReview => ({
  id: 'mca_library_review_test',
  token: 'mclr_test',
  status: 'open',
  reviewerName: 'For Open AI',
  reviewerEmail: 'counsel@example.com',
  instrument,
  libraryFingerprint:
    pinnedTo === 'now' ? mcaLibraryFingerprint(libraryFor(instrument)) : 'a fingerprint from before a clause moved',
  expiresAt: new Date('2026-09-22T00:00:00Z'),
});

const viewFor = (instrument: McaInstrument, pinnedTo: 'now' | 'something else' = 'now') =>
  counselReviewView({
    review: reviewFor(instrument, pinnedTo),
    tenant: LOMBARD,
    approvals: new Map(),
    sender: { name: 'Shwet Prabhat', email: 'contracts@pacta.ink' },
    now: new Date('2026-09-11T00:00:00Z'),
  });

const briefingText = (instrument: McaInstrument) =>
  viewFor(instrument)
    .briefing.flatMap((section) => [section.title, ...section.body])
    .join('\n');

/** Every finding string the register would have put under a clause of this agreement. */
const findingsOn = (instrument: McaInstrument): string[] =>
  libraryFor(instrument).flatMap((clause) => outstandingFindingsFor(clause).map((finding) => finding.finding));

const route = readFileSync(
  new URL('../../../../../apps/remix/app/routes/_recipient+/mca-clause-review.$token.tsx', import.meta.url),
  'utf8',
);

describe('the detectors can go red', () => {
  /**
   * THE STRING THAT WAS ACTUALLY ON THE PAGE. If this stops matching, the
   * filename detector has been narrowed past the leak it was written for and
   * every green assertion below becomes vacuous.
   */
  it('the filename detector matches the working paper the register names', () => {
    const leaking = REVIEWS.flatMap((review) => review.findings)
      .map((finding) => finding.finding)
      .filter((finding) => INTERNAL_FILE.test(finding));

    expect(leaking.length).toBeGreaterThan(0);
    expect(leaking.join('\n')).toContain('CONTRACT_INDEX.md');
  });

  it('the path detector matches a repository path and the sibling repo by name', () => {
    expect(INTERNAL_PATH.test('packages/bizrethink/mca/clauses/library.ts')).toBe(true);
    expect(INTERNAL_PATH.test('recorded in the lombard-contracts manifests')).toBe(true);
    expect(INTERNAL_PATH.test('REVIEW-02 read it')).toBe(true);
  });

  /**
   * AND DISCRIMINATES. A detector that matches contract prose would make the
   * property unfalsifiable in the other direction — it would fail forever and
   * be deleted, which is the same outcome as never having been written.
   */
  it('neither detector fires on clause text, slugs or statutory citations', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      expect(INTERNAL_FILE.test(clause.body), clause.slug).toBe(false);
      expect(INTERNAL_PATH.test(clause.body), clause.slug).toBe(false);
      expect(INTERNAL_FILE.test(clause.slug), clause.slug).toBe(false);
      expect(INTERNAL_PATH.test(clause.slug), clause.slug).toBe(false);
      expect(INTERNAL_FILE.test(clause.requiredBy ?? ''), clause.slug).toBe(false);
    }
  });

  /**
   * THE FINDING PROPERTY IS NOT VACUOUS EITHER. If the register ever stops
   * resolving a single outstanding finding against these agreements, "no
   * finding reaches counsel" would pass while asserting nothing, which is the
   * failure mode two assertions in this package already had for a day.
   */
  it.each(MCA_INSTRUMENTS)('%s has findings that WOULD be renderable', (instrument) => {
    expect(findingsOn(instrument).length).toBeGreaterThan(0);
  });
});

describe('no internal identifier reaches counsel', () => {
  it.each(MCA_INSTRUMENTS)('%s ships no filename anybody here would recognise', (instrument) => {
    for (const value of everyString(viewFor(instrument))) {
      expect(INTERNAL_FILE.test(value), value.slice(0, 200)).toBe(false);
    }
  });

  it.each(MCA_INSTRUMENTS)('%s ships no repository path or sibling-repo name', (instrument) => {
    for (const value of everyString(viewFor(instrument))) {
      expect(INTERNAL_PATH.test(value), value.slice(0, 200)).toBe(false);
    }
  });
});

describe('no review finding reaches counsel', () => {
  /**
   * ADR 0012's closed question, asserted: *"Do findings render to reviewing
   * counsel? **No.** They are drafting input."*
   */
  it.each(MCA_INSTRUMENTS)('%s ships not one word of the earlier reviews', (instrument) => {
    const shipped = everyString(viewFor(instrument)).join('\n');

    for (const finding of findingsOn(instrument)) {
      expect(shipped, finding.slice(0, 120)).not.toContain(finding);
    }
  });

  /**
   * NOT SENT AND HIDDEN — NOT SENT. A field the page declines to paint is still
   * in the JSON the browser holds, still in the network tab, and still readable
   * by anyone holding the link. If counsel must not see it, shipping it and
   * styling it away is not the fix.
   */
  it.each(MCA_INSTRUMENTS)('%s carries no findings field for a page to paint later', (instrument) => {
    const keys = new Set(everyKey(viewFor(instrument)));

    expect([...keys]).not.toContain('outstandingFindings');
    expect([...keys]).not.toContain('findingsReadable');
  });

  /**
   * THE CLAUSE SHAPE IS PINNED, so the next field added to a clause has to be a
   * decision rather than a default. Every one of these is something counsel is
   * meant to read; anything else arriving here should fail this test first.
   */
  it.each(MCA_INSTRUMENTS)('%s ships exactly the clause fields counsel is meant to read', (instrument) => {
    for (const section of viewFor(instrument).sections) {
      for (const clause of section.clauses) {
        expect(Object.keys(clause).sort()).toEqual([
          'appliesInStates',
          'approved',
          // ADR 0011: fields and variant context are deliberate review content.
          'fields',
          'heading',
          'included',
          'kind',
          'number',
          'requiredBy',
          'selectionNote',
          'slug',
          'text',
          'unnumberedReason',
        ]);
      }
    }
  });

  it('renders no findings block, and no longer names one', () => {
    expect(route).not.toMatch(/outstandingFindings/);
    expect(route).not.toMatch(/findingsReadable/);
    expect(route).not.toMatch(/From the earlier document reviews/);
  });
});

describe('the briefing claims nothing ADR 0012 closed', () => {
  /**
   * *"40 of the 100 clauses below carry a finding that nothing has yet disposed
   * of. Those are the ones we would most like your eye on, and they are marked
   * in place…"* — wrong once the findings are gone, and worse than wrong while
   * they were there: it is an invitation to read our patches to somebody else's
   * paper instead of the clause.
   */
  it.each(MCA_INSTRUMENTS)('%s does not point the reader at annotations', (instrument) => {
    const body = briefingText(instrument);

    expect(body).not.toMatch(/marked in place|quoted underneath|beside the text it is about/i);
    expect(body).not.toMatch(/\d+ of the \d+ clauses below carry a finding/i);
    expect(body).not.toMatch(/\bdisposed\b/i);
  });

  /**
   * AND DOES NOT DESCRIBE THE REGISTER AT ALL. A briefing that names a register
   * counsel cannot see either invites a request for it or reads as something
   * withheld. The findings are drafting input; the reader is being asked about
   * the clause.
   */
  it.each(MCA_INSTRUMENTS)('%s does not describe the earlier reviews or their register', (instrument) => {
    const body = briefingText(instrument);

    expect(body).not.toMatch(/adversarial/i);
    expect(body).not.toMatch(/\bregister\b/i);
    expect(body).not.toMatch(/earlier (?:review|reader|finding)/i);
  });

  /**
   * WITHOUT DELETING THE ONE THING ABOUT FINDINGS THAT IS STILL TRUE. Counsel
   * writes findings on this page and an unanswered one blocks approval of its
   * clause. That is what separates the box from a comment field, and it must
   * survive the removal above.
   */
  it.each(MCA_INSTRUMENTS)('%s still says what a finding SHE writes does', (instrument) => {
    const body = briefingText(instrument);

    expect(body).toMatch(/a finding blocks the clause/i);
    expect(body).toMatch(/cannot be approved/i);
  });

  /**
   * THE NUMBERING SENTENCE. *"Clause numbers are the document's own, never
   * invented"* is the baseline-fidelity framing ADR 0012 retired: the library is
   * an authored corpus and the baseline's numbering does not bind it — *"Does
   * the baseline's numbering bind us? **No.**"*
   *
   * It must not be replaced by a promise either. Renumbering is ADR 0011 phases
   * 3–4 and has not happened, so the briefing may describe what the page shows
   * and may not describe what it will show.
   */
  it.each(MCA_INSTRUMENTS)('%s does not claim the numbering is the baseline document’s', (instrument) => {
    const body = briefingText(instrument);

    expect(body).not.toMatch(/never invented/i);
    expect(body).not.toMatch(/the document's own|the document’s own/i);
    expect(body).not.toMatch(/will be renumbered|we will number|numbering will/i);
  });

  /**
   * NOR THAT THE CLAUSES ARE A QUOTATION OF ANYTHING. *"The text is quoted
   * exactly as the document publishes it"* is the same retired framing in the
   * paragraph above the numbering one — *"Is the library a transcription of the
   * baseline? **No.** It is an authored corpus"*, and *"The rendered documents
   * follow the library, not the other way round."* There is no document upstream
   * of these words for them to be quoted from.
   *
   * What the paragraph is FOR survives and is asserted: the `«N»` markers are
   * left in, because where a fill-in field sits changes the sentence it sits in.
   */
  it.each(MCA_INSTRUMENTS)('%s does not present the clauses as quoted from a document', (instrument) => {
    const body = briefingText(instrument);

    expect(body).not.toMatch(/quoted exactly as|as the document publishes|verbatim from the (?!regulation)/i);
    expect(body).toMatch(/«[Aa]ngle-bracketed numbers» are left in/);
  });

  /**
   * AND THE COUNT IN IT IS THE REAL ONE. The sentence said "forty clauses across
   * the library carry no number". Twenty-nine do. Forty is the number carrying
   * no HEADING — two different facts, one of them printed to an attorney as the
   * other. Asserted per agreement, because the briefing is per agreement.
   */
  it.each(MCA_INSTRUMENTS)('%s states the true count of clauses it does not number', (instrument) => {
    const clauses = libraryFor(instrument);
    const unnumbered = clauses.filter((clause) => Boolean(clause.unnumberedReason)).length;
    const body = briefingText(instrument);

    expect(body).not.toMatch(/forty clauses/i);

    // Zero is also an exact count, rather than an omitted claim.
    const claim = body.match(/(\d+) of the (\d+) review items below carry no number/i);

    expect(claim, 'the briefing states no count of unnumbered clauses').not.toBeNull();
    expect(Number(claim?.[1])).toBe(unnumbered);
    expect(Number(claim?.[2])).toBe(clauses.length);
  });
});

/**
 * THE STALENESS CHECK, PINNED IN BOTH DIRECTIONS.
 *
 * It fires today because the FRPA clauses were rewritten after the link was
 * minted, which is the mechanism working. It is asserted here so that nothing
 * "fixes" the banner by weakening what it compares — the failure would be
 * silent, and the reader it fails is an attorney who would then believe she is
 * reading what she was briefed on.
 */
describe('the reviewer is still told when the agreement moved', () => {
  it.each(MCA_INSTRUMENTS)('%s reports no movement against a link pinned to the current text', (instrument) => {
    expect(viewFor(instrument, 'now').agreementMoved).toBe(false);
  });

  it.each(MCA_INSTRUMENTS)('%s reports movement against a link pinned to anything else', (instrument) => {
    expect(viewFor(instrument, 'something else').agreementMoved).toBe(true);
  });

  it('keeps the banner on the page', () => {
    expect(route).toMatch(/agreementMoved/);
    expect(route).toMatch(/This agreement has changed since the link was sent/);
  });
});
