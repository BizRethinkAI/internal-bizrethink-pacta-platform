import { zipSync } from 'fflate';

/**
 * Every governing document in one download.
 *
 * "Clicking 16 links does not make it very user friendly" — the repository
 * owner, on the pilot lease, 2026-09-15. One zip, each document still its own
 * file under the name the receipt recites, in a folder for the body that issued
 * it and numbered as the receipt numbers it, so item 1a on the page is file 01a.
 *
 * A zip rather than one merged PDF: sixteen instruments stay sixteen
 * instruments, and nothing is re-encoded — a merge rewrites every file and can
 * break one that parses today.
 */

/** Characters no common file system accepts in a name. Control characters are dropped separately. */
const UNSAFE = /[\\/:*?"<>|]/g;

const withoutControlCharacters = (value: string) =>
  [...value].filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join('');

const safe = (value: string, fallback: string, max: number) =>
  withoutControlCharacters(value).replace(UNSAFE, '').replace(/\s+/g, ' ').trim().slice(0, max) || fallback;

/**
 * `Issuer/01a Label.pdf` — a folder per issuing body and the receipt's own
 * number, zero-padded so "01a" sorts under "01" and "12" after "02".
 */
export const bundleEntryName = (folder: string, number: string, label: string): string => {
  const padded = number.replace(/^(\d+)/, (digits) => digits.padStart(2, '0'));

  return `${safe(folder, 'Documents', 100)}/${padded} ${safe(label, 'Document', 150)}.pdf`;
};

export type BundleFile = { name: string; bytes: Uint8Array };

/** Stored, not compressed: PDFs already are, and a second pass only costs time. */
export const zipDocuments = (files: BundleFile[]): Uint8Array =>
  zipSync(Object.fromEntries(files.map((file) => [file.name, [file.bytes, { level: 0 }]])));
