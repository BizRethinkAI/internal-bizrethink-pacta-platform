import { readFileSync } from 'node:fs';

import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { bundleEntryName, zipDocuments } from './governing-bundle';

/**
 * "Clicking 16 links does not make it very user friendly" — the repository
 * owner, on the pilot lease's governing documents, 2026-09-15.
 *
 * One download holding every document, each still its own file under the name
 * the receipt recites, numbered in the receipt's order so a tenant matching
 * item 12 against file 12 finds the same instrument.
 */
describe('bundleEntryName', () => {
  it('numbers each file in receipt order and keeps its name', () => {
    expect(bundleEntryName(0, 'Amended and Restated Master Declaration')).toBe(
      '01 Amended and Restated Master Declaration.pdf',
    );
    expect(bundleEntryName(15, 'Resolution 2026-05 — Adopting Amenity Suspension and Termination Rules')).toBe(
      '16 Resolution 2026-05 — Adopting Amenity Suspension and Termination Rules.pdf',
    );
  });

  // A label is typed by a landlord; a file name has to survive every OS.
  it('removes what a file system will not accept', () => {
    expect(bundleEntryName(2, 'Rules: "Pool" / Spa <v2> | draft?*')).toBe('03 Rules Pool Spa v2 draft.pdf');
    expect(bundleEntryName(3, '   ')).toBe('04 Document.pdf');
  });
});

describe('zipDocuments', () => {
  it('holds every document byte for byte, in order, under its name', () => {
    const zip = zipDocuments([
      { name: '01 First.pdf', bytes: new Uint8Array([37, 80, 68, 70, 1]) },
      { name: '02 Résolution — second.pdf', bytes: new Uint8Array([37, 80, 68, 70, 2]) },
    ]);

    const files = unzipSync(zip);

    expect(Object.keys(files)).toEqual(['01 First.pdf', '02 Résolution — second.pdf']);
    expect([...files['02 Résolution — second.pdf']]).toEqual([37, 80, 68, 70, 2]);
  });
});

/**
 * The route. A capability URL is acceptable here only because every file it
 * can serve is a recorded public instrument — the same carve-out the single
 * link has. Source-level because the route needs storage and a database.
 */
describe('the download-all route', () => {
  const route = readFileSync(
    new URL('../../../../apps/remix/app/routes/_recipient+/lease-attachment.$matterId.all.tsx', import.meta.url),
    'utf8',
  );

  it('serves only what the receipt lists, through the shared lookup', () => {
    expect(route).toContain('findGoverningDocuments(');
    expect(route).toContain('zipDocuments(');
    expect(route).not.toMatch(/move-in-report/);
  });

  it('downloads rather than trying to display a zip, and is never cached', () => {
    expect(route).toContain("'application/zip'");
    expect(route).toContain('attachmentContentDisposition(');
    expect(route).toContain('no-store');
  });
});
