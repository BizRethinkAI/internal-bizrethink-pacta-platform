/**
 * Fetching a published page and returning ITS WORDS.
 *
 * Shared by the monthly check and the baselining tool on purpose: the digest a
 * person signs has to be produced by the same code that will later compare
 * against it. Two implementations would drift, and the first symptom would be
 * every source reporting `differs` on the run after a baseline was set.
 *
 * Lives under `scripts/` rather than in the package because it shells out to
 * `pdftotext`. `mca/provenance/source-text.ts` records what happens when a
 * module reachable from the Remix server bundle assumes a Node environment;
 * `node:child_process` in the package would be the same mistake with a worse
 * failure mode.
 */
import { execFileSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { textFromHtml } from '../../packages/bizrethink/mca/provenance/source-extract';

export type FetchedPage = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string | null;
  /** The extracted words, not the bytes. */
  text: string;
};

/**
 * `pdftotext`, the extraction the 2026-09-12 audit used and recorded.
 *
 * A PDF read through `response.text()` is mojibake — deterministic, so it
 * raises no false alarm, but it verifies nothing about the words and any
 * re-save changes it wholesale. `VA-Disclosure-Form.pdf` is a PRESCRIBED FORM,
 * so its words are the requirement.
 */
export const textFromPdf = (bytes: Buffer): string => {
  const path = join(tmpdir(), `mca-source-${process.pid}-${Date.now()}.pdf`);

  writeFileSync(path, bytes);

  try {
    return execFileSync('pdftotext', [path, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } finally {
    unlinkSync(path);
  }
};

const USER_AGENT = 'pacta-mca-source-check (compliance source verification)';

/**
 * Fetch one page. Throws on anything but a clean response, so a caller cannot
 * mistake an error page for a statute that changed.
 */
export const fetchPage = async (url: string): Promise<FetchedPage> => {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
    headers: { 'user-agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  const bytes = Buffer.from(await response.arrayBuffer());

  /*
    THE BYTES DECIDE, not the headers or the URL.

    Georgia publishes its enrolled bills from
    `legis.ga.gov/api/legislation/document/<id>` — no `Content-Type` header at
    all and no `.pdf` in the path, serving a 13-page PDF. Routing that to the
    HTML extractor produced 16,674 characters of PDF syntax and decoding
    debris, which is not empty, so `NOTHING_EXTRACTED` would not have caught
    it: it would have been digested and signed as though it were statute.
    Found by an independent audit and reproduced.

    A magic-byte check is the only one of the three that cannot be wrong, so it
    goes first and the other two remain as fallbacks for a server that declares
    a PDF it does not send.
  */
  const isPdf =
    bytes.subarray(0, 5).toString('latin1') === '%PDF-' ||
    (contentType ?? '').includes('pdf') ||
    new URL(response.url).pathname.toLowerCase().endsWith('.pdf');

  return {
    url,
    finalUrl: response.url,
    httpStatus: response.status,
    contentType,
    text: isPdf ? textFromPdf(bytes) : textFromHtml(bytes.toString('utf8')),
  };
};

/** What the monthly check wants: the words alone. */
export const fetchSourceText = async (url: string): Promise<string> => (await fetchPage(url)).text;
