import { PDFDocument } from '@cantoo/pdf-lib';
import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { PDF } from '@libpdf/core';
import { describe, expect, it } from 'vitest';

import { injectMcaWidgets, MCA_WIDGET_MARKER, markerFor } from './acroform';

/**
 * Turning a rendered page into a fillable one.
 *
 * WHY A MARKER AND NOT A COORDINATE. The renderer is react-pdf, which lays out
 * a document rather than placing boxes at coordinates — it never tells us where
 * anything landed. So the page carries a visible `«name»` marker where a value
 * belongs, and this step finds the marker and puts a widget over it. That is
 * the same approach `lombard-contracts/pipeline/inject_acroform_widgets.py`
 * takes, and it is proven on the templates in production; what changes here is
 * that it needs neither Poppler nor Python, because `@libpdf/core` already
 * returns text bounding boxes for the placeholder extractor Documenso ships.
 *
 * WHAT MUST NOT HAPPEN. A `{{SIGNATURE, rN}}` placeholder must come through
 * untouched: a widget is sender-writable only, so a signature built as one
 * ships permanently blank, and Documenso's own extraction at upload is what
 * turns those tokens into signer fields.
 */

/** A page shaped like a merchant-ready one: repeated marker, and signer tokens. */
const fixture = async (): Promise<Buffer> => {
  const pdf = await PDF.create();
  const one = pdf.addPage({ size: 'letter' });

  one.drawText(`Merchant: ${markerFor('merchant_legal_name')}`, { x: 72, y: 700, size: 10.5 });
  one.drawText(`Purchase price: ${markerFor('purchase_price')}`, { x: 72, y: 670, size: 10.5 });
  one.drawText('{{SIGNATURE, r1}}   {{DATE, r1}}', { x: 72, y: 600, size: 10.5 });

  const two = pdf.addPage({ size: 'letter' });

  // The same fact, said again on another page. One field, two widgets.
  two.drawText(`Signed by ${markerFor('merchant_legal_name')}`, { x: 72, y: 700, size: 10.5 });

  return Buffer.from(await pdf.save());
};

const fieldsOf = async (pdf: Buffer): Promise<Record<string, number>> => {
  const doc = await PDFDocument.load(pdf);

  return Object.fromEntries(
    doc
      .getForm()
      .getFields()
      .map((field) => [field.getName(), field.acroField.getWidgets().length]),
  );
};

describe('a rendered page becomes a fillable template', () => {
  it('makes one field per name and one widget per occurrence', async () => {
    const out = await injectMcaWidgets(await fixture(), {
      expect: ['merchant_legal_name', 'purchase_price'],
    });

    expect(await fieldsOf(out)).toEqual({ merchant_legal_name: 2, purchase_price: 1 });
  });

  /**
   * The property #289 pinned, restated as behaviour: the funder's platform
   * sends ONE `formValues` entry per name. A page that produced
   * `merchant_legal_name_2` would need a value the platform never sends, and
   * the second occurrence would ship blank.
   */
  it('never invents a second name for a repeated fact', async () => {
    const out = await injectMcaWidgets(await fixture(), {
      expect: ['merchant_legal_name', 'purchase_price'],
    });

    expect(Object.keys(await fieldsOf(out)).sort()).toEqual(['merchant_legal_name', 'purchase_price']);
  });

  it('leaves the signer placeholders for Documenso to extract', async () => {
    const out = await injectMcaWidgets(await fixture(), {
      expect: ['merchant_legal_name', 'purchase_price'],
    });
    const survived = (await PDF.load(new Uint8Array(out)))
      .getPages()
      .flatMap((page) => page.findText(/\{\{[A-Z]+, r\d+\}\}/g).map((match) => match.text));

    expect(survived).toEqual(['{{SIGNATURE, r1}}', '{{DATE, r1}}']);
  });

  /**
   * THE ASSERTION THIS FILE EXISTS FOR, because it is the one that could not be
   * reasoned out: that the two mechanisms coexist in one file. The widgets are
   * ours and go in here; the signer fields are Documenso's and are made at
   * upload from the tokens left behind. Nothing guarantees in advance that
   * adding an AcroForm leaves upstream's extractor able to read the page — so
   * it is upstream's own extractor that is asked, not a re-implementation.
   */
  it('still hands Documenso the signer fields it would make at upload', async () => {
    const out = await injectMcaWidgets(await fixture(), {
      expect: ['merchant_legal_name', 'purchase_price'],
    });
    const extracted = await extractPlaceholdersFromPDF(out);

    expect(
      extracted.map((placeholder) => ({
        type: placeholder.fieldAndMeta.type,
        recipient: placeholder.recipient,
        page: placeholder.page,
      })),
    ).toEqual([
      { type: 'SIGNATURE', recipient: 'r1', page: 1 },
      { type: 'DATE', recipient: 'r1', page: 1 },
    ]);

    // Real geometry, not a zero box — a field the signer cannot find is the
    // same as one that is not there.
    for (const placeholder of extracted) {
      expect(placeholder.width).toBeGreaterThan(0);
      expect(placeholder.height).toBeGreaterThan(0);
    }
  });

  /**
   * The converse, and the rule this repository has been bitten by: a widget is
   * SENDER-writable only. If the marker syntax ever collided with the
   * placeholder syntax, a signature would become a widget and ship permanently
   * blank. Upstream must see no field of ours at all.
   */
  it('never turns one of our widgets into a Documenso field', async () => {
    const out = await injectMcaWidgets(await fixture(), {
      expect: ['merchant_legal_name', 'purchase_price'],
    });
    const extracted = await extractPlaceholdersFromPDF(out);

    expect(extracted.map((placeholder) => placeholder.placeholder).join(' ')).not.toMatch(/merchant_legal_name|«/);
  });

  /**
   * A widget as narrow as its marker cannot hold the value it stands for. The
   * marker is short on purpose — its visible length would otherwise set the
   * box, which is the mistake the Python injector's own header records having
   * made and undone.
   */
  it('gives a widget room for the value, not for the marker', async () => {
    const out = await injectMcaWidgets(await fixture(), {
      expect: ['merchant_legal_name', 'purchase_price'],
      widthFor: (name) => (name === 'purchase_price' ? 80 : 220),
    });
    const doc = await PDFDocument.load(out);
    const widths = Object.fromEntries(
      doc
        .getForm()
        .getFields()
        .map((field) => [field.getName(), Math.round(field.acroField.getWidgets()[0].getRectangle().width)]),
    );

    expect(widths.merchant_legal_name).toBe(220);
    expect(widths.purchase_price).toBe(80);
  });
});

/**
 * PUBLICATION FAILS CLOSED. Everything below is a refusal, because the failure
 * this guards against is silent by nature: a template published with a missing
 * or misspelled widget looks finished, and only goes wrong later, in a document
 * a merchant is signing.
 */
describe('it refuses rather than publishing something half-filled', () => {
  it('refuses a marker nobody asked for', async () => {
    await expect(injectMcaWidgets(await fixture(), { expect: ['merchant_legal_name'] })).rejects.toThrow(
      /purchase_price/,
    );
  });

  it('refuses an expected name the page never mentions', async () => {
    await expect(
      injectMcaWidgets(await fixture(), {
        expect: ['merchant_legal_name', 'purchase_price', 'guarantor_email'],
      }),
    ).rejects.toThrow(/guarantor_email/);
  });

  it('names every problem at once, so a fix is one pass', async () => {
    const failure = await injectMcaWidgets(await fixture(), { expect: ['guarantor_email'] }).catch(
      (error: Error) => error.message,
    );

    expect(failure).toMatch(/merchant_legal_name/);
    expect(failure).toMatch(/purchase_price/);
    expect(failure).toMatch(/guarantor_email/);
  });

  it('refuses a page with no markers at all, rather than publishing a flat one', async () => {
    const flat = await PDF.create();
    flat.addPage({ size: 'letter' }).drawText('Nothing to fill in here.', { x: 72, y: 700, size: 10.5 });

    await expect(injectMcaWidgets(Buffer.from(await flat.save()), { expect: ['merchant_legal_name'] })).rejects.toThrow(
      /merchant_legal_name/,
    );
  });
});

describe('the marker itself', () => {
  it('round-trips a name', () => {
    expect(markerFor('merchant_legal_name')).toBe('«merchant_legal_name»');
    expect(MCA_WIDGET_MARKER.test('«merchant_legal_name»')).toBe(true);
  });

  /**
   * The source documents use `«0»`, `«23»` — a numeric index into a sidecar.
   * These are names, and the difference is the point: the name in the page is
   * the name the funder's platform prefills by, with no lookup table in between
   * that could drift from either end.
   */
  it('refuses a name that is not a widget name', () => {
    expect(() => markerFor('0')).toThrow();
    expect(() => markerFor('Merchant Legal Name')).toThrow();
    expect(() => markerFor('merchant.legalName')).toThrow();
  });
});
