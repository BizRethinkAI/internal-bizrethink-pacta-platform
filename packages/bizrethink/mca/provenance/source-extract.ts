/**
 * The words on a published page, without the markup around them.
 *
 * The monthly check compares a publisher's page today against the same page
 * when a person last confirmed it. Its first version hashed the raw HTML, and
 * `norm` — which collapses whitespace and folds quotes and dashes — does not
 * strip tags. So the fingerprint covered script bodies, inline styles, nav
 * markup, every attribute and any build stamp in the template. A publisher
 * swapping an analytics snippet was indistinguishable from a legislature
 * amending the statute: both read `differs`, both said "go and read this", and
 * a check that cries wolf every month stops being read.
 *
 * The method is deliberately the one the 2026-09-12 source audit recorded, so
 * re-extracting an audited URL today can be compared against the extraction
 * committed then — which is how we find out whether this pipeline agrees with
 * the one that produced the evidence, BEFORE trusting it to set a baseline:
 *
 *     "Python HTMLParser; scripts/styles/noscript excluded; block line breaks;
 *      HTML entities decoded"
 *
 * THIS REMOVES MARKUP NOISE, NOT CHROME NOISE. A cookie banner or a nav label
 * is text the publisher renders, so it survives extraction and lands in the
 * digest. Narrowing to the part of the page that is the statute needs a
 * per-source anchor, which `sectionOf` in `source-text.ts` already models with
 * literal from/to strings. That is not done here: whether it is needed is a
 * question for the first real runs, and a per-source anchor that silently stops
 * matching is its own failure. Until then a flagged source is adjudicated by a
 * person, which is what the check is for.
 *
 * Written by hand rather than taken from a dependency. The job runs in CI on a
 * schedule against a handful of government pages, the rules below are the whole
 * of what it needs, and a parser dependency in the compliance path is a supply
 * chain we would have to audit for no gain.
 */

/** Bodies that are never the statute — dropped whole, tag to closing tag. */
const DROPPED = ['script', 'style', 'noscript', 'template', 'svg'];

/**
 * Elements after which text must not run on.
 *
 * Without this `<td>398.051</td><td>Disclosure</td>` reads as
 * "398.051Disclosure" — a word present in neither cell, which would put the
 * markup back into the text it was just taken out of.
 */
const BLOCKS = [
  'p',
  'div',
  'br',
  'tr',
  'td',
  'th',
  'li',
  'ul',
  'ol',
  'table',
  'thead',
  'tbody',
  'section',
  'article',
  'header',
  'footer',
  'nav',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'hr',
  'title',
  'head',
  'body',
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  sect: '§',
  para: '¶',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  deg: '°',
  cent: '¢',
  pound: '£',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  frac12: '½',
  frac14: '¼',
  bull: '•',
  middot: '·',
};

/**
 * Decode the entities a publisher's template uses.
 *
 * An undecodable entity is left as written rather than dropped: `&foo;` is more
 * likely a literal ampersand in the statute's own text than an entity we failed
 * to recognise, and silently deleting characters from a legal source is the one
 * outcome this whole file exists to avoid.
 */
const decodeEntities = (text: string): string =>
  text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));

      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }

    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });

const DROPPED_SET = new Set(DROPPED);
const BLOCKS_SET = new Set(BLOCKS);

/**
 * Where the tag starting at `from` ends, honouring quoted attribute values.
 *
 * `<a title="a > b">` is one tag, not a tag ending at the `>` inside the
 * quotes. Returns the index just past the closing `>`, or the end of the input
 * for a tag nobody closed.
 */
const endOfTag = (html: string, from: number): number => {
  let quote: string | null = null;

  for (let i = from + 1; i < html.length; i += 1) {
    const ch = html[i];

    if (quote !== null) {
      if (ch === quote) {
        quote = null;
      }

      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i + 1;
    }
  }

  return html.length;
};

const tagNameAt = (html: string, from: number): { name: string; closing: boolean } => {
  let i = from + 1;
  const closing = html[i] === '/';

  if (closing) {
    i += 1;
  }

  const start = i;

  while (i < html.length && /[a-z0-9]/i.test(html[i])) {
    i += 1;
  }

  return { name: html.slice(start, i).toLowerCase(), closing };
};

/**
 * ONE LINEAR PASS, not a sequence of regex replacements.
 *
 * The first version stripped markup with `.replace()` per construct, and CodeQL
 * was right to call it `js/incomplete-multi-character-sanitization`: a single
 * pass over `<scr<script>ipt>` removes the inner tag and leaves a live one
 * behind. Nothing here is rendered as HTML — the result is hashed and compared,
 * and `source-check.test.ts` asserts the fetched text never reaches the report —
 * so it was not exploitable. But a function shaped like a sanitizer that is not
 * one is a trap for whoever reaches for it next, and the scan below removes the
 * whole class rather than the two alerts.
 *
 * It also cannot backtrack, so there is no ReDoS surface in a job that fetches
 * pages we do not control.
 */
export const textFromHtml = (html: string): string => {
  const out: string[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] !== '<') {
      out.push(html[i]);
      i += 1;

      continue;
    }

    // Comments: publishers keep build stamps and edit dates in them, and a
    // comment can otherwise contain anything, including markup.
    if (html.startsWith('<!--', i)) {
      const close = html.indexOf('-->', i + 4);

      i = close === -1 ? html.length : close + 3;

      continue;
    }

    // Doctype and processing instructions carry no words.
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      i = endOfTag(html, i);

      continue;
    }

    const { name, closing } = tagNameAt(html, i);

    // A bare `<` that begins no tag is text — a statute writing "less than".
    if (name === '') {
      out.push('<');
      i += 1;

      continue;
    }

    const afterTag = endOfTag(html, i);

    if (DROPPED_SET.has(name)) {
      if (closing) {
        i = afterTag;

        continue;
      }

      /*
        Skip the whole body. Searched for case-insensitively from the end of the
        opening tag, and an unclosed one swallows the rest of the document
        rather than letting its contents through as text — which is what a
        browser would do with it too.
      */
      const close = html.toLowerCase().indexOf(`</${name}`, afterTag);

      i = close === -1 ? html.length : endOfTag(html, close);

      continue;
    }

    // A block boundary has to survive as one, or two cells fuse into a word
    // that is in neither of them. Everything else is inline and separates
    // nothing.
    out.push(BLOCKS_SET.has(name) ? '\n' : '');
    i = afterTag;
  }

  return (
    decodeEntities(out.join(''))
      .split('\n')
      /*
      Horizontal whitespace only. A tab, a non-breaking space and a run of
      indentation are all layout; a line break is the block structure just
      recovered and has to survive to the join below.
    */
      .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
      .filter((line) => line !== '')
      .join('\n')
  );
};
