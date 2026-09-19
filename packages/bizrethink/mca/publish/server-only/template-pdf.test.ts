import { PDFDocument } from '@cantoo/pdf-lib';
import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { PDF } from '@libpdf/core';
import { describe, expect, it, vi } from 'vitest';
import type { McaInstrument } from '../../clauses/instruments';
import { entityFixture } from '../../entities/entity.fixture';
import { compileMcaTemplate } from '../../templates/compile';
import { fieldPlanFor } from '../field-plan';
import { injectMcaWidgets } from './acroform';
import { renderMcaTemplatePdf, templatePlacement } from './template-pdf';

/**
 * The renderer produces a TEMPLATE. ADR 0025.
 *
 * Not a filled deal with a second mode beside it — the template is the artifact
 * this vertical exists to make, and a deal never enters here. So the page
 * carries a `«name»` where a value belongs, a native `{{SIGNATURE, rN}}` where a
 * party signs, and the funder's own facts set in type because the builder knows
 * them at publication.
 */

// These tests render a real 37-page PDF and read it back through two different
// PDF libraries. That is legitimately slower than the 5s default, and shaving
// assertions to fit a budget would be the wrong trade.
vi.setConfig({ testTimeout: 60_000 });

const snapshot = (instrument: McaInstrument) => compileMcaTemplate(entityFixture(), instrument);

/**
 * Render each document once per file, not once per assertion.
 *
 * The FRPA is 37 pages and react-pdf is not fast. Rendering it eight times over
 * took this file past CI's 5s per-test budget while passing locally, which is
 * the least interesting way for a test to be red.
 */
const rendered = new Map<string, Promise<Buffer>>();

const templateOf = (instrument: Parameters<typeof renderMcaTemplatePdf>[1]): Promise<Buffer> => {
  const existing = rendered.get(instrument);

  if (existing) {
    return existing;
  }

  const pending = renderMcaTemplatePdf(snapshot(instrument), instrument, 3);

  rendered.set(instrument, pending);

  return pending;
};

/**
 * Read the page with `@libpdf/core`, NOT with pdfjs.
 *
 * Not interchangeable, and the difference is the whole point: `findText` here is
 * the same call `injectMcaWidgets` uses to locate a marker and upstream's
 * `extractPlaceholdersFromPDF` uses to locate a signer token. A test that
 * asserted with pdfjs would be checking a reader nothing in this pipeline uses
 * — and would have passed while the sans face was rendering markers that
 * `findText` reads back scrambled.
 */
const textOf = async (pdf: Buffer): Promise<string> => {
  const doc = await PDF.load(new Uint8Array(pdf));

  return doc
    .getPages()
    .map((page) =>
      page
        .extractText()
        .lines.map((line) => line.text)
        .join(' '),
    )
    .join('\n');
};

/** Every occurrence of a pattern, as the injector and upstream would find it. */
const findAll = async (pdf: Buffer, pattern: RegExp): Promise<string[]> => {
  const doc = await PDF.load(new Uint8Array(pdf));

  return doc.getPages().flatMap((page) => page.findText(pattern).map((match) => match.text));
};

describe('what a published template carries', () => {
  it('marks every field the plan says it can fill', async () => {
    const rendered = await templateOf('frpa');
    const found = new Set(await findAll(rendered, /«[a-z][a-z0-9_]*»/g));
    const plan = fieldPlanFor('frpa');

    const missing = plan.marked.filter((field) => !found.has(`«${field.widget}»`));

    expect(missing.map((field) => field.widget)).toEqual([]);
  });

  /**
   * The marker has to survive the font, not merely be written. An embedded
   * subset that `findText` reads back scrambled produces a page full of
   * plausible-looking markers that the injector cannot place — which is exactly
   * what the sans face did here before this was caught.
   */
  it('reads every marker back intact, spelled as the contract spells it', async () => {
    const rendered = await templateOf('frpa');
    const names = (await findAll(rendered, /«[a-z][a-z0-9_]*»/g)).map((marker) => marker.slice(1, -1));
    const known = new Set(fieldPlanFor('frpa').expect);

    expect([...new Set(names)].filter((name) => !known.has(name))).toEqual([]);
  });

  /**
   * `INTERNAL DRAFT` on every page, `[to complete]` in the fields, printed rules
   * where signatures go — the whole of it belongs to a review copy, and a
   * merchant must never be handed one.
   */
  it('carries none of the review copy', async () => {
    const text = await textOf(await templateOf('frpa'));

    expect(text).not.toMatch(/INTERNAL DRAFT/i);
    expect(text).not.toContain('[to complete]');
    expect(text).not.toContain('[not designated]');
    expect(text).not.toMatch(/Prepared for review/i);
  });

  /**
   * The funder's own facts are known when the template is published, so they
   * are set in type. A widget for them would need a value the caller sends
   * per deal for something that never changes between deals.
   */
  it('sets the funder’s own facts in type, with no widget for them', async () => {
    const text = await textOf(await templateOf('frpa'));
    const entity = entityFixture();

    expect(text).toContain(entity.identity.legalName);
    expect(text).not.toContain('«provider_address»');
    /*
      `processor_name` IS a widget now, unlike the funder's own address beside
      it. ADR 0026 §6: which processor a merchant uses is a fact about the deal,
      so the caller sends it — this asserts the split rather than the old
      assumption that everything provider-shaped is printed.
    */
    expect(text).toContain('«processor_name»');
  });

  it('prints a signer placeholder for each party, numbered in signing order', async () => {
    const rendered = await templateOf('frpa');
    const tokens = await findAll(rendered, /\{\{(SIGNATURE|DATE), r\d\}\}/g);

    expect([...tokens].sort()).toEqual([
      '{{DATE, r1}}',
      '{{DATE, r2}}',
      '{{DATE, r3}}',
      '{{SIGNATURE, r1}}',
      '{{SIGNATURE, r2}}',
      '{{SIGNATURE, r3}}',
    ]);
  });

  /**
   * A widget cannot be signed — it is sender-writable only — so a signature
   * rendered as a marker would ship permanently blank. The two syntaxes are
   * disjoint by construction, and this checks the renderer keeps them so.
   */
  it('never marks a widget where a party signs', async () => {
    const text = await textOf(await templateOf('frpa'));

    expect(text).not.toMatch(/«[a-z_]*signature[a-z_]*»/);
    expect(text).not.toMatch(/«[a-z_]*sign_date[a-z_]*»/);
  });
});

/**
 * THE ASSERTION THE REST OF THIS WORK EXISTS FOR.
 *
 * Render, inject, extract — the whole chain, ending at upstream's own
 * extractor. Each piece has its own tests; only this says they compose, and
 * composing is the claim that matters, because a template that fails anywhere
 * along here is a document a merchant signs with holes in it.
 */
describe('the rendered template survives the whole publication chain', () => {
  it('injects exactly the widgets the plan named, and no others', async () => {
    const plan = fieldPlanFor('frpa');
    const rendered = await templateOf('frpa');

    const injected = await injectMcaWidgets(rendered, { expect: plan.expect });
    const fields = (await PDFDocument.load(injected)).getForm().getFields();

    expect(fields.map((field) => field.getName()).sort()).toEqual([...plan.expect].sort());
  });

  it('still hands Documenso every signer field it must make at upload', async () => {
    const plan = fieldPlanFor('frpa');
    const injected = await injectMcaWidgets(await templateOf('frpa'), {
      expect: plan.expect,
    });

    const extracted = await extractPlaceholdersFromPDF(injected);
    const byRecipient = extracted.reduce<Record<string, string[]>>((tally, placeholder) => {
      tally[placeholder.recipient] = [...(tally[placeholder.recipient] ?? []), placeholder.fieldAndMeta.type].sort();
      return tally;
    }, {});

    expect(byRecipient).toEqual({
      r1: ['DATE', 'SIGNATURE'],
      r2: ['DATE', 'SIGNATURE'],
      r3: ['DATE', 'SIGNATURE'],
    });

    for (const placeholder of extracted) {
      expect(placeholder.width).toBeGreaterThan(0);
      expect(placeholder.height).toBeGreaterThan(0);
    }
  });

  /**
   * One name, several widgets, one value from the caller — the property #289
   * measured on the live FRPA, now produced rather than only pinned.
   */
  it('gives a fact said twice one field with two widgets', async () => {
    const plan = fieldPlanFor('frpa');
    const injected = await injectMcaWidgets(await templateOf('frpa'), {
      expect: plan.expect,
    });

    const repeated = (await PDFDocument.load(injected))
      .getForm()
      .getFields()
      .filter((field) => field.acroField.getWidgets().length > 1);

    expect(repeated.length).toBeGreaterThan(0);
  });
});

/**
 * WHAT IS NOT PLACED YET, counted rather than hidden.
 *
 * A field the template can neither mark nor print is a gap in the document, and
 * a renderer that silently dropped it would make the gap invisible at exactly
 * the moment it becomes expensive. `templatePlacement` reports them; the number
 * is pinned so it moves deliberately.
 */
describe('the fields this renderer cannot place yet', () => {
  it('reports them rather than dropping them', () => {
    const placement = templatePlacement(snapshot('frpa'), 'frpa');

    expect(placement.unplaced.length).toBeGreaterThan(0);
    expect(placement.marked.length).toBe(fieldPlanFor('frpa').marked.length);
  });

  it('never counts a signer field as unplaced', () => {
    const placement = templatePlacement(snapshot('frpa'), 'frpa');

    expect(placement.unplaced.filter((binding) => /\.(signature|signedDate)$/.test(binding))).toEqual([]);
  });

  /**
   * A TEMPLATE IS ONE DOCUMENT (ADR 0026), so a snapshot and an instrument can
   * now disagree. Placing nothing is the wrong answer to that: it reads
   * identically to a document with no fields, and the gap this whole describe
   * block exists to count would be reported as zero.
   */
  it('refuses a snapshot compiled for a different document rather than placing nothing', () => {
    expect(() => templatePlacement(snapshot('frpa'), 'equipment-lease')).toThrow(/compiles no equipment-lease/);
  });
});

/**
 * THE COMPLETED APPENDIX A — #326.
 *
 * `frpa.appendix-a-fees-collectible` renders as ordinary body text and says, in
 * one sentence:
 *
 *   > A fee left blank, or not identified in the completed Appendix, is $0.00
 *   > and may not be charged.
 *
 * The clause printed. The Appendix it points at did not. A published FRPA
 * therefore stated the rule and then carried no table, so on the document's own
 * terms every fee the funder had entered was $0.00 and uncollectable. The
 * schedule was collected by the interview, stored on the entity and attached to
 * the document by `compile.ts` — and then read by nothing.
 *
 * Fees ride on the FRPA alone, so the other documents must stay unaffected.
 */
const FEES = [
  {
    basis: 'amount' as const,
    name: 'Origination fee',
    amount: '1250.00',
    payee: 'Example Receipts Inc.',
    purpose: 'Underwriting and preparing this agreement',
    when: 'Deducted from the disbursement at funding',
  },
  {
    basis: 'method' as const,
    name: 'Returned payment fee',
    method: 'The lesser of $35.00 or the amount the bank charges the provider',
    payee: 'Example Receipts Inc.',
    purpose: 'Recovering the cost of a rejected debit',
    when: 'On each returned payment',
  },
];

const withFees = (fees: typeof FEES | []) => {
  const entity = entityFixture();

  return compileMcaTemplate({ ...entity, policy: { ...entity.policy, fees } }, 'frpa');
};

describe('the completed Appendix A', () => {
  it('prints a fee the funder entered as a dollar amount', async () => {
    const text = await textOf(await renderMcaTemplatePdf(withFees(FEES), 'frpa', 3));

    expect(text).toContain('Origination fee');
    expect(text).toContain('1,250.00');
    expect(text).toContain('Example Receipts Inc.');
    expect(text).toContain('Deducted from the disbursement at funding');
  });

  /*
    The either/or is the whole reason `basis` exists. A row shows the amount or
    the method, never both and never an empty column where the other would be —
    a blank in the amount column is exactly what the clause reads as $0.00.
  */
  it('prints a fee stated as a calculation method instead of an amount', async () => {
    const text = await textOf(await renderMcaTemplatePdf(withFees(FEES), 'frpa', 3));

    expect(text).toContain('Returned payment fee');
    expect(text).toContain('The lesser of $35.00 or the amount the bank charges the provider');
  });

  it('prints every column the clause requires the Appendix to identify', async () => {
    const text = await textOf(await renderMcaTemplatePdf(withFees(FEES), 'frpa', 3));

    // name, amount-or-method, payee, purpose, when — the five §-required facts.
    for (const required of [
      'Origination fee',
      '1,250.00',
      'Example Receipts Inc.',
      'Underwriting and preparing this agreement',
      'Deducted from the disbursement at funding',
    ]) {
      expect(text).toContain(required);
    }
  });

  /**
   * AN EMPTY SCHEDULE IS A COMPLETE ANSWER, NOT A MISSING ONE.
   *
   * "This funder charges nothing" is a real state and the commonest one. Left
   * as a blank, a reader has to decide whether the table is empty or unfinished
   * — and the clause already answers that question in the funder's disfavour,
   * so the document should say it outright rather than make it inferable.
   */
  it('says so when the funder charges no fees at all', async () => {
    const text = await textOf(await renderMcaTemplatePdf(withFees([]), 'frpa', 3));

    expect(text).toMatch(/charges no fees|no fees are charged|No fees/i);
  });

  it('does not leave the reader an empty table to interpret', async () => {
    const text = await textOf(await renderMcaTemplatePdf(withFees([]), 'frpa', 3));

    // The column headings belong to a table with rows in it.
    expect(text).not.toContain('Payable to');
  });

  /*
    The table belongs UNDER THE CLAUSE THAT POINTS AT IT. `appendix` already
    carries the heading "Fee Schedule", and a table printed somewhere else on
    the page would be a different document that happened to contain the same
    words. Asserted by order rather than by coordinates, which survives a
    reflow.

    (That fees ride on the FRPA alone is a compile-time fact and is covered in
    `templates/fee-schedule.test.ts`; this fixture's programme runs no other
    document, so asserting it again here would prove nothing.)
  */
  it('prints the table under the Fee Schedule heading, after the clause', async () => {
    const text = await textOf(await renderMcaTemplatePdf(withFees(FEES), 'frpa', 3));

    // `lastIndexOf` for the heading: "Fee Schedule" also appears earlier in the
    // body, and the one that matters is the section heading the table sits under.
    const heading = text.lastIndexOf('Fee Schedule');
    const clause = text.indexOf('may not  be charged');
    const row = text.indexOf('Origination fee');

    expect(heading).toBeGreaterThan(-1);
    expect(clause).toBeGreaterThan(heading);
    expect(row).toBeGreaterThan(clause);
  });
});
