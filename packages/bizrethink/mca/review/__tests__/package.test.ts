import { describe, expect, it } from 'vitest';
import { ALL_MCA_CONTENT } from '../../catalogue';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { libraryFindingHoldTargets } from '../holds';
import { buildLibraryReviewPackage, readReviewPackage, reviewPackageFingerprint } from '../package';

describe('the complete neutral counsel package', () => {
  const build = () => buildLibraryReviewPackage({ contact: 'Legal operations · legal@example.test' });

  it('keeps package and instrument findings effective even before this version can create those target types', () => {
    const item = ALL_MCA_CONTENT.find((entry) => entry.slug === 'frpa.holdback-explainer');
    if (!item) {
      throw new Error('The shared payment provision is required for this regression.');
    }
    expect(libraryFindingHoldTargets(item)).toEqual(
      expect.arrayContaining(['package', 'document:frpa', `content:${item.slug}`]),
    );
  });

  it('contains every instrument and every clause and reusable item exactly once', () => {
    const snapshot = build();
    expect(snapshot.documents.map((document) => document.id)).toEqual(MCA_INSTRUMENTS);
    const items = snapshot.documents.flatMap((document) => document.sections.flatMap((section) => section.items));
    expect(items.map((item) => item.slug).sort()).toEqual(ALL_MCA_CONTENT.map((item) => item.slug).sort());
    expect(items.filter((item) => item.kind === 'clause').every((item) => item.number)).toBe(true);
    expect(items.filter((item) => item.kind !== 'clause').every((item) => item.number === null)).toBe(true);
  });

  it('uses neutral roles, keeps Payzli specific, and exposes no historical internal review material', () => {
    const snapshot = build();
    const text = JSON.stringify(snapshot);
    expect(text).not.toMatch(/Lombard|REVIEW-0[12]|source-documents|shwet/i);
    expect(text).toContain('[Buyer legal name]');
    expect(text).toContain('[Equipment provider legal name]');
    expect(text).toContain('Payzli');
    expect(snapshot.documents.find((document) => document.id === 'split-funding')?.control).toBe(
      'processor-controlled',
    );
  });

  it('carries all eleven states, source evidence, and the distinction between prescribed and authored content', () => {
    const snapshot = build();
    expect(new Set(snapshot.requirements.map((requirement) => requirement.jurisdiction)).size).toBe(11);
    expect(snapshot.requirements.every((requirement) => requirement.sourceEvidence && requirement.sourceDigest)).toBe(
      true,
    );
    expect(snapshot.requirements.find((requirement) => requirement.slug === 'va-disclosure')?.kind).toBe(
      'prescribed-form',
    );
    expect(snapshot.requirements.find((requirement) => requirement.slug === 'fl-disclosure')?.kind).toBe(
      'content-statute',
    );
    expect(
      snapshot.requirements.find((requirement) => requirement.slug === 'ca-offer-summary')?.entries.length,
    ).toBeGreaterThan(8);
  });

  it('includes recorded retrieval URLs, not just a publisher homepage', () => {
    const requirement = build().requirements.find((item) => item.slug === 'va-disclosure');
    expect(requirement?.sourceUrls.some((url) => url.includes('/uploads/10VAC5/forms/'))).toBe(true);
    expect(requirement?.sourceEvidence).toContain('Retrieved at (UTC)');
  });

  it('preserves the exact saved package, rejects changed payloads, and does not depend on the current date', () => {
    const snapshot = build();
    const fingerprint = reviewPackageFingerprint(snapshot);
    expect(reviewPackageFingerprint(build())).toBe(fingerprint);
    expect(readReviewPackage(JSON.parse(JSON.stringify(snapshot)), fingerprint)).toEqual(snapshot);
    snapshot.documents[0].sections[0].items[0].text += ' changed';
    expect(() => readReviewPackage(snapshot, fingerprint)).toThrow(/snapshot/i);
  });
  it('survives JSONB object-key reordering without changing array order or weakening content integrity', () => {
    const snapshot = build();
    const reorder = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(reorder);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value)
            .sort(([left], [right]) => right.localeCompare(left))
            .map(([key, child]) => [key, reorder(child)]),
        );
      }
      return value;
    };
    expect(readReviewPackage(reorder(snapshot), reviewPackageFingerprint(snapshot))).toEqual(snapshot);
    const fingerprint = reviewPackageFingerprint(snapshot);
    snapshot.documents.reverse();
    expect(() => readReviewPackage(snapshot, fingerprint)).toThrow(/snapshot/i);
  });

  it('provides reference contexts across the package without dropping target documents', () => {
    const snapshot = build();
    const all = new Set(
      snapshot.documents.flatMap((document) =>
        document.sections.flatMap((section) => section.items.map((item) => item.slug)),
      ),
    );
    const references = Object.values(snapshot.contexts).flatMap((context) =>
      Object.values(context).flatMap((reading) => reading.segments.filter((segment) => segment.kind === 'reference')),
    );
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((reference) => all.has(reference.targetSlug))).toBe(true);
  });
});
