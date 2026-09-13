import { describe, expect, it } from 'vitest';

import { ALL_MCA_CONTENT } from '../../catalogue';

/**
 * The assertion that runs the other way from `frpa-coverage.test.ts`, and the
 * one nobody wrote.
 *
 * Coverage asks: **is every line of the document inside a clause, or declared
 * non-clause with a reason?** There is no third option, and that check has
 * already caught two clauses the import never noticed.
 *
 * It cannot catch the converse, and the converse happened three times: **a
 * clause we declared and then emptied.** Every *line* was accounted for — the
 * guarantor grid is a `[TABLE]` row, declared non-clause with a reason — while a
 * clause record for the section it sits under kept existing with `body: ''`.
 * Coverage passed. So did every other test in this directory.
 *
 * What it cost: an outside reviewer opened the FRPA on a counsel link in
 * September 2026 and could not review the guarantor execution block at all, on
 * a document whose entire selling point is a *limited* guaranty. Their note
 * reads *"No substantive field block is visible in the exported clause … the
 * actual layout must be inspected."*
 *
 * WHY THIS IS NOT SIMPLY A BUG IN THE IMPORT. `feat/mca-clauses-twins` recorded
 * importing the Equipment Lease's §4.1 with an empty body under **"Not done, on
 * purpose"** — *"because that is what the document holds, a block of AcroForm
 * widgets under a heading."* That reading was defensible. What was missing was
 * any way to tell it apart from an accident, because a deliberate empty body
 * and a dropped one are byte-identical. `kind` is what separates them:
 * `field-group` says *this holds fields, not prose*, and this test then demands
 * the fields.
 *
 * See [ADR 0011](../../../../../docs/adr/0011-the-mca-clause-library-is-a-library.md).
 */
describe('every clause has content for its kind', () => {
  it.each(
    ALL_MCA_CONTENT.map((clause) => [clause.slug, clause] as const),
  )('%s holds something a reader can read', (_slug, clause) => {
    if (clause.kind === 'field-group') {
      /*
          A form grid's content is its fields. Demanding a body here would force
          prose onto a table, which is what produced the empty bodies in the
          first place.
        */
      expect(clause.fields, `${clause.slug} is a field-group and must declare fields`).toBeDefined();
      expect(clause.fields?.length ?? 0).toBeGreaterThan(0);

      for (const field of clause.fields ?? []) {
        expect(field.label.trim().length, `${clause.slug} has a field with no label`).toBeGreaterThan(0);
      }

      return;
    }

    /*
        A clause or an explainer is words. An empty one is not a minimal clause,
        it is a clause whose text went missing — and it renders to counsel as a
        heading with nothing under it.
      */
    expect(clause.body.trim().length, `${clause.slug} is a ${clause.kind} with an empty body`).toBeGreaterThan(0);
    expect(clause.fields, `${clause.slug} is a ${clause.kind} and must not declare fields`).toBeUndefined();
  });

  it('gives every current field a stable binding and preserves source anchors separately', () => {
    const groups = ALL_MCA_CONTENT.filter((clause) => clause.kind === 'field-group');
    expect(groups.map((group) => group.slug).sort()).toEqual([
      'equipment-lease.guarantor-information',
      'equipment-lease.merchant-and-equipment-information',
      'frpa.guarantor-fields',
      'frpa.merchant-and-funding-information',
      'frpa.prior-transaction-fields',
      'subscription.guarantor-information',
      'subscription.merchant-and-equipment-information',
    ]);
    for (const group of groups) {
      const fields = group.fields ?? [];
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.map((field) => field.kind)).not.toContain('ssn');
      for (const field of fields) {
        expect(field.binding.length).toBeGreaterThan(0);
        expect(field.widget).toMatch(/^\{\{field:[a-zA-Z0-9.-]+\}\}$/);
        if (field.legacyWidget) {
          expect(field.legacyWidget).toMatch(/^«\d+»$/);
        }
      }
      for (const retired of group.retiredFields ?? []) {
        expect(retired.widget).toMatch(/^«\d+»$/);
        expect(retired.reason.trim().length).toBeGreaterThan(0);
        expect(fields.map((field) => field.legacyWidget)).not.toContain(retired.widget);
      }
    }
  });
});
