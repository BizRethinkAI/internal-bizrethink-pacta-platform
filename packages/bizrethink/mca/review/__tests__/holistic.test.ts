import { describe, expect, it } from 'vitest';
import { ALL_MCA_CONTENT, contentFindingSlugs } from '../../catalogue';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { libraryFindingHoldTargets } from '../holds';
import { buildLibraryReviewPackage, readReviewPackage, reviewPackageFingerprint } from '../package';
import { buildProviderReviewPackage } from '../provider-package';
import { reviewCompletionBlockers, reviewTargets, validateFindingTargets } from '../targets';

describe('holistic findings and saved provider review', () => {
  const library = buildLibraryReviewPackage({ contact: 'Review desk' });
  const provider = (processorText: string | null = 'Controlled processor terms supplied for this review.') =>
    buildProviderReviewPackage({
      compiled: compileMcaTemplate(providerFixture()),
      templateId: 'template-a',
      revision: 2,
      contact: 'Provider review desk',
      processorText,
    });
  it('supports package, cross-instrument, requirement and processor findings within the saved scope', () => {
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
    expect(snapshot.externalDocuments[0]).toMatchObject({
      processor: 'Example Processor Inc.',
      content: 'Controlled processor terms supplied for this review.',
    });
    expect(new Set(snapshot.requirements.map((requirement) => requirement.jurisdiction))).toEqual(
      new Set(['US-CA', 'US-FL']),
    );
    expect(() => validateFindingTargets(snapshot, ['content:equipment-lease.guarantor-information'])).toThrow(
      /target/i,
    );
    expect(validateFindingTargets(snapshot, ['processor:split-funding'])).toEqual(['processor:split-funding']);
  });
  it('keeps v1 library snapshots valid and verifies the complete v2 provider payload', () => {
    expect(readReviewPackage(library, reviewPackageFingerprint(library))).toEqual(library);
    const snapshot = provider();
    const fingerprint = reviewPackageFingerprint(snapshot);
    expect(readReviewPackage(snapshot, fingerprint)).toEqual(snapshot);
    snapshot.externalDocuments[0].content = 'Substituted terms.';
    expect(() => readReviewPackage(snapshot, fingerprint)).toThrow(/snapshot/i);
  });
  it('requires explicit review coverage, no unanswered findings, and the actual processor form', () => {
    const snapshot = provider();
    const units = reviewTargets(snapshot)
      .filter((target) => target.reviewUnit)
      .map((target) => target.id);
    expect(reviewCompletionBlockers(snapshot, [], 0)).toContain('Some review units have not been marked reviewed.');
    expect(reviewCompletionBlockers(snapshot, units, 1)).toContain('There are unanswered findings.');
    expect(reviewCompletionBlockers(provider(null), units, 0)).toContain('The controlled processor form is missing.');
    expect(reviewCompletionBlockers(snapshot, units, 0)).toEqual([]);
  });
});
