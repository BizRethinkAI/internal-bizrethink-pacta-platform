import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { norm, normalisedDigest } from '../provenance/source-text';

/**
 * Reading and digesting the agreements the clause bodies were taken from.
 *
 * A sibling of `mca/provenance/source-text.ts`, and deliberately not a
 * generalisation of it. That module reads STATUTES, where the header question
 * is whether we transcribed from the enacting authority or from a publisher
 * reproducing it — the question Georgia failed, which
 * `__tests__/sources-are-primary.test.ts` now asks of every file in
 * `mca/sources/`. These are OUR documents. Asking a Lombard agreement to name
 * its primary publisher is a category error, and pointing the existing test at
 * this directory would either fail honestly or be widened until it passed,
 * which is worse.
 *
 * What is shared is the part that should be: `norm` and `normalisedDigest`, so
 * that a digest here means exactly what a digest there means.
 */

/**
 * Where the body text actually starts.
 *
 * Everything above it is the vendoring header — the source `.docx`, the
 * repository commit, the document's own sha256 — which is provenance about the
 * file rather than text from it. Digesting the header would make the digest
 * break when a comment is corrected, which trains people to re-stamp without
 * looking; matching clause bodies against the header would let a sentence
 * quoted in a note pass as a sentence in the agreement.
 */
const BODY_MARKER = '--- BODY TEXT BEGINS ---';

const candidates = (): string[] => {
  const out: string[] = [];

  // Present under vitest and any CommonJS build; undeclared in an ESM bundle,
  // where a bare reference throws at module evaluation. See the long note in
  // `provenance/source-text.ts` — the same two failures apply here.
  if (typeof __dirname !== 'undefined') {
    out.push(join(__dirname, 'source-documents'));
  }

  let dir = process.cwd();

  for (let i = 0; i < 8 && dir !== dirname(dir); i += 1) {
    out.push(join(dir, 'packages', 'bizrethink', 'mca', 'clauses', 'source-documents'));
    dir = dirname(dir);
  }

  return out;
};

let resolved: string | null | undefined;

const documentsDir = (): string | null => {
  if (resolved === undefined) {
    resolved = candidates().find((dir) => existsSync(join(dir, 'README.md'))) ?? null;
  }

  return resolved;
};

export class MissingAgreementError extends Error {}

export const agreementExists = (file: string): boolean => {
  const dir = documentsDir();

  return dir !== null && existsSync(join(dir, file));
};

/**
 * The agreement's body, header stripped.
 *
 * Throws rather than returning null, unlike `readSourceText`'s caller-facing
 * degradation. The difference is what depends on it: a missing statute makes a
 * verification date unearnable and the conformity surface says so, which is a
 * page rendering honestly. A missing agreement means the library cannot show
 * that its own clauses are the words the document ships, and there is no
 * honest thing for it to render instead.
 */
export const readAgreementBody = (file: string): string => {
  const dir = documentsDir();

  if (dir === null) {
    throw new MissingAgreementError(
      `mca/clauses/source-documents/ could not be found from ${process.cwd()}, so ${file} cannot be read and no ` +
        'clause body can be shown to be the text the document ships',
    );
  }

  const path = join(dir, file);

  if (!existsSync(path)) {
    throw new MissingAgreementError(`${file} is not in mca/clauses/source-documents/`);
  }

  const text = readFileSync(path, 'utf8');
  const at = text.indexOf(BODY_MARKER);

  if (at === -1) {
    throw new MissingAgreementError(`${file} has no ${BODY_MARKER} line, so its header cannot be told from its body`);
  }

  return text.slice(at + BODY_MARKER.length);
};

/** The fingerprint an instrument's `bodiesVerifiedAt` is pinned to. */
export const agreementDigest = (file: string): string => normalisedDigest(readAgreementBody(file));

/**
 * Is this text still in the document?
 *
 * Normalised on both sides, for the reason `provenance/source-text.ts` gives:
 * curly quotes, en dashes and the column a run happened to break at are not the
 * agreement. Any change to a WORD does change the answer, which is the event
 * worth being told about.
 *
 * DELIBERATELY CONTAINMENT AND NOT EQUALITY. A clause body is a span of a
 * document, and the document holds tables, headings and signature blocks around
 * it that are not any clause's text. Equality would force the library to model
 * the whole document before it could hold one clause.
 */
export const containsClauseText = (documentBody: string, text: string): boolean =>
  norm(documentBody).includes(norm(text));
