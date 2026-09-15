import { describe, expect, it } from 'vitest';
import type { LegalSegment } from '../../../legal-ui/reading';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { buildLibraryReviewPackage, reviewPackageFingerprint } from '../package';
import {
  fieldRequirement,
  groupReviewFields,
  readableReviewMetadata,
  reviewFieldParts,
  reviewItemLabel,
  reviewParagraphs,
  searchSavedPackage,
  sourceEntryPresentation,
} from '../presentation';
import { buildProviderReviewPackage } from '../provider-package';
import { reviewTargets } from '../targets';

describe('readable saved MCA review content', () => {
  const snapshot = buildLibraryReviewPackage({ contact: 'Legal operations' });
  const frpa = snapshot.documents[0];
  const items = frpa.sections.flatMap((section) => section.items);
  const party = items.find((item) => item.slug === 'frpa.party-identification')!;

  it('uses each saved document’s field labels, preserving tokens, punctuation, percentages and unknowns', () => {
    const saved = structuredClone(frpa);
    saved.sections[0].items[0].fields.find((field) => field.binding === 'merchant.legalName')!.label =
      'Archived merchant name';
    const text =
      'For {{field:merchant.legalName}}, {{field:funding.specifiedPercentage}}%; {{field:missing.binding}}. [name of financer]';
    const parts = reviewFieldParts(text, saved, party);
    expect(parts.map((part) => part.original).join('')).toBe(text);
    expect(parts.map((part) => part.text).join('')).toContain('[Archived merchant name], ');
    expect(parts.filter((part) => part.kind === 'field')).toHaveLength(3);
    expect(parts.map((part) => part.text).join('')).toContain(']%; [Unmapped field]. [name of financer]');
    expect(parts.map((part) => part.text).join('')).not.toContain('{{');
  });

  it('annotates all current field tokens without changing any saved package content', () => {
    const before = reviewPackageFingerprint(snapshot);
    let processorAnnotations = 0;
    for (const document of snapshot.documents) {
      for (const item of document.sections.flatMap((section) => section.items)) {
        const parts = reviewFieldParts(item.text, document, item);
        expect(parts.map((part) => part.original).join('')).toBe(item.text);
        if (document.control === 'authored') {
          expect(parts.filter((part) => part.kind === 'field')).toHaveLength(
            [...item.text.matchAll(/\{\{field:[^{}]+\}\}/g)].length,
          );
          expect(parts.filter((part) => part.kind === 'field').every((part) => part.label !== 'Unmapped field')).toBe(
            true,
          );
        } else {
          const annotations = parts.filter((part) => part.kind === 'field');
          processorAnnotations += annotations.length;
          expect(annotations.every((part) => part.label !== 'Unmapped form field')).toBe(true);
        }
        const paragraphs = reviewParagraphs(item.reading.segments);
        expect(
          paragraphs
            .flat()
            .map((part) => part.text)
            .join(''),
        ).toBe(item.reading.segments.map((part) => part.text).join(''));
        expect(paragraphs.flat().filter((part) => part.kind === 'reference')).toEqual(
          item.reading.segments.filter((part) => part.kind === 'reference'),
        );
      }
    }
    expect(reviewPackageFingerprint(snapshot)).toBe(before);
    expect(processorAnnotations).toBe(12);
  });

  it('keeps the two processor percentage fields distinct and does not apply their mapping to changed source text', () => {
    const document = snapshot.documents.find((document) => document.id === 'split-funding')!;
    const [recital, instruction] = document.sections[0].items;
    const first = reviewFieldParts(recital.text, document, recital).filter((part) => part.kind === 'field');
    const second = reviewFieldParts(instruction.text, document, instruction).filter((part) => part.kind === 'field');
    expect(first.find((part) => part.original.includes('«2»'))?.label).toBe('Purchase agreement percentage');
    expect(second.find((part) => part.original.includes('«3»'))?.label).toBe('Processor withholding percentage');
    expect(reviewFieldParts('«2»', document, { ...recital, sourceFingerprint: 'different' }).at(0)?.label).toBe(
      'Unmapped form field',
    );
  });

  it('states conditional requiredness without printing a programming expression', () => {
    const field = items.find((item) => item.slug === 'frpa.guarantor-fields')!.fields.find((field) => field.condition)!;
    expect(fieldRequirement(field)).toBe('Required when the guarantor is an entity');
    expect(fieldRequirement({ ...field, condition: 'unknown.condition = value' })).toContain('Conditional requirement');
    expect(fieldRequirement({ ...field, required: true, condition: null })).toBe('Required');
  });

  it('gives every alternative its own understandable finding and index label without changing target IDs', () => {
    const targets = reviewTargets(snapshot).filter((target) => target.id.startsWith('content:'));
    expect(new Set(targets.map((target) => target.label)).size).toBe(targets.length);
    const pair = items.filter((item) => item.heading === 'Guaranty of Performance');
    expect(pair.map(reviewItemLabel)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Full performance guaranty'),
        expect.stringContaining('Example selection'),
      ]),
    );
    expect(targets.some((target) => target.id === 'content:frpa.full-performance-guaranty-9-2')).toBe(true);
  });

  it('spaces existing lines and sequential top-level list items while preserving every character and reference', () => {
    const reference: LegalSegment = {
      kind: 'reference',
      text: '3.1',
      targetKind: 'clause',
      targetSlug: 'target',
      instrument: 'frpa',
      section: 'purchase',
      context: 'Saved',
    };
    const segments: LegalSegment[] = [
      { kind: 'text', text: 'First line.\n(a) First; section ' },
      reference,
      { kind: 'text', text: '(b) applies. (b) Second. (c) Third.\nLast line.' },
    ];
    const paragraphs = reviewParagraphs(segments);
    expect(paragraphs).toHaveLength(5);
    expect(
      paragraphs
        .flat()
        .map((part) => part.text)
        .join(''),
    ).toBe(segments.map((part) => part.text).join(''));
    expect(paragraphs.flat().filter((part) => part.kind === 'reference')).toEqual([reference]);
    expect(paragraphs[1].map((part) => part.text).join('')).toContain('3.1(b) applies.');
  });

  it('groups neighboring field subjects without reordering or omitting fields', () => {
    const fields = frpa.sections[0].items[0].fields;
    const groups = groupReviewFields(fields);
    expect(groups.length).toBeGreaterThan(3);
    expect(groups[0].label).toBe('Merchant');
    expect(groups.flatMap((group) => group.fields)).toEqual(fields);
  });

  it('separates source wording from display instructions without rewriting the quoted words', () => {
    const entry = {
      label: 'Funding Provided',
      paragraphs: [
        'Label: Funding Provided',
        'Verbatim: This is how much funding [name of financer] will provide.',
        'Only Prescribed Content: true',
        'Third Column Empty: true',
        'Verbatim: Not prescribed / not recorded',
      ],
    };
    const rows = sourceEntryPresentation(entry);
    expect(rows.find((row) => row.label === 'Source wording')?.text).toBe(
      'This is how much funding [name of financer] will provide.',
    );
    expect(rows.find((row) => row.label === 'Prescribed content only')?.text).toBe('Yes');
    expect(rows.find((row) => row.label === 'Third column')?.text).toBe('Recorded as empty');
    expect(rows.map((row) => row.original)).toEqual(entry.paragraphs);
    expect(rows.at(-1)?.text).toContain('not prescribed / not recorded');
  });

  it('searches the saved sources and processor forms, not the current catalogue', () => {
    const saved = structuredClone(snapshot);
    saved.requirements[0].entries[0].paragraphs = ['Verbatim: Archived-source-only wording.'];
    expect(searchSavedPackage(saved, 'archived-source-only')[0]?.id).toBe(`requirement:${saved.requirements[0].slug}`);
    expect(
      searchSavedPackage(saved, '10 CCR §914').some((result) => result.id === 'requirement:ca-offer-summary'),
    ).toBe(true);
    const provider = buildProviderReviewPackage({
      compiled: compileMcaTemplate(providerFixture()),
      templateId: 'saved',
      revision: 1,
      contact: 'Legal operations',
      processorText: 'Archived-processor-only instruction.',
    });
    expect(searchSavedPackage(provider, 'archived-processor-only')[0]?.documentId).toBe(
      `processor:${provider.externalDocuments[0].id}`,
    );
  });

  it('explains saved calculations and separates provider wording from its citation without inferring missing material', () => {
    const rows = snapshot.requirements.find((requirement) => requirement.slug === 'ca-itemization')!.entries;
    expect(sourceEntryPresentation(rows[3], rows).find((row) => row.label === 'Calculation reference')?.text).toBe(
      'Sum of the preceding amounts',
    );
    expect(sourceEntryPresentation(rows[5], rows).find((row) => row.label === 'Calculation reference')?.text).toBe(
      'Amount Provided to You or on Your Behalf − Prepaid Finance Charges',
    );
    const custom = {
      label: 'Example',
      paragraphs: [
        'Provider Drafted: Citation: Saved authority; Text: Exact provider words.',
        'Unknown future key: Retain these words.',
        'Reference: Kind: unrecognized',
      ],
    };
    const display = sourceEntryPresentation(custom);
    expect(display[0]).toMatchObject({
      label: 'Provider-authored wording',
      text: 'Exact provider words.',
      citation: 'Saved authority',
    });
    expect(display[1].text).toBe('Retain these words.');
    expect(display[1].technical).toBe(false);
    expect(display[2].text).toContain('saved specification');
    expect(display.map((row) => row.original)).toEqual(custom.paragraphs);
  });

  it('labels metadata values without substituting words in ordinary descriptions', () => {
    expect(readableReviewMetadata('concurrentPositions: false')).toBe('concurrent positions: No');
    expect(readableReviewMetadata('guarantyScope: limited-conduct')).toBe('guaranty scope: limited conduct');
    expect(readableReviewMetadata('A true-sale review considers false statements.')).toBe(
      'A true-sale review considers false statements.',
    );
  });
});
