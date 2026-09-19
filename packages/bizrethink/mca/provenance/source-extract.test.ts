import { describe, expect, it } from 'vitest';

import { textFromHtml } from './source-extract';
import { normalisedDigest } from './source-text';

/**
 * Getting the WORDS out of a published page before anything is digested.
 *
 * The first version of the monthly check hashed the raw HTML. `norm` collapses
 * whitespace and folds quotes and dashes; it does not strip tags. So the
 * fingerprint covered `<script>` blocks, inline styles, nav markup, every
 * attribute and any copyright year in the template — and a publisher swapping
 * an analytics snippet was indistinguishable from a legislature amending the
 * statute. Both read `differs`, both said "go and read this", and a check that
 * cries wolf every month is one nobody reads.
 *
 * The method is the one the 2026-09-12 source audit recorded and used, so that
 * re-extracting an audited URL today can be compared against the extraction
 * committed then: "Python HTMLParser; scripts/styles/noscript excluded; block
 * line breaks; HTML entities decoded".
 *
 * IT REMOVES MARKUP NOISE, NOT CHROME NOISE. Text a publisher renders on the
 * page — a cookie banner, a nav label — is still text, and still lands in the
 * digest. That is a known limit, not an oversight; see the in-flight note.
 */

describe('textFromHtml', () => {
  it('keeps the words and drops the tags', () => {
    expect(textFromHtml('<p>The provider <b>shall</b> disclose.</p>')).toBe('The provider shall disclose.');
  });

  /*
    THE CASE THE WHOLE FUNCTION EXISTS FOR. A script body is code, it changes
    whenever a publisher touches its site, and it is never the statute.
  */
  it('drops script, style and noscript bodies entirely', () => {
    const page = [
      '<html><head><style>.a{color:red}</style>',
      '<script>analytics("2026-09-18");</script></head>',
      '<body><noscript>Enable JavaScript.</noscript>',
      '<p>Section 398.051.</p></body></html>',
    ].join('');

    expect(textFromHtml(page)).toBe('Section 398.051.');
  });

  it('is unmoved by an attribute change that leaves the words alone', () => {
    const before = '<div class="statute" data-build="1841"><p>Text.</p></div>';
    const after = '<div class="statute latest" data-build="1902" id="x"><p>Text.</p></div>';

    expect(textFromHtml(before)).toBe(textFromHtml(after));
  });

  /*
    An amendment must still move the digest. Extraction that quietly lost words
    would be worse than hashing the markup: it would report `unchanged` for a
    statute that had changed.
  */
  it('still moves when a word changes', () => {
    const before = textFromHtml('<p>The provider shall disclose the amount.</p>');
    const after = textFromHtml('<p>The provider shall not disclose the amount.</p>');

    expect(normalisedDigest(before)).not.toBe(normalisedDigest(after));
  });

  it('moves when a figure changes', () => {
    const before = textFromHtml('<td>$500,000</td>');
    const after = textFromHtml('<td>$1,000,000</td>');

    expect(normalisedDigest(before)).not.toBe(normalisedDigest(after));
  });

  it('decodes entities, so the words read as the publisher renders them', () => {
    expect(textFromHtml('<p>fees &amp; charges &#8212; see &sect;398.051&nbsp;(a)</p>')).toBe(
      'fees & charges — see §398.051 (a)',
    );
  });

  /*
    Block elements have to break, or two cells run together into a word that is
    in neither of them. `<td>398.051</td><td>Disclosure</td>` reading as
    "398.051Disclosure" would make a table's text depend on its markup again.
  */
  it('breaks blocks so adjacent cells do not fuse', () => {
    expect(textFromHtml('<tr><td>398.051</td><td>Disclosure</td></tr>')).toBe('398.051\nDisclosure');
  });

  it('does not break inline elements mid-sentence', () => {
    expect(textFromHtml('<p>The <em>annual percentage rate</em> must appear.</p>')).toBe(
      'The annual percentage rate must appear.',
    );
  });

  it('treats a line break element as a break', () => {
    expect(textFromHtml('<p>Line one.<br>Line two.</p>')).toBe('Line one.\nLine two.');
  });

  it('drops comments, which is where publishers keep build stamps', () => {
    expect(textFromHtml('<p>Text.</p><!-- built 2026-09-18T04:12:00Z -->')).toBe('Text.');
  });

  /*
    The Texas bill text arrives as a table of Courier-styled cells with an
    inline stylesheet at the top — the shape actually stored in
    `TX-Fin-Code-Ch-398.txt`.
  */
  it('handles the shape the Texas bill text actually arrives in', () => {
    const page = [
      '<html><head><title>89(R) HB 700</title>',
      '<style>td { font-family: Courier; font-size: 10pt; }</style></head>',
      '<body><table><tr><td>H.B. No. 700</td></tr>',
      '<tr><td>AN ACT</td></tr></table></body></html>',
    ].join('');

    expect(textFromHtml(page)).toBe('89(R) HB 700\nH.B. No. 700\nAN ACT');
  });

  it('collapses runs of blank lines a template leaves behind', () => {
    expect(textFromHtml('<div><p>One.</p><div></div><div></div><p>Two.</p></div>')).toBe('One.\nTwo.');
  });

  it('returns nothing for a page with no text', () => {
    expect(textFromHtml('<html><head><script>x()</script></head><body></body></html>')).toBe('');
  });
});

/**
 * The class CodeQL named: `js/incomplete-multi-character-sanitization`.
 *
 * The first version stripped markup with a sequence of `.replace()` calls, and
 * one pass over `<scr<script>ipt>` removes the inner tag and leaves a live one
 * behind. Nothing here is rendered as HTML — the result is hashed and compared,
 * and the report never carries fetched text — so it was not exploitable. It was
 * still a function shaped like a sanitizer that was not one, which is a trap
 * for whoever reaches for it next.
 *
 * These pin the scan, not the two alerts.
 */
describe('markup cannot survive the scan', () => {
  it('leaves no tag behind when tags are nested inside a tag name', () => {
    expect(textFromHtml('<scr<script>ipt>alert(1)</script>Statute.')).not.toContain('<');
  });

  it('leaves no comment opener behind when comments are nested', () => {
    expect(textFromHtml('<!--<!-- build -->Statute.')).not.toContain('<!');
  });

  it('drops the body of a script nobody closed rather than reading it as text', () => {
    // A browser does the same. Letting it through would put code in the digest.
    expect(textFromHtml('<p>Statute.</p><script>var a = "<p>not text</p>";')).toBe('Statute.');
  });

  it('is not confused by a greater-than inside an attribute value', () => {
    expect(textFromHtml('<p title="a > b">Statute.</p>')).toBe('Statute.');
  });

  /*
    A statute may write a bare `<` and mean it. Treating it as the start of a
    tag would silently eat the words after it, which is the one outcome that
    matters more than tidiness.
  */
  it('keeps a bare less-than that begins no tag', () => {
    expect(textFromHtml('<p>amounts &lt; $500 and a < b</p>')).toBe('amounts < $500 and a < b');
  });

  it('drops an svg without dropping what follows it', () => {
    expect(textFromHtml('<p>Before.</p><svg><path d="M0 0"/></svg><p>After.</p>')).toBe('Before.\nAfter.');
  });
});
