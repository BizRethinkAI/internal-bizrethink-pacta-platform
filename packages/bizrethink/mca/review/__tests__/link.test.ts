import { describe, expect, it } from 'vitest';

import { mcaLibraryFingerprint } from '../../clauses/approval';
import { ALL_MCA_CLAUSES, libraryFor } from '../../clauses/library';
import type { McaClause } from '../../clauses/types';
import { isMcaReviewUsable, MCA_REVIEW_LINK_TTL_DAYS, type McaLibraryReview, reviewIsStale } from '../link';
import { numberedLibraryForReview } from '../numbered-library';
import { readableSlugs, toReadableAgreement } from '../readable-agreement';

/**
 * The counsel review link, asserted before it exists.
 *
 * ADR 0009 calls this "generalise the review link", and the generalisation has
 * one hard edge: the lease's link is scoped by a `ClauseJurisdiction` because a
 * lease is a document a state decides. Nothing here is. An MCA deal is a SET of
 * documents, and the axis that scopes a link is which AGREEMENT it covers —
 * `McaInstrument`, never `McaJurisdiction`. These tests are what stop the two
 * axes being folded together on the way into the database.
 */

const now = new Date('2026-09-08T12:00:00Z');

const review = (overrides: Partial<McaLibraryReview> = {}): McaLibraryReview => ({
  id: 'mca_library_review_x',
  token: 'mclr_x',
  status: 'open',
  reviewerName: 'Jane Roe',
  reviewerEmail: 'jane@example.com',
  instrument: 'iso-pra',
  libraryFingerprint: mcaLibraryFingerprint(libraryFor('iso-pra')),
  expiresAt: new Date('2026-09-20T00:00:00Z'),
  ...overrides,
});

describe('whether a link may still be opened', () => {
  it('opens a live, unexpired link', () => {
    expect(isMcaReviewUsable(review(), now)).toBe(true);
  });

  it('refuses a revoked link', () => {
    expect(isMcaReviewUsable(review({ status: 'closed' }), now)).toBe(false);
  });

  it('refuses an expired link', () => {
    expect(isMcaReviewUsable(review({ expiresAt: new Date('2026-09-01T00:00:00Z') }), now)).toBe(false);
  });

  it('opens a link with no expiry, which only a person can end', () => {
    expect(isMcaReviewUsable(review({ expiresAt: null }), now)).toBe(true);
  });

  it('gives a reviewer long enough to get to it, and not forever', () => {
    expect(MCA_REVIEW_LINK_TTL_DAYS).toBeGreaterThan(7);
    expect(MCA_REVIEW_LINK_TTL_DAYS).toBeLessThanOrEqual(30);
  });
});

describe('whether the words moved under the reviewer', () => {
  it('says nothing moved when the agreement is as it was sent', () => {
    expect(reviewIsStale(review(), libraryFor('iso-pra'))).toBe(false);
  });

  it('says the agreement moved when any clause on the link moved', () => {
    const [first, ...rest] = libraryFor('iso-pra');
    const edited: McaClause[] = [{ ...first, body: `${first.body} Amended.` }, ...rest];

    expect(reviewIsStale(review(), edited)).toBe(true);
  });

  /*
    THE FAILURE THE LEASE LINK ALREADY PAID FOR. A link pinned to the whole
    library reports "the library has changed" when a clause it never showed
    moves — a warning the reader cannot act on, which is the fastest way to
    teach them to ignore warnings. An MCA link is pinned to ONE agreement.
  */
  it('does not go stale because a different agreement changed', () => {
    const link = review({ instrument: 'iso-pra' });

    expect(reviewIsStale(link, libraryFor('iso-pra'))).toBe(false);
    expect(mcaLibraryFingerprint(libraryFor('iso-pra'))).not.toBe(mcaLibraryFingerprint(ALL_MCA_CLAUSES));
  });
});

describe('what counsel actually reads', () => {
  const sections = toReadableAgreement(numberedLibraryForReview('iso-pra'));

  it('serves every clause of the agreement and nothing from any other', () => {
    const slugs = readableSlugs(sections);

    expect(slugs.length).toBe(libraryFor('iso-pra').length);
    expect(slugs.every((slug) => slug.startsWith('iso-pra'))).toBe(true);
  });

  it('groups into the agreement’s own sections, in reading order', () => {
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.every((section) => section.clauses.length > 0)).toBe(true);
  });

  /*
    THE `«N»` MARKERS STAY. The lease's reader strips `{{SIGNATURE}}` because a
    signing token is furniture the envelope builder adds. These are not that:
    they are AcroForm anchors printed in the document Lombard ships, and an
    attorney reviewing a contract has to see where a value is injected into a
    sentence. Stripping them would show counsel a document we do not publish.
  */
  it('quotes the document verbatim, markers and all', () => {
    const withMarkers = numberedLibraryForReview('frpa').filter((clause) => clause.body.includes('«'));
    const readable = toReadableAgreement(withMarkers);

    expect(withMarkers.length).toBeGreaterThan(0);
    expect(readable.flatMap((section) => section.clauses).every((clause) => clause.text.includes('«'))).toBe(true);
  });

  it('leaves a record unnumbered only by an explicit structural decision', () => {
    const unnumbered = numberedLibraryForReview('frpa').filter((clause) => clause.unnumberedReason);
    const readable = toReadableAgreement(unnumbered);

    expect(unnumbered.length).toBeGreaterThan(0);
    expect(readable.flatMap((section) => section.clauses).every((clause) => clause.number === '')).toBe(true);
  });
});
