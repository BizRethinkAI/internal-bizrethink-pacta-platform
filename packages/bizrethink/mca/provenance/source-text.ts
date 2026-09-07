import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Reading, digesting and slicing the vendored primary text.
 *
 * `sources/README.md` says the regulations are committed "so that the words a
 * spec was transcribed from cannot change underneath it". That was an
 * intention; this file is the enforcement.
 */

/**
 * Find the vendored statutes, and RETURN NULL RATHER THAN THROW when they are
 * not there.
 *
 * This used to be `join(__dirname, '..', 'sources')` evaluated at module load,
 * which was correct while the only caller was a test runner and became a
 * liability the moment `/admin/mca` made this module reachable from the Remix
 * server bundle. Two things break there and they break differently:
 *
 *   - The bundle is ESM, where `__dirname` is not merely absent but
 *     UNDECLARED. A bare reference throws `ReferenceError` at module
 *     evaluation, and a route module that throws on import takes the server
 *     with it. `typeof` is the only safe way to ask.
 *   - The production image (`docker/Dockerfile`, runner stage) copies
 *     `apps/remix/build`, `apps/remix/public`, `packages/tailwind-config` and
 *     the Prisma schema. **`packages/bizrethink/mca/sources/` is not among
 *     them**, so in the container these files do not exist at any path.
 *
 * The second is a real deployment gap that this function does not close — see
 * the in-flight note. What it does is make the gap DEGRADE HONESTLY rather
 * than crash: with no sources directory, `sourceExists` is false for every
 * file, `verifyProvenance` reports `kind: 'source'`, and the conformity
 * surface renders every state as unverified with "SOURCE MISSING" beside it.
 *
 * That is the correct thing for it to say. A verification date whose evidence
 * is not present cannot be re-earned, and this package's entire position is
 * that a date nothing re-executes is worth nothing.
 */
export const resolveSourcesDir = (candidates: readonly string[]): string | null =>
  candidates.find((dir) => existsSync(join(dir, 'README.md'))) ?? null;

const defaultCandidates = (): string[] => {
  const out: string[] = [];

  // Present under vitest and any CommonJS build; undeclared in an ESM bundle.
  if (typeof __dirname !== 'undefined') {
    out.push(join(__dirname, '..', 'sources'));
  }

  // Walk up from the working directory, for a bundled server started from the
  // repository root.
  let dir = process.cwd();

  for (let i = 0; i < 8 && dir !== dirname(dir); i += 1) {
    out.push(join(dir, 'packages', 'bizrethink', 'mca', 'sources'));
    dir = dirname(dir);
  }

  return out;
};

let resolved: string | null | undefined;

const sourcesDir = (): string | null => {
  if (resolved === undefined) {
    resolved = resolveSourcesDir(defaultCandidates());
  }

  return resolved;
};

/**
 * Collapse whitespace and fold the punctuation that differs between
 * extractions. Identical to the normaliser in `prescribed/conformity.ts`, and
 * for the same reason: vendored statutes are `pdftotext` output, so a
 * prescribed sentence arrives broken across lines and indented.
 */
export const norm = (s: string): string =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

export class MissingSourceError extends Error {}

export const sourceExists = (file: string): boolean => {
  const dir = sourcesDir();

  return dir !== null && existsSync(join(dir, file));
};

export const readSourceText = (file: string): string => {
  const dir = sourcesDir();

  if (dir === null) {
    throw new MissingSourceError(
      `mca/sources/ could not be found from ${process.cwd()}, so ${file} cannot be read and no verification date on ` +
        'any spec can be re-earned in this environment',
    );
  }

  const path = join(dir, file);

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
 * The sharper case is the funding-provided sentence. New York's file contains
 * CALIFORNIA's phrasing of it, in a later section governing a different
 * transaction type, so a whole-file check accepts New York's form carrying
 * California's words.
 *
 * NOTE WHICH DIRECTION THAT IS, BECAUSE IT IS NOT THE ONE THAT SHIPPED. The
 * defect in templates 104/105 was the CALIFORNIA form carrying NEW YORK's
 * wording, and New York's phrasing appears nowhere in the California file — so
 * a whole-file check would have rejected it, and `near-identical-states.test.ts`
 * asserts exactly that against the whole California source. That defect
 * survived because until PR #101 there was no checker of any kind, not because
 * the check was too wide.
 *
 * Scoping earns its place on the mirror direction, which is hypothetical only
 * in the sense that nobody has made that particular mistake yet. §600.11 and
 * §600.12 do use California's phrasing, so the file really does contain the
 * words that would let a wrong sentence pass.
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
