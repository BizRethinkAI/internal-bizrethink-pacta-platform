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

/**
 * The page was built to the design, not merely to the data shape.
 *
 * The first cut had the right information architecture — clauses in the page,
 * comments anchored to them — and none of the design: the app's stock green
 * Alert, no rail, no serif, and a hidden-on-hover control that still reserved
 * its box so every clause carried a band of dead space beneath it.
 *
 * Source-level because it is rendering, and because the failure was reporting
 * a page as finished when half of it had not been done.
 */
describe('the reviewer page carries its design', () => {
  const page = readFileSync(
    new URL('../../../../apps/remix/app/routes/_recipient+/lease-review.$token.tsx', import.meta.url),
    'utf8',
  );

  const code = () => page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  /*
    THE ONE THAT MATTERS. The design first shipped as a `<style>` element with
    scoped custom properties; this app serves a NONCED `style-src-elem` CSP, so
    the browser dropped it without a word. The markup rendered, the class names
    existed, and every one of them was inert — the page looked untouched while
    the diff said otherwise.
  */
  it('never styles itself through an unnonced style element', () => {
    expect(code()).not.toContain('dangerouslySetInnerHTML');
    expect(code()).not.toMatch(/<style/);
  });

  it('sets the lease in a serif, so a lease reads as a document', () => {
    expect(code()).toMatch(/font-family:'Iowan_Old_Style'/);
  });

  it('carries a rail, since forty-three clauses is a long page', () => {
    expect(code()).toContain('Where you are');
    expect(code()).toContain('Jump to');
    expect(code()).toMatch(/lg:sticky/);
  });

  /*
    The action colour appears where the reader must act and nowhere else. A
    page that shouts everywhere has no way left to say "this one".
  */
  it('reserves one colour for the reader’s own outstanding work', () => {
    expect(code()).toContain('#a2560c');
    expect(code()).toMatch(/ACTION_PANEL/);
  });

  it('writes dark variants out, since the app’s dark: is a class strategy', () => {
    expect(code()).toMatch(/dark:text-\[#/);
  });

  /*
    `opacity-0` hides a control without releasing its box. Every clause then
    carries a band of empty space and the page reads as half-loaded.
  */
  /*
    A BARE ANCHOR ONLY SCROLLS WHEN THE HASH CHANGES.

    Measured in the browser: hash `#section-5`, scrollY 0, click section 5 —
    scrollY still 0. Once a reader has visited a section, clicking it again is
    a no-op, and because this rail is sticky and always on screen, clicking the
    same entry after scrolling away is the most natural thing to do.
  */
  it('scrolls the section into view itself rather than trusting the hash', () => {
    expect(code()).toMatch(/onClick=\{\(event\) => jumpTo\(event, section\.number\)\}/);
    expect(code()).toContain('scrollIntoView');
    // replaceState, not pushState: a jump within one document is not a place
    // in the reader's history, and pushState risks a router location change.
    expect(code()).toContain('history.replaceState');
  });

  /*
    ONE COLOUR FOR ONE MEANING. Amber marks work the reader still owes; red
    means something went wrong. The required asterisk measured rgb(255,0,0)
    while the rail dot beside it was amber — two colours saying the same thing.
  */
  it('never uses the error colour for work the reader merely owes', () => {
    expect(code()).not.toContain('text-destructive');
  });

  it('keeps the error colour for things that actually failed', () => {
    // A dead link and a failed submission are errors, and stay red.
    expect(code().match(/variant="destructive"/g) ?? []).toHaveLength(2);
  });

  it('does not hide the comment control behind opacity', () => {
    expect(code()).not.toContain('opacity-0');
  });
});

/*
  A TEXT BOX LOOKS LIKE A TEXT BOX. The two primitives disagree about their own
  background: Input carries `bg-background`, Textarea carries `bg-transparent`.
  On a white card nobody notices. Every textarea on this page sits on a tinted
  panel — the amber "only you can answer" block, the muted comment composer — so
  the tint showed straight through and the boxes read as part of the panel while
  the single-line field beside them was crisp white.

  Both primitives are upstream, so the background is asserted at our call sites.
*/
describe('every text box on the reviewer page reads as a text box', () => {
  const page = readFileSync(
    new URL('../../../../apps/remix/app/routes/_recipient+/lease-review.$token.tsx', import.meta.url),
    'utf8',
  );

  const textareas = page.match(/<Textarea[\s\S]*?\/>/g) ?? [];

  it('renders a textarea for the answers and one for the comment', () => {
    expect(textareas).toHaveLength(2);
  });

  it('gives each textarea an opaque background of its own', () => {
    for (const tag of textareas) {
      expect(tag).toMatch(/bg-background/);
    }
  });
});
