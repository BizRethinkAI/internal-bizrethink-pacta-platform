import { PDFDocument } from '@cantoo/pdf-lib';
import { normalizePdf } from '@documenso/lib/server-only/pdf/normalize-pdf';
import { optimiseAvatar } from '@documenso/lib/utils/images/avatar';
import sharp from 'sharp';
import { expect, it } from 'vitest';

const pdf = async (pages = 1, form = false) => {
  const document = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    document.addPage([100, 100]);
  }
  if (form) {
    const field = document.getForm().createTextField('synthetic-name');
    field.setText('Synthetic');
    field.addToPage(document.getPages()[0], { x: 10, y: 10, width: 80, height: 10 });
  }
  return Buffer.from(await document.save());
};
it('A-10 rejects PDFs over the finite page-processing limit', async () => {
  await expect(normalizePdf(await pdf(1001))).rejects.toMatchObject({ code: 'INVALID_DOCUMENT_FILE' });
});
it('A-10 terminates PDF work at its processing deadline', async () => {
  const options = { timeoutMs: 1 } as Parameters<typeof normalizePdf>[1];
  await expect(normalizePdf(await pdf(), options)).rejects.toMatchObject({ code: 'INVALID_DOCUMENT_FILE' });
});
it('preserves ordinary PDFs and the explicit form-flattening option', async () => {
  const original = await pdf(1, true);
  const flattened = await PDFDocument.load(await normalizePdf(original));
  const retained = await PDFDocument.load(await normalizePdf(original, { flattenForm: false }));
  expect(flattened.getPageCount()).toBe(1);
  expect(flattened.getForm().getFields()).toHaveLength(0);
  expect(retained.getForm().getFields()).toHaveLength(1);
});
it('A-10 refuses image dimensions that exceed the decode pixel budget', async () => {
  const oversized = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="5000"><rect width="5000" height="5000" fill="red" /></svg>',
  ).toString('base64');
  await expect(optimiseAvatar(oversized)).rejects.toThrow();
});
it('preserves a valid small avatar and its 512-pixel JPEG output', async () => {
  const source = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#204060' } })
    .png()
    .toBuffer();
  const output = await optimiseAvatar(source.toString('base64'));
  expect(await sharp(output).metadata()).toMatchObject({ format: 'jpeg', width: 512, height: 512 });
});
