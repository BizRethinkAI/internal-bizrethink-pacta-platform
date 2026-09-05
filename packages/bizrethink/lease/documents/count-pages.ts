/**
 * How many pages an uploaded document has, and how to say so.
 *
 * WHY THE COUNT IS READ OFF THE FILE AND NEVER ASKED FOR. It is printed on the
 * receipt addendum, where its whole job is to let a signer confirm that the
 * document they opened is the one the page names. A hand-typed figure would be
 * the landlord's claim about the file rather than a fact of it, which is
 * exactly the wrong way round for a receipt.
 *
 * THE CONTRACT IS: AN EXACT COUNT, OR NULL. Never an estimate. A wrong extent
 * on a signed acknowledgement is worse than no extent, because it invites a
 * signer to believe they were given a different document. Null means "not
 * established" and the receipt omits it.
 */

/**
 * The cheap scan: count page objects in the raw bytes.
 *
 * Exact and fast where it works — one pass over the 54 MB, 418-page move-in
 * inspection, correct to the page. It cannot work everywhere: a linearised or
 * "optimized" PDF moves its page objects into COMPRESSED OBJECT STREAMS, and
 * nothing matching `/Type /Page` survives in the plain bytes. The Estancia
 * master declaration is one of those — 155 pages, none of them visible here.
 *
 * So this returns null rather than zero on those files, and the caller falls
 * back to a real parser. Kept as the fast path because parsing a large scan
 * costs real time and memory on every upload, and most files never need it.
 */
export const countPagesFromBytes = (bytes: Uint8Array): number | null => {
  /*
    latin1 maps every byte to exactly one code unit, so byte offsets are
    preserved and no multi-byte sequence can fabricate or hide a match. utf8
    would replace invalid sequences — and a PDF's compressed streams are full
    of them.
  */
  const text = Buffer.from(bytes).toString('latin1');

  /*
    `/Type /Page` followed by a non-`s` character. `/Type /Pages` is the page
    TREE — one node per document — and counting it as a page is how a 155-page
    file comes to report 156.
  */
  const matches = text.match(/\/Type\s*\/Page[^s]/g);

  return matches && matches.length > 0 ? matches.length : null;
};

/**
 * The extent, as it reads to a person.
 *
 * Here rather than written out at each call site because it was written twice
 * and the two disagreed: the receipt addendum said "1 page" and the document
 * editor said "1 pages" for the same one-page file.
 */
export const pageLabel = (pageCount: number | null): string => {
  if (pageCount === null) {
    return 'Extent unknown';
  }

  return `${pageCount} page${pageCount === 1 ? '' : 's'}`;
};
