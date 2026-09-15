import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { LeaseDocument } from './derive-documents';
import { amendsProblem, governingDocumentGaps, structureGoverningDocuments } from './governing-structure';

/**
 * "These lists look really overwhelming — even I can't tell you which was for
 * what." The repository owner on the pilot receipt, 2026-09-15: sixteen legal
 * titles in one numbered run, nine of them "… Amendment to the Amended and
 * Restated Master Declaration", and two of them from a different body (the
 * CDD) printed as the association's.
 *
 * So documents are grouped by who issued them, each carries a description of
 * what it covers, and an amendment sits under the document it amends.
 */

const doc = (id: string, over: Partial<LeaseDocument> = {}): LeaseDocument => ({
  id,
  kind: 'hoa-governing',
  label: id,
  reference: '',
  documentDate: '',
  pageCount: null,
  issuer: 'association',
  description: `what ${id} covers`,
  amendsDocumentId: null,
  ...over,
});

const NAMES = { association: 'Example Master Association', cdd: 'Example Community Development District' };

const shape = (groups: ReturnType<typeof structureGoverningDocuments>) =>
  groups.map((group) => ({
    heading: group.heading,
    entries: group.entries.map(
      (entry) => `${entry.number} ${entry.document.id}${entry.depth === 1 ? ' (nested)' : ''}`,
    ),
  }));

describe('structureGoverningDocuments', () => {
  it('groups by issuer — association, then CDD, then other — under the names on the property', () => {
    const groups = structureGoverningDocuments(
      [
        doc('resolution', { issuer: 'cdd' }),
        doc('declaration'),
        doc('parking-map', { issuer: 'other' }),
        doc('guidelines'),
      ],
      NAMES,
    );

    expect(shape(groups)).toEqual([
      { heading: 'Example Master Association', entries: ['1 declaration', '2 guidelines'] },
      { heading: 'Example Community Development District', entries: ['3 resolution'] },
      { heading: 'Other documents', entries: ['4 parking-map'] },
    ]);
  });

  it('nests each amendment under what it amends, lettered in upload order', () => {
    const groups = structureGoverningDocuments(
      [
        doc('declaration'),
        doc('first-amendment', { amendsDocumentId: 'declaration' }),
        doc('guidelines'),
        doc('second-amendment', { amendsDocumentId: 'declaration' }),
      ],
      NAMES,
    );

    expect(shape(groups)[0].entries).toEqual([
      '1 declaration',
      '1a first-amendment (nested)',
      '1b second-amendment (nested)',
      '2 guidelines',
    ]);
  });

  // One level only: an amendment to an amendment still belongs to the declaration.
  it('nests an amendment of an amendment under the original document', () => {
    const groups = structureGoverningDocuments(
      [
        doc('declaration'),
        doc('amendment', { amendsDocumentId: 'declaration' }),
        doc('correction', { amendsDocumentId: 'amendment' }),
      ],
      NAMES,
    );

    expect(shape(groups)[0].entries).toEqual(['1 declaration', '1a amendment (nested)', '1b correction (nested)']);
  });

  // An amendment is listed with what it amends, whatever issuer was chosen for it.
  it('keeps an amendment with its parent even when their issuers differ', () => {
    const groups = structureGoverningDocuments(
      [doc('declaration'), doc('amendment', { issuer: 'cdd', amendsDocumentId: 'declaration' })],
      NAMES,
    );

    expect(shape(groups)).toEqual([
      { heading: 'Example Master Association', entries: ['1 declaration', '1a amendment (nested)'] },
    ]);
  });

  it('lists a document at the top level when what it amends is missing, itself, or a loop', () => {
    const groups = structureGoverningDocuments(
      [
        doc('orphan', { amendsDocumentId: 'archived-or-deleted' }),
        doc('self', { amendsDocumentId: 'self' }),
        doc('loop-a', { amendsDocumentId: 'loop-b' }),
        doc('loop-b', { amendsDocumentId: 'loop-a' }),
      ],
      NAMES,
    );

    expect(shape(groups)[0].entries).toEqual(['1 orphan', '2 self', '3 loop-a', '4 loop-b']);
  });

  it('falls back to a plain heading when the property has no name for the body', () => {
    expect(structureGoverningDocuments([doc('resolution', { issuer: 'cdd' })], {})[0].heading).toBe(
      'Community Development District',
    );
    expect(structureGoverningDocuments([doc('declaration')], {})[0].heading).toBe('Homeowners association');
  });

  it('ignores anything that is not a governing document', () => {
    expect(structureGoverningDocuments([doc('photos', { kind: 'move-in-report' })], NAMES)).toEqual([]);
  });
});

/*
  Blocking, at the owner's instruction: a receipt that lists a document with no
  issuer or no description is the overwhelming list this replaced.
*/
describe('governingDocumentGaps', () => {
  it('names each governing document missing its issuer or its description', () => {
    expect(
      governingDocumentGaps([
        doc('complete'),
        doc('no-issuer', { issuer: null }),
        doc('no-description', { description: '   ' }),
        doc('photos', { kind: 'move-in-report', issuer: null, description: null }),
      ]),
    ).toEqual([
      { id: 'no-issuer', label: 'no-issuer', missing: ['who issued it'] },
      { id: 'no-description', label: 'no-description', missing: ['what it covers'] },
    ]);
  });
});

/**
 * The gate. `prepare` is the only thing between a draft and an envelope, so the
 * gaps are refused there, not only reported by `validate`. Source-level because
 * the router needs a database.
 */
describe('the lease builder refuses a receipt with undescribed documents', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

  it('words the gaps through governingDocumentGaps', () => {
    const helper = router.slice(router.indexOf('const describeDocumentGaps = '));

    expect(helper.slice(0, 300)).toContain('governingDocumentGaps(');
  });

  it('blocks preparing an envelope on them', () => {
    const prepare = router.slice(router.indexOf('prepare: authenticatedProcedure'));

    expect(prepare.indexOf('describeDocumentGaps(')).toBeGreaterThan(-1);
    expect(prepare.indexOf('describeDocumentGaps(')).toBeLessThan(prepare.indexOf('await prepareEnvelopeFromMatter('));
  });

  it('reports them on the review step, and counts them as blocking', () => {
    const validate = router.slice(
      router.indexOf('validate: authenticatedProcedure'),
      router.indexOf('prepare: authenticatedProcedure'),
    );

    expect(validate).toContain('describeDocumentGaps(');
    expect(validate).toMatch(/documentFindings\.length/);
  });
});

/*
  The editor offers "Amends" as a choice among the other documents; the server
  still refuses what would hide a document or make the list loop.
*/
describe('amendsProblem', () => {
  const siblings = [doc('declaration'), doc('amendment', { amendsDocumentId: 'declaration' }), doc('guidelines')];

  it('accepts another governing document from the same set, or clearing the link', () => {
    expect(amendsProblem('guidelines', 'declaration', siblings)).toBeNull();
    expect(amendsProblem('amendment', null, siblings)).toBeNull();
  });

  it('refuses the document itself, one outside the set, and a loop', () => {
    expect(amendsProblem('declaration', 'declaration', siblings)).toMatch(/cannot amend itself/);
    expect(amendsProblem('declaration', 'someone-elses', siblings)).toMatch(/same property/);
    expect(amendsProblem('declaration', 'amendment', siblings)).toMatch(/amends this one/);
  });
});

describe('the documents.update procedure', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');
  const start = router.indexOf('Rename, re-reference, re-date or reorder');
  const update = router.slice(start, router.indexOf('remove: authenticatedProcedure', start));

  it('accepts the issuer, the description and what it amends — and checks the last', () => {
    expect(update).toMatch(/issuer: z\.enum\(\['association', 'cdd', 'other'\]\)/);
    expect(update).toMatch(/description: z\.string\(\)\.max\(\d+\)/);
    expect(update).toContain('amendsDocumentId');
    expect(update).toContain('amendsProblem(');
  });
});

/**
 * Where the landlord supplies all of this — the Association documents step —
 * and where they learn what is still missing. Source-level, as the other lease
 * route checks are.
 */
describe('the lease builder screens', () => {
  const read = (path: string) => readFileSync(new URL(`../../../../apps/remix/app/${path}`, import.meta.url), 'utf8');
  const editor = read('components/general/lease/governing-document-editor.tsx');
  const route = read('routes/_authenticated+/t.$teamUrl+/leases.$id.tsx');

  it('asks who issued each governing document, what it covers, and what it amends', () => {
    expect(editor).toContain('Issued by');
    expect(editor).toContain('What it covers');
    expect(editor).toContain('Amends');
    expect(editor).toMatch(/save\(document\.id, \{ issuer:/);
    expect(editor).toMatch(/save\(document\.id, \{ description:/);
    expect(editor).toMatch(/save\(document\.id, \{ amendsDocumentId:/);
  });

  it('names the association and the district as the property records them', () => {
    expect(route).toMatch(/<GoverningDocumentEditor[^>]*names=/);
  });

  it('shows what is blocking on the review step', () => {
    expect(route).toContain('documentFindings');
  });
});
