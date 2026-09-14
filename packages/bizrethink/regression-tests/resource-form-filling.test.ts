import { PDFDocument } from '@cantoo/pdf-lib';
import { insertFormValuesInPdf } from '@documenso/lib/server-only/pdf/insert-form-values-in-pdf';
import { expect, it } from 'vitest';

it('A-10 form filling cannot parse more pages than the upload worker permits', async () => {
  const document = await PDFDocument.create();
  for (let i = 0; i < 1001; i++) {
    document.addPage([10, 10]);
  }
  await expect(insertFormValuesInPdf({ pdf: Buffer.from(await document.save()), formValues: {} })).rejects.toThrow();
});
it('preserves a real editable PDF form value', async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([100, 100]);
  document.getForm().createTextField('name').addToPage(page, { x: 5, y: 5, width: 90, height: 20 });
  const result = await insertFormValuesInPdf({
    pdf: Buffer.from(await document.save()),
    formValues: { name: 'Fixture' },
  });
  expect((await PDFDocument.load(result)).getForm().getTextField('name').getText()).toBe('Fixture');
});
