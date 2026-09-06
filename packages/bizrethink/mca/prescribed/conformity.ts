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
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A prescribed sentence names the financer where the form names Lombard, so a
 * literal comparison fails on every row that does. The regulation writes the
 * hole as a bracketed instruction; treat it as a wildcard rather than text.
 */
const asPattern = (verbatim: string): RegExp =>
  new RegExp(
    norm(verbatim)
      .split(/\[[^\]]+\]/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.+?'),
  );

/** Does the form we built match the spec we wrote? */
export const checkFormConformity = (
  form: PrescribedForm,
  rendered: RenderedRow[],
): Divergence[] => {
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

    if (norm(actual.label) !== norm(row.label)) {
      out.push({
        kind: 'label',
        row: i,
        detail: `row ${i}: prescribed label is ${JSON.stringify(row.label)}, form has ${JSON.stringify(actual.label)}`,
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
    if (row.onlyPrescribedContent && norm(content.replace(match[0], '')) !== '') {
      out.push({
        kind: 'unauthorised-addition',
        row: i,
        detail: `row ${i}: this row shall include only the prescribed content, but also carries ${JSON.stringify(
          norm(content.replace(match[0], '')),
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
