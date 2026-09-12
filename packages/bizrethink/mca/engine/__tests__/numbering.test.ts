import { describe, expect, it } from 'vitest';

import { mcaClauseFingerprint, mcaLibraryFingerprint } from '../../clauses/approval';
import { documentLines } from '../../clauses/documents';
import { LOMBARD_FACTS, type McaFacts } from '../../clauses/facts';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../../clauses/library';
import type { McaClause } from '../../clauses/types';
import { selectClauses } from '../select-clauses';

const profiles: McaFacts[] = [
  LOMBARD_FACTS,
  { ...LOMBARD_FACTS, equipment: 'none', renewalModel: 'none', brokerChannel: false },
  { ...LOMBARD_FACTS, guarantyScope: 'none' },
  { ...LOMBARD_FACTS, guarantyScope: 'full-performance', disputeResolution: 'arbitration' },
  { ...LOMBARD_FACTS, renewalModel: 'carry', concurrentPositions: true, recipientStates: ['US-TX'] },
];

// This deliberately detects the real old spellings, including the twins' capitals
// and the ISO's letters. It must not mistake Connecticut Section 36a-869 for an
// internal citation. Contract references become identity tokens; statutes stay literal.
const storedCitation = /\bSections?\s+(?:\d+|[A-Z])(?:\.\d+)*(?![\w-]|\.\d)/i;

describe('numbering belongs to a selected MCA document (ADR 0011)', () => {
  it('stores no printed number anywhere in the corpus', () => {
    expect(ALL_MCA_CLAUSES.filter((clause) => Object.hasOwn(clause, 'number')).map((clause) => clause.slug)).toEqual(
      [],
    );
  });

  it('stores internal cross-references by identity and still detects the original broken spellings', () => {
    for (const text of [
      'as Section 4.13 provides',
      'Sections 2 and 3',
      'SECTION 3.18',
      'Section A.4',
      'identified in Section 1.',
    ]) {
      expect(storedCitation.test(text), text).toBe(true);
    }
    expect(storedCitation.test('Connecticut General Statutes Section 36a-869')).toBe(false);
    expect(ALL_MCA_CLAUSES.filter((clause) => storedCitation.test(clause.body)).map((clause) => clause.slug)).toEqual(
      [],
    );
  });

  it('classifies the four funding notes explicitly as explainers', () => {
    expect(
      libraryFor('frpa')
        .filter((clause) => clause.kind === 'explainer')
        .map((clause) => clause.slug)
        .sort(),
    ).toEqual([
      'frpa.equipment-cost-exclusivity',
      'frpa.equipment-cost-explainer',
      'frpa.holdback-explainer',
      'frpa.rollover-method-election',
    ]);
  });

  it('models the unnumbered funding grid with every source widget, rather than losing it between clauses', () => {
    const grid = libraryFor('frpa').find((clause) => clause.slug === 'frpa.merchant-and-funding-information');
    const source = documentLines('Lombard_FRPA_v4.txt').find((line) =>
      line.startsWith('[TABLE] 1.1 MERCHANT INFORMATION'),
    );
    expect(source).toBeDefined();
    const widgets = source?.match(/«\d+»/g) ?? [];
    expect(widgets).toHaveLength(30);
    expect(grid?.kind).toBe('field-group');
    expect(grid?.fields?.map((field) => field.widget).sort()).toEqual(widgets.sort());
  });

  it('lapses approval when classification, selection, fields, or a reference target changes', () => {
    const original = libraryFor('frpa')[0];
    for (const delta of [
      { kind: 'explainer' },
      { includeWhen: (facts: McaFacts) => facts.brokerChannel },
      { fields: [{ label: 'A changed field', widget: '«0»', kind: 'text', required: true }] },
      { referenceId: 'a-different-obligation' },
      { unnumberedReason: 'A different structural role.' },
    ]) {
      expect(mcaClauseFingerprint({ ...original, ...delta } as McaClause)).not.toBe(mcaClauseFingerprint(original));
    }
  });

  it('marks a review link stale when ordering changes its citations, while retaining clause approval', () => {
    const first = libraryFor('frpa').find((clause) => clause.slug === 'frpa.definitions') as McaClause;
    const second = { ...first, slug: 'test.second', sortKey: first.sortKey + 1 };
    const moved = { ...first, sortKey: second.sortKey + 1 };
    expect(mcaClauseFingerprint(first)).toBe(mcaClauseFingerprint(moved));
    expect(mcaLibraryFingerprint([first, second])).not.toBe(mcaLibraryFingerprint([moved, second]));
  });

  it('numbers every selected record except a deliberately unnumbered one', () => {
    for (const instrument of MCA_INSTRUMENTS) {
      for (const facts of profiles) {
        const { selected } = selectClauses({ facts, instrument });
        for (const clause of selected) {
          const reason = Reflect.get(clause, 'unnumberedReason');
          expect(clause.number !== '' || (typeof reason === 'string' && reason.trim().length > 0), clause.slug).toBe(
            true,
          );
        }
      }
    }
  });

  it('emits consecutive sections and consecutive clauses after selection, across every instrument', () => {
    for (const instrument of MCA_INSTRUMENTS) {
      for (const facts of profiles) {
        const { selected } = selectClauses({ facts, instrument });
        let section = '';
        let sectionIndex = 0;
        let clauseIndex = 0;
        for (const clause of selected.filter((entry) => entry.number !== '')) {
          if (clause.section !== section) {
            section = clause.section;
            sectionIndex += 1;
            clauseIndex = 0;
          }
          clauseIndex += 1;
          expect(clause.number, `${instrument}: ${clause.slug}`).toBe(`${sectionIndex}.${clauseIndex}`);
        }
      }
    }
  });

  it('gives the granting clause, definitions, and interest provision their own citations', () => {
    const { selected } = selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa' });
    for (const slug of ['frpa.granting-clause', 'frpa.definitions', 'frpa.prejudgment-and-postjudgment-interest']) {
      expect(selected.find((clause) => clause.slug === slug)?.number, slug).toMatch(/^\d+\.\d+$/);
    }
  });

  it('keeps a citation attached to its intended clause when another clause is inserted or excluded', () => {
    const anchor = libraryFor('frpa').find((clause) => clause.slug === 'frpa.definitions');
    if (!anchor) {
      throw new Error('The real definitions clause is required for this regression.');
    }
    const first: McaClause = { ...anchor, slug: 'test.first', sortKey: 1, body: 'First provision.' };
    const target: McaClause = { ...anchor, slug: 'test.target', sortKey: 2, body: 'The intended obligation.' };
    const citing: McaClause = {
      ...anchor,
      slug: 'test.citing',
      sortKey: 3,
      body: 'Only Section [[clause:test.target]] governs.',
    };
    const inserted: McaClause = {
      ...anchor,
      slug: 'test.inserted',
      sortKey: 1.5,
      body: 'A different obligation.',
      includeWhen: (facts) => facts.brokerChannel,
    };
    const library = [citing, target, inserted, first];
    const render = (brokerChannel: boolean) =>
      selectClauses({ facts: { ...LOMBARD_FACTS, brokerChannel }, instrument: 'frpa', library }).selected;
    const without = render(false);
    const withInsertion = render(true);
    expect(without.find((clause) => clause.slug === target.slug)?.number).toBe('1.2');
    expect(withInsertion.find((clause) => clause.slug === target.slug)?.number).toBe('1.3');
    expect(without.find((clause) => clause.slug === citing.slug)?.body).toBe('Only Section 1.2 governs.');
    expect(withInsertion.find((clause) => clause.slug === citing.slug)?.body).toBe('Only Section 1.3 governs.');
    expect(citing.body).toBe('Only Section [[clause:test.target]] governs.');
  });

  it('refuses to assemble an unresolved reference instead of printing a plausible wrong number', () => {
    const original = libraryFor('frpa').find((clause) => clause.slug === 'frpa.definitions') as McaClause;
    const citing = { ...original, body: 'Only Section [[clause:missing.target]] governs.' };
    expect(() => selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa', library: [citing] })).toThrow(/reference/i);
  });
  it('refuses malformed reference tokens rather than leaking them into a review', () => {
    const original = libraryFor('frpa')[0];
    const malformed = { ...original, body: 'Only [[clasue:frpa.definitions]] governs.' };
    expect(() => selectClauses({ instrument: 'frpa', facts: LOMBARD_FACTS, library: [malformed] })).toThrow(
      /reference/,
    );
  });

  it('resolves cross-instrument section citations in the same fact context', () => {
    const original = libraryFor('iso-pra')[0];
    const citing = { ...original, body: 'The FRPA limits remedies in Section [[section:frpa#default]].' };
    const section = selectClauses({ instrument: 'frpa', facts: LOMBARD_FACTS }).selected.find(
      (clause) => clause.section === 'default',
    )?.sectionNumber;
    expect(selectClauses({ instrument: 'iso-pra', facts: LOMBARD_FACTS, library: [citing] }).selected[0].body).toBe(
      `The FRPA limits remedies in Section ${section}.`,
    );
  });

  it('stales the ISO review when the FRPA moves a cited provision', () => {
    const iso = libraryFor('iso-pra');
    const prior = mcaLibraryFingerprint(iso);
    const cancellation = libraryFor('frpa').find((clause) => clause.slug === 'frpa.right-to-cancel-4-14') as McaClause;
    const sortKey = cancellation.sortKey;
    try {
      cancellation.sortKey = 0;
      expect(mcaLibraryFingerprint(iso)).not.toBe(prior);
    } finally {
      cancellation.sortKey = sortKey;
    }
  });
});
