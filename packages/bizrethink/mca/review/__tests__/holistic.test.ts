import { describe, expect, it } from 'vitest';
import { ALL_MCA_CONTENT, contentFindingSlugs } from '../../catalogue';
import { entityFixture } from '../../entities/entity.fixture';
import { compileMcaTemplate } from '../../templates/compile';
import { libraryFindingHoldTargets } from '../holds';
import { buildLibraryReviewPackage, readReviewPackage, reviewPackageFingerprint } from '../package';
import { buildProviderReviewPackage } from '../provider-package';
import { reviewCompletionBlockers, reviewTargets, validateFindingTargets } from '../targets';

describe('holistic findings and saved provider review', () => {
  const library = buildLibraryReviewPackage({ contact: 'Review desk' });
  const provider = (processorText: string | null = 'Controlled processor terms supplied for this review.') =>
    buildProviderReviewPackage({
      compiled: compileMcaTemplate(entityFixture(), 'frpa'),
      templateId: 'template-a',
      revision: 2,
      contact: 'Provider review desk',
      processorText,
    });
  it('supports package, cross-instrument and requirement findings within the saved scope', () => {
    const targets = [
      'content:frpa.holdback-explainer',
      'document:equipment-lease',
      'requirement:va-disclosure',
      'document:split-funding',
    ];
    expect(validateFindingTargets(library, targets)).toEqual(targets);
    expect(validateFindingTargets(library, ['package'])).toEqual(['package']);
    expect(() => validateFindingTargets(library, ['content:foreign'])).toThrow(/target/i);
    expect(() => validateFindingTargets(library, [targets[0], targets[0]])).toThrow(/target/i);
  });
  it('holds shared derived wording for findings against its source, instrument or the whole package', () => {
    const derived = ALL_MCA_CONTENT.find((item) => item.kind !== 'clause' && contentFindingSlugs(item).length > 1);
    expect(derived).toBeDefined();
    if (!derived) {
      throw new Error('A derived reusable item is required for this regression.');
    }
    const holds = libraryFindingHoldTargets(derived);
    expect(holds).toContain('package');
    expect(holds).toContain(`document:${derived.instrument}`);
    for (const slug of contentFindingSlugs(derived)) {
      expect(holds).toContain(`content:${slug}`);
    }
  });
  it('pins actual provider identities and the selected revision without importing another processor’s form', () => {
    const snapshot = provider();
    expect(snapshot.kind).toBe('provider');
    expect(snapshot.provider).toMatchObject({
      templateId: 'template-a',
      revision: 2,
      legalName: 'Example Receipts Inc.',
    });
    expect(JSON.stringify(snapshot)).toContain('Example Receipts Inc.');
    expect(JSON.stringify(snapshot)).not.toMatch(/Lombard|Payzli/);
    expect(snapshot.documents.map((document) => document.id)).toEqual(['frpa']);
    // A review of a template carries no processor form, because a template
    // names no processor (ADR 0026 §6).
    expect(snapshot).not.toHaveProperty('externalDocuments');
    expect(new Set(snapshot.requirements.map((requirement) => requirement.jurisdiction))).toEqual(
      new Set(['US-FL', 'US-NY']),
    );
    expect(() => validateFindingTargets(snapshot, ['content:equipment-lease.guarantor-information'])).toThrow(
      /target/i,
    );
    // And a finding cannot be raised against one either: there is no such
    // target in a template review any more.
    expect(() => validateFindingTargets(snapshot, ['processor:split-funding'])).toThrow(/target/i);
  });
  it('keeps v1 library snapshots valid and verifies the complete v2 provider payload', () => {
    expect(readReviewPackage(library, reviewPackageFingerprint(library))).toEqual(library);
    const snapshot = provider();
    const fingerprint = reviewPackageFingerprint(snapshot);
    expect(readReviewPackage(snapshot, fingerprint)).toEqual(snapshot);
    snapshot.provider.legalName = 'Substituted Receipts Inc.';
    expect(() => readReviewPackage(snapshot, fingerprint)).toThrow(/snapshot/i);
  });
  /**
   * THE PROCESSOR-FORM BLOCKER IS GONE, and its absence is the point of this
   * test rather than an omission from it. ADR 0026 §6 removed the processor
   * from templates, so requiring its form before a template review completes
   * asked for something the template never contained. The obligation moved
   * rather than vanished: a processor's form still needs its own review before
   * it is used.
   */
  it('requires explicit review coverage and no unanswered findings', () => {
    const snapshot = provider();
    const units = reviewTargets(snapshot)
      .filter((target) => target.reviewUnit)
      .map((target) => target.id);
    expect(reviewCompletionBlockers(snapshot, [], 0)).toContain('Some review units have not been marked reviewed.');
    expect(reviewCompletionBlockers(snapshot, units, 1)).toContain('There are unanswered findings.');
    expect(reviewCompletionBlockers(provider(null), units, 0)).toEqual([]);
    expect(reviewCompletionBlockers(snapshot, units, 0)).toEqual([]);
  });
});
