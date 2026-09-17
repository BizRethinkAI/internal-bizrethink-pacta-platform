import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import { PDF } from '@libpdf/core';

/**
 * Put a named, sender-fillable widget wherever the rendered page marked one.
 *
 * WHY A MARKER AND NOT A COORDINATE. The renderer is react-pdf: it lays a
 * document out rather than placing boxes, and never reports where anything
 * landed. So a page carries a visible `«name»` where a value belongs, and this
 * step finds it and puts a widget over it.
 *
 * That is what `lombard-contracts/pipeline/inject_acroform_widgets.py` does,
 * and it is proven on the templates in production. What changes is the
 * machinery: that script shells out to Poppler's `pdftotext -bbox-layout` and
 * needs pikepdf. Here `@libpdf/core` already returns text bounding boxes —
 * Documenso's own placeholder extractor uses the same call — so the whole thing
 * is two libraries this repository already has and no external binary.
 *
 * WHAT THIS MUST NEVER TOUCH: a `{{SIGNATURE, rN}}` or `{{DATE, rN}}`
 * placeholder. **A widget can only be written by the sender**, so a signature
 * built as one ships permanently blank; those tokens stay in the page for
 * Documenso to extract at upload, which is what turns them into signer fields.
 * The marker syntax is deliberately nothing like theirs.
 */

/** `«widget_name»` — snake_case only, which is what the live templates use. */
export const MCA_WIDGET_MARKER = /«([a-z][a-z0-9_]*)»/;

const GLOBAL_MARKER = /«([a-z][a-z0-9_]*)»/g;

/**
 * The name a page prints to claim a widget.
 *
 * The source documents used `«0»`, `«23»` — an index into a sidecar that said
 * what each number meant. These are the names themselves, so there is no lookup
 * table in the middle that can drift from either end; the name in the page is
 * the name the funder's platform prefills by.
 */
export const markerFor = (name: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error(
      `Not an AcroForm widget name: ${JSON.stringify(name)}. Expected snake_case, as the live templates use.`,
    );
  }

  return `«${name}»`;
};

/**
 * A widget no wider than its marker cannot hold the value it stands for.
 *
 * The marker is short on purpose: its visible length would otherwise set the
 * box. The Python injector's own header records making that mistake with long
 * markers and undoing it, so the width is a policy here rather than a
 * consequence of how the name is spelled.
 */
const DEFAULT_WIDTH = 160;
const MIN_HEIGHT = 12;

export type McaWidgetOptions = {
  /**
   * Exactly the widget names this page must carry. Both directions are
   * checked: a marker not listed here, and a name listed here with no marker.
   */
  expect: readonly string[];
  /** Widget width in points, by name. Defaults to 160. */
  widthFor?: (name: string) => number;
};

type MarkerHit = {
  name: string;
  pageIndex: number;
  bbox: { x: number; y: number; width: number; height: number };
};

/** Every `«name»` in the page, in reading order, with where it sits. */
const findMarkers = async (pdf: Buffer): Promise<MarkerHit[]> => {
  const doc = await PDF.load(new Uint8Array(pdf));
  const hits: MarkerHit[] = [];

  for (const page of doc.getPages()) {
    for (const match of page.findText(GLOBAL_MARKER)) {
      const name = match.text.slice(1, -1);

      hits.push({ name, pageIndex: page.index, bbox: match.bbox });
    }
  }

  return hits;
};

/**
 * PUBLICATION FAILS CLOSED.
 *
 * The failure being guarded against is silent by its nature: a template
 * published with a missing or misspelled widget looks finished, and goes wrong
 * later, in a document a merchant is signing, where nothing on the sending side
 * reports it. So every problem is collected and reported at once — a fix should
 * be one pass, not a sequence of single refusals.
 */
const refuseMismatch = (found: readonly string[], expected: readonly string[]): void => {
  const seen = new Set(found);
  const wanted = new Set(expected);
  const unexpected = [...seen].filter((name) => !wanted.has(name)).sort();
  const missing = [...wanted].filter((name) => !seen.has(name)).sort();

  if (unexpected.length === 0 && missing.length === 0) {
    return;
  }

  throw new Error(
    [
      'This page does not carry the widgets its template contract names.',
      missing.length ? `Expected but never marked in the page: ${missing.join(', ')}.` : '',
      unexpected.length ? `Marked in the page but not expected: ${unexpected.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
};

export const injectMcaWidgets = async (pdf: Buffer, options: McaWidgetOptions): Promise<Buffer> => {
  const hits = await findMarkers(pdf);

  refuseMismatch(
    hits.map((hit) => hit.name),
    options.expect,
  );

  const doc = await PDFDocument.load(pdf);
  const form = doc.getForm();
  const pages = doc.getPages();
  const fields = new Map<string, ReturnType<typeof form.createTextField>>();

  for (const hit of hits) {
    // ONE FIELD PER NAME, ONE WIDGET PER OCCURRENCE. A fact said twice in a
    // document is still one fact, and the platform sends one `formValues`
    // entry for it. A second field named `merchant_legal_name_2` would want a
    // value nobody sends, and would ship blank.
    let field = fields.get(hit.name);

    if (!field) {
      field = form.createTextField(hit.name);
      fields.set(hit.name, field);
    }

    field.addToPage(pages[hit.pageIndex], {
      x: hit.bbox.x,
      y: hit.bbox.y,
      width: options.widthFor?.(hit.name) ?? DEFAULT_WIDTH,
      height: Math.max(hit.bbox.height, MIN_HEIGHT),
      // The marker text stays in the content stream underneath; the opaque
      // background is what hides it, exactly as the production pipeline does
      // it. No border: these sit inside body text, not in a form grid.
      backgroundColor: rgb(1, 1, 1),
      borderWidth: 0,
    });
  }

  return Buffer.from(await doc.save());
};
