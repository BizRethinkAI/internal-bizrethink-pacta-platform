import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import type { RenderedClause } from '../render/lease-document';
import { readableSlugs, toReadableSections } from '../review/readable-lease';

/**
 * A reviewer was given a button that opened the signing PDF in another tab, and
 * a free-text box in which to type a clause name from memory. Nothing tied a
 * comment to a clause.
 */

const clause = (slug: string, section: string, number: string, heading: string, text: string): RenderedClause =>
  ({ clause: { slug, section, heading }, number, text }) as RenderedClause;

const CLAUSES = [
  clause('rent.base', 'rent', '4.1', 'Rent', 'Tenant shall pay rent of $6,900.00 per month.'),
  clause('rent.late-fee-flat', 'rent', '4.2', 'Late Payment', 'A late fee of $150.00 is payable.'),
  clause('deposit.held', 'deposit', '5.1', 'Security Deposit', 'A deposit of $6,900.00 is payable.'),
];

describe('toReadableSections', () => {
  it('groups clauses under the section they belong to', () => {
    const sections = toReadableSections(CLAUSES);

    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBe('Rent and Charges');
    expect(sections[0].clauses.map((c) => c.number)).toEqual(['4.1', '4.2']);
  });

  it('carries the slug, so a comment can name the clause without anybody typing it', () => {
    expect(readableSlugs(toReadableSections(CLAUSES))).toEqual(['rent.base', 'rent.late-fee-flat', 'deposit.held']);
  });

  /*
    A tenant has no business seeing {{SIGNATURE, r2, width=160, height=44}} in
    the middle of a document they are being asked to comment on. It is furniture
    for the envelope builder, and to a reader it looks like a defect.
  */
  it('strips the signing tokens', () => {
    const [section] = toReadableSections([
      clause(
        'general.execution',
        'general',
        '13.5',
        'Execution',
        'Signed: {{SIGNATURE, r1, width=160, height=44}} on {{DATE, r1}}.',
      ),
    ]);

    expect(section.clauses[0].text).not.toMatch(/\{\{/);
    expect(section.clauses[0].text).toContain('Signed:');
  });

  it('does not leave a double space where a token was', () => {
    const [section] = toReadableSections([clause('x', 'rent', '4.9', 'X', 'Pay {{amount}} to the landlord.')]);

    expect(section.clauses[0].text).not.toMatch(/ {2}/);
  });

  it('handles a section with a bare number', () => {
    const sections = toReadableSections([clause('parties.recital', 'parties', '1', 'Parties', 'Between A and B.')]);

    expect(sections[0].number).toBe('1');
    expect(sections[0].name).toBe('Parties');
  });
});

/**
 * The reviewer reads the same document the landlord previews.
 *
 * Both are built from `buildLeaseDocuments`, so a clause the reader is shown is
 * a clause the signer signs. If the reviewer's copy were assembled separately
 * it could drift, and a reviewer commenting on a document nobody is signing is
 * worse than no review — it produces a record of approval that was never given.
 */
describe('the reviewer sees the real lease', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

  it('builds the reviewer copy from buildLeaseDocuments', () => {
    const open = router.slice(router.indexOf('open: procedure'), router.indexOf('submit: procedure'));

    expect(open).toContain('toReadableSections');
    expect(open).toContain('buildLeaseDocuments');
  });

  it('hydrates it through the shared mapping rather than unpacking the row', () => {
    const open = router.slice(router.indexOf('open: procedure'), router.indexOf('submit: procedure'));

    expect(open).toContain('hydrateMatter(');
  });

  /*
    Asserted against the CODE with its comments stripped. The prose in this file
    and in the route quotes the old copy in order to explain why it went, and an
    assertion that reads the explanation as the thing itself would fail forever.
  */
  const routeCode = () => {
    const raw = readFileSync(
      new URL('../../../../apps/remix/app/routes/_recipient+/lease-review.$token.tsx', import.meta.url),
      'utf8',
    );

    return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  };

  it('renders the clauses in the page rather than linking out to read them', () => {
    expect(routeCode()).toContain('sections.map');
    expect(routeCode()).not.toContain('Open the lease');
  });

  /* And a comment must carry its clause rather than have one typed into it. */
  it('never asks the reviewer to name a clause themselves', () => {
    expect(routeCode()).not.toMatch(/Which clause/i);
    expect(routeCode()).toContain('addDraft(clause.slug)');
  });
});
