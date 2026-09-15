import { zipSync } from 'fflate';

/**
 * Every governing document in one download.
 *
 * "Clicking 16 links does not make it very user friendly" — the repository
 * owner, on the pilot lease, 2026-09-15. One zip, each document still its own
 * file under the name the receipt recites, numbered in the receipt's order so
 * item 12 on the page is file 12 in the folder.
 *
 * A zip rather than one merged PDF: sixteen instruments stay sixteen
 * instruments, and nothing is re-encoded — a merge rewrites every file and can
 * break one that parses today.
 */

/** Characters no common file system accepts in a name. Control characters are dropped separately. */
const UNSAFE = /[\\/:*?"<>|]/g;

const withoutControlCharacters = (value: string) =>
  [...value].filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join('');

export const bundleEntryName = (index: number, label: string): string => {
  const name =
    withoutControlCharacters(label).replace(UNSAFE, '').replace(/\s+/g, ' ').trim().slice(0, 150) || 'Document';

  return `${String(index + 1).padStart(2, '0')} ${name}.pdf`;
};

export type BundleFile = { name: string; bytes: Uint8Array };

/** Stored, not compressed: PDFs already are, and a second pass only costs time. */
export const zipDocuments = (files: BundleFile[]): Uint8Array =>
  zipSync(Object.fromEntries(files.map((file) => [file.name, [file.bytes, { level: 0 }]])));
