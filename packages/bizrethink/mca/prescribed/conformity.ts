import type { Divergence, PrescribedForm, RenderedRow } from './types';

/**
 * Collapse whitespace so a comparison survives the shape of the input.
 *
 * Vendored statutes are `pdftotext` output: a prescribed sentence is routinely
 * broken across lines and indented, so the same words arrive with newlines and
 * runs of spaces in the middle. Rendered forms wrap differently again. Every
 * comparison in this file is between normalised strings for that reason — the
 * lesson cost real time in REVIEW-01, where a cell reading "Total Dollar Cost"
 * on the page was "Total Dollar\nCost" in the file and matched nothing.
 */
const norm = (s: string): string =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

/**
 * A prescribed sentence names the financer where the form names Lombard, so a
 * literal comparison fails on every row that does. The regulation writes the
 * hole as a bracketed instruction; treat it as a wildcard rather than text.
 */
export const asPattern = (verbatim: string): RegExp =>
  new RegExp(
    norm(verbatim)
      .split(/\[[^\]]+\]/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.+?'),
  );

/** Does the form we built match the spec we wrote? */
export const checkFormConformity = (form: PrescribedForm, rendered: RenderedRow[]): Divergence[] => {
  const out: Divergence[] = [];

  if (rendered.length !== form.rows.length) {
    out.push({
      kind: 'row-count',
      row: null,
      detail: `${form.citation} prescribes ${form.rows.length} rows; the form has ${rendered.length}`,
    });
  }

  form.rows.forEach((row, i) => {
    const actual = rendered[i];

    if (!actual) {
      return;
    }

    const prescribedLabel = row.labelSuffix === undefined ? row.label : `${row.label} ${row.labelSuffix}`;
    const labelOk =
      form.labelMatch === 'contains'
        ? norm(actual.label).includes(norm(prescribedLabel))
        : norm(actual.label) === norm(prescribedLabel);

    if (!labelOk) {
      out.push({
        kind: 'label',
        row: i,
        detail: `row ${i}: prescribed label is ${JSON.stringify(prescribedLabel)}, form has ${JSON.stringify(actual.label)}`,
      });
    }

    /*
      §915(a)(7) / §600.14(g): "shall include no information in the third
      column". Checked BEFORE the `verbatim === null` return below, because a
      row that must be empty has no prescribed wording and would otherwise fall
      straight through the early exit — label checked, cell never looked at.
    */
    if (row.thirdColumnEmpty && norm(actual.content) !== '') {
      out.push({
        kind: 'unauthorised-addition',
        row: i,
        detail: `row ${i}: ${form.citation} says this row shall include no information in the third column, but it carries ${JSON.stringify(
          norm(actual.content),
        )}`,
      });
    }

    if (row.verbatim === null) {
      return;
    }

    const pattern = asPattern(row.verbatim);
    const content = norm(actual.content);
    const match = content.match(pattern);

    if (!match) {
      out.push({
        kind: 'verbatim',
        row: i,
        detail: `row ${i}: prescribed text not found. Expected ${JSON.stringify(row.verbatim)}`,
      });
      return;
    }

    /*
      The row said "shall include only". Anything outside the prescribed
      sentence is a defect however true it is — which is the part that feels
      wrong and is not: three sentences removed from the California form under
      `ca-extra-text-in-only-rows` were each accurate and each helpful.
    */
    let remainder = content.replace(match[0], '');

    const authorised = [...(row.alsoPermitted ?? []), ...(row.providerDrafted ?? []).map((p) => p.text)];

    for (const permitted of authorised) {
      const hit = remainder.match(asPattern(permitted));

      if (hit) {
        remainder = remainder.replace(hit[0], '');
      }
    }

    if (row.onlyPrescribedContent && norm(remainder) !== '') {
      out.push({
        kind: 'unauthorised-addition',
        row: i,
        detail: `row ${i}: this row shall include only the prescribed content, but also carries ${JSON.stringify(
          norm(remainder),
        )}`,
      });
    }
  });

  return out;
};

/**
 * Does the SPEC match the statute?
 *
 * This is the check that matters. `checkFormConformity` proves a form matches
 * what we wrote down; only this proves what we wrote down is what the regulator
 * said. Georgia and Texas were both built from secondary summaries that were
 * broadly right — content-only, the right ceiling, the right effective date —
 * and wrong in the particulars, and no amount of form-to-spec checking would
 * have found it.
 */
export const checkAgainstSource = (form: PrescribedForm, sourceText: string): Divergence[] => {
  const source = norm(sourceText);

  return form.rows.flatMap((row, i) => {
    const missing: Divergence[] = [];

    if (!source.includes(norm(row.label))) {
      missing.push({
        kind: 'not-in-source',
        row: i,
        detail: `row ${i}: label ${JSON.stringify(row.label)} does not appear in ${form.sourceFile}`,
      });
    }

    // A bracketed formula is literal text, not one of asPattern's fill-in slots.
    if (row.labelSuffix !== undefined && !source.includes(norm(row.labelSuffix))) {
      missing.push({
        kind: 'not-in-source',
        row: i,
        detail: `row ${i}: label text ${JSON.stringify(row.labelSuffix)} does not appear in ${form.sourceFile}`,
      });
    }

    if (row.verbatim !== null && !asPattern(row.verbatim).test(source)) {
      missing.push({
        kind: 'not-in-source',
        row: i,
        detail: `row ${i}: prescribed text ${JSON.stringify(row.verbatim)} does not appear in ${form.sourceFile}`,
      });
    }

    return missing;
  });
};

/**
 * How much of a form this checker can actually see.
 *
 * A row whose regulation prescribes "a short explanation" rather than words has
 * no `verbatim`, and `checkFormConformity` skips it — label checked, contents
 * not. On New York's §600.6 that is five rows of eleven.
 *
 * Exported and asserted in the tests so the number is stated rather than
 * implied. A suite that passes while checking half a form is a suite that
 * reports the half it checked, and the danger is reading it as the whole.
 */
export const coverage = (form: PrescribedForm) => {
  const checked = form.rows.filter((r) => r.verbatim !== null).length;

  return { checked, total: form.rows.length, unchecked: form.rows.length - checked };
};
