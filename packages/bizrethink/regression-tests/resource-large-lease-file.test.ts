import { randomFillSync } from 'node:crypto';
import { PDFDocument } from '@cantoo/pdf-lib';
import { expect, it } from 'vitest';
import { countBoundedPdfPages } from '../server-only/resources/media-worker';

it('preserves a valid 418-page lease PDF larger than the ordinary 50 MiB upload limit', async () => {
  const document = await PDFDocument.create();
  for (let index = 0; index < 418; index++) {
    document.addPage([100, 100]);
  }
  // An embedded, incompressible synthetic attachment makes a structurally valid
  // large PDF without an expensive image/decompression-bomb fixture.
  await document.attach(randomFillSync(new Uint8Array(51 * 1024 * 1024)), 'synthetic.bin');
  const bytes = await document.save();
  expect(bytes.byteLength).toBeGreaterThan(50 * 1024 * 1024);
  expect(bytes.byteLength).toBeLessThan(128 * 1024 * 1024);
  expect(await countBoundedPdfPages(bytes)).toBe(418);
}, 15_000);
