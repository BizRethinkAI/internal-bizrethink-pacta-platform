import { PDFDocument } from '@cantoo/pdf-lib';
import { pdfToImages } from '@documenso/lib/server-only/ai/pdf-to-images';
import { expect, it } from 'vitest';

const pdf = async (pages: number) => {
  const document = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    document.addPage([100, 100]);
  }
  return document.save();
};
it('A-10 refuses AI rendering beyond the 20-page request budget', async () => {
  await expect(pdfToImages(await pdf(21))).rejects.toThrow();
});
it('preserves one-page rendering and its coordinate dimensions', async () => {
  const pages = await pdfToImages(await pdf(1));
  expect(pages).toHaveLength(1);
  expect(pages[0]).toMatchObject({ pageNumber: 1, width: 200, height: 200, mimeType: 'image/jpeg' });
  expect(pages[0].image.byteLength).toBeGreaterThan(0);
});
