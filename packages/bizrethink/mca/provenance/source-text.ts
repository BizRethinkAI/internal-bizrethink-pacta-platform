import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reading, digesting and slicing the vendored primary text.
 *
 * `sources/README.md` says the regulations are committed "so that the words a
 * spec was transcribed from cannot change underneath it". That was an
 * intention; this file is the enforcement.
 */

const SOURCES = join(__dirname, '..', 'sources');

/**
 * Collapse whitespace and fold the punctuation that differs between
 * extractions. Identical to the normaliser in `prescribed/conformity.ts`, and
 * for the same reason: vendored statutes are `pdftotext` output, so a
 * prescribed sentence arrives broken across lines and indented.
 */
export const norm = (s: string): string =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

export class MissingSourceError extends Error {}

export const sourceExists = (file: string): boolean => existsSync(join(SOURCES, file));

export const readSourceText = (file: string): string => {
  const path = join(SOURCES, file);

  if (!existsSync(path)) {
    throw new MissingSourceError(`${file} is not in mca/sources/`);
  }

  return readFileSync(path, 'utf8');
};

/**
 * The fingerprint a verification date is pinned to.
 *
 * Taken over the NORMALISED text, not the raw bytes, and the choice matters in
 * both directions. Line endings, trailing spaces and the column at which
 * `pdftotext` wrapped a line are not the regulation; re-extracting the same PDF
 * on another machine should not raise a false alarm that trains people to
 * re-stamp dates without looking. Any change to a WORD does change this digest,
 * and that is the event we actually care about — a regulator amending the rule
 * is how this package rots.
 *
 * The trade is deliberate: a change purely to the source's LAYOUT passes
 * unnoticed. Layout is not what `verbatimVerifiedAt` claims, and row order —
 * the one structural fact that survives extraction — is checked directly for
 * the forms where it can be.
 */
export const normalisedDigest = (text: string): string => createHash('sha256').update(norm(text)).digest('hex');

/**
 * The part of a vendored file a spec was actually transcribed from.
 *
 * California's regulation prescribes at least six different tables — closed-end,
 * open-end, factoring, sales-based, lease, asset-based — in one 132,000
 * character file, and only the sales-based one is ours. Checking a label or a
 * sentence against the whole file therefore proves far less than it appears to:
 * "Repurchase Costs" is a genuine California row label, for factoring, and a
 * whole-file check accepts it in our table without complaint.
 *
 * Worse, and this is the one that actually happened: New York's file contains
 * CALIFORNIA's phrasing of the funding-provided sentence, in a later section
 * governing a different transaction type. A whole-file check accepts New York's
 * form carrying California's words — which is the defect that shipped.
 *
 * `from` and `to` are literal anchors taken from the source's own section
 * headings rather than line numbers, because line numbers move whenever the
 * file is re-extracted and an anchor that silently stops matching is worse than
 * no anchor at all. When either fails to resolve, callers report it rather than
 * falling back to the whole file: a silent widening of the search is exactly
 * the failure this exists to prevent.
 */
export type SourceSection = {
  /** Literal text at which the relevant section starts, e.g. a section heading. */
  from: string;
  /** Literal text at which it ends — normally the next section's heading. */
  to: string;
};

export const sectionOf = (text: string, section: SourceSection | null): string | null => {
  if (section === null) {
    return text;
  }

  const start = text.indexOf(section.from);

  if (start === -1) {
    return null;
  }

  const end = text.indexOf(section.to, start + section.from.length);

  if (end === -1) {
    return null;
  }

  return text.slice(start, end);
};

/**
 * Treat every quotation mark as the same character.
 *
 * New York writes the name of an attached document with single quotes inside a
 * double-quoted prescribed sentence — `“… review the attached document
 * ‘Itemization of Amount Financed.’”` — where our form uses double quotes. That
 * is typography, not wording, and `norm` alone leaves the two apart because it
 * folds curly quotes onto straight ones without folding single onto double.
 *
 * Folding cannot make a wrong sentence look right: every word must still match
 * in order. It only stops the checker reporting a quoting style as a defect.
 */
const foldQuotes = (s: string): string => s.replace(/["'`]/g, '"');

/**
 * Does a sentence the regulation supplies appear in this text?
 *
 * A prescribed sentence names the financer where our form names Lombard, so the
 * regulation writes the hole as a bracketed instruction and it is matched as a
 * wildcard rather than as text — the same rule `prescribed/conformity.ts` uses.
 */
export const containsPrescribedText = (haystack: string, text: string): boolean =>
  new RegExp(
    foldQuotes(norm(text))
      .split(/\[[^\]]+\]/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.+?'),
  ).test(foldQuotes(norm(haystack)));

/**
 * Does a prescribed label appear in the source, allowing for the line numbers
 * printed down the margin of a bill?
 *
 * Kansas prescribes the label "estimated payments". The vendored bill reads
 * `... shall label such disclosure as "estimated 14 payments."` — the 14 is the
 * printed line number, which survives `pdftotext` and lands in the middle of
 * the phrase. A plain containment check calls that label missing and reports a
 * defect in a form that carries it correctly, and a checker that cries wolf
 * gets its findings ignored.
 *
 * So a bare one-to-three digit token is allowed BETWEEN the words of a label,
 * and nowhere else. It cannot make a wrong label look right: the words must
 * still all be there, in order, with nothing but a page artefact between them.
 */
export const containsLabel = (haystack: string, label: string): boolean => {
  const words = norm(label)
    .toLowerCase()
    .split(' ')
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  return new RegExp(words.join('(?: \\d{1,3})? ')).test(norm(haystack).toLowerCase());
};
