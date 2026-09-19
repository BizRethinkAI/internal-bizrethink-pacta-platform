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

const escapeForClass = (names: string[]) => names.join('|');

export const textFromHtml = (html: string): string => {
  let text = html;

  // Comments first: publishers keep build stamps and edit dates in them, and a
  // comment can otherwise contain anything, including markup.
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Doctype and processing instructions carry no words.
  text = text.replace(/<![^>]*>/g, '');

  // Whole bodies that are never the statute.
  for (const tag of DROPPED) {
    text = text.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), ' ');
    // A self-closed or unclosed one still has to lose its tag.
    text = text.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), ' ');
  }

  // Block boundaries become line breaks BEFORE the remaining tags are removed,
  // so that what was a block boundary is still visible as one.
  text = text.replace(new RegExp(`<\\/?(?:${escapeForClass(BLOCKS)})\\b[^>]*>`, 'gi'), '\n');

  // Everything left is inline — it separates nothing, so it leaves no space.
  text = text.replace(/<[^>]*>/g, '');

  text = decodeEntities(text);

  return (
    text
      .split('\n')
      /*
      Horizontal whitespace only. A tab, a non-breaking space and a run of
      indentation are all layout; a line break is the block structure that was
      just recovered and has to survive to the join below.
    */
      .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
      .filter((line) => line !== '')
      .join('\n')
  );
};
